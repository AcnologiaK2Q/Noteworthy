import type { SupabaseClient } from "@supabase/supabase-js";

import { getEmbeddingProvider } from "@/lib/ai";
import { toVectorLiteral } from "@/lib/ai/embeddings";
import { logEvent, startTimer } from "@/lib/observability";
import type { Database } from "@/lib/types/database.types";

import { chunkPages } from "./chunkText";
import { extractPdfPages } from "./extractText";

const EMBED_BATCH_SIZE = 20;

interface IngestArgs {
  supabase: SupabaseClient<Database>;
  userId: string;
  documentId: string;
  storagePath: string;
}

export interface IngestResult {
  pageCount: number;
  chunkCount: number;
  durationMs: number;
}

/**
 * Storage object -> extracted pages -> chunks -> embeddings -> pgvector rows.
 * Marks the document `ready` or `failed` so the UI always reflects reality.
 */
export async function ingestDocument({
  supabase,
  userId,
  documentId,
  storagePath,
}: IngestArgs): Promise<IngestResult> {
  const elapsed = startTimer();

  try {
    const { data: file, error: downloadError } = await supabase.storage
      .from("documents")
      .download(storagePath);

    if (downloadError || !file) {
      throw new Error(downloadError?.message ?? "Could not download the uploaded file.");
    }

    const { pages, pageCount } = await extractPdfPages(await file.arrayBuffer());

    if (pages.length === 0) {
      throw new Error("No selectable text found. Scanned PDFs need OCR before upload.");
    }

    const chunks = chunkPages(pages);
    if (chunks.length === 0) {
      throw new Error("The document had text but produced no usable chunks.");
    }

    const embedder = getEmbeddingProvider();

    for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
      const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
      const vectors = await embedder.embed(batch.map((chunk) => chunk.content));

      const { error: insertError } = await supabase.from("document_chunks").insert(
        batch.map((chunk, index) => ({
          document_id: documentId,
          user_id: userId,
          chunk_index: chunk.chunkIndex,
          page_number: chunk.pageNumber,
          content: chunk.content,
          token_count: chunk.tokenCount,
          embedding: toVectorLiteral(vectors[index]),
        })),
      );

      if (insertError) throw new Error(insertError.message);
    }

    await supabase
      .from("documents")
      .update({ status: "ready", page_count: pageCount, error_message: null })
      .eq("id", documentId);

    const durationMs = elapsed();

    await logEvent({
      supabase,
      userId,
      type: "pdf_processed",
      durationMs,
      metadata: { documentId, pageCount, chunkCount: chunks.length },
    });

    return { pageCount, chunkCount: chunks.length, durationMs };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed.";

    await supabase
      .from("documents")
      .update({ status: "failed", error_message: message })
      .eq("id", documentId);

    await logEvent({
      supabase,
      userId,
      type: "pdf_failed",
      durationMs: elapsed(),
      metadata: { documentId, message },
    });

    throw error;
  }
}
