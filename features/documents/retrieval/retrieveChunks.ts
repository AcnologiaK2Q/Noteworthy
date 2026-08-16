import type { SupabaseClient } from "@supabase/supabase-js";

import { getEmbeddingProvider } from "@/lib/ai";
import { toVectorLiteral } from "@/lib/ai/embeddings";
import type { RetrievedChunk } from "@/lib/ai/prompts";
import { logEvent, startTimer } from "@/lib/observability";
import type { Database } from "@/lib/types/database.types";

/**
 * A retrieval counts as "grounded" when its best match clears this cosine
 * similarity. It is the real basis for the dashboard's success-rate stat.
 */
export const GROUNDING_THRESHOLD = 0.5;

interface RetrieveArgs {
  supabase: SupabaseClient<Database>;
  userId: string;
  question: string;
  documentId?: string;
  matchCount?: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  grounded: boolean;
  topSimilarity: number | null;
}

export async function retrieveChunks({
  supabase,
  userId,
  question,
  documentId,
  matchCount = 6,
}: RetrieveArgs): Promise<RetrievalResult> {
  const elapsed = startTimer();

  const [embedding] = await getEmbeddingProvider().embed([question]);
  const queryEmbedding = toVectorLiteral(embedding);

  let chunks: RetrievedChunk[];

  if (documentId) {
    const { data, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: queryEmbedding,
      match_document_id: documentId,
      match_count: matchCount,
    });
    if (error) throw new Error(error.message);

    chunks = (data ?? []).map((row) => ({
      id: row.id,
      documentId,
      pageNumber: row.page_number,
      content: row.content,
      similarity: row.similarity,
    }));
  } else {
    const { data, error } = await supabase.rpc("match_library_chunks", {
      query_embedding: queryEmbedding,
      match_count: matchCount,
    });
    if (error) throw new Error(error.message);

    chunks = (data ?? []).map((row) => ({
      id: row.id,
      documentId: row.document_id,
      documentTitle: row.document_title,
      pageNumber: row.page_number,
      content: row.content,
      similarity: row.similarity,
    }));
  }

  const topSimilarity = chunks.length > 0 ? chunks[0].similarity : null;
  const grounded = topSimilarity !== null && topSimilarity >= GROUNDING_THRESHOLD;

  await logEvent({
    supabase,
    userId,
    type: "retrieval",
    durationMs: elapsed(),
    metadata: {
      documentId: documentId ?? null,
      matchCount: chunks.length,
      topSimilarity,
      grounded,
    },
  });

  return { chunks, grounded, topSimilarity };
}
