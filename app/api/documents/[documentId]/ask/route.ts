import { NextResponse, type NextRequest } from "next/server";
import { generateText } from "ai";

import { retrieveChunks } from "@/features/documents/retrieval/retrieveChunks";
import { getLLMProvider } from "@/lib/ai";
import { buildRagSystemPrompt } from "@/lib/ai/prompts";
import { logEvent, startTimer } from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";
import type { Citation } from "@/lib/types/database.types";

export const maxDuration = 60;

const SNIPPET_LENGTH = 240;

export async function POST(
  request: NextRequest,
  { params }: { params: { documentId: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { question, conversationId } = (await request.json()) as {
    question?: string;
    conversationId?: string;
  };

  if (!question?.trim()) {
    return NextResponse.json({ error: "A question is required." }, { status: 400 });
  }

  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, status")
    .eq("id", params.documentId)
    .maybeSingle();

  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  if (doc.status !== "ready") {
    return NextResponse.json({ error: "This paper is still processing." }, { status: 409 });
  }

  const elapsed = startTimer();

  try {
    const { chunks, grounded } = await retrieveChunks({
      supabase,
      userId: user.id,
      question,
      documentId: doc.id,
    });

    if (chunks.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find anything in this paper related to that question.",
        citations: [],
        grounded: false,
      });
    }

    const { text } = await generateText({
      model: getLLMProvider().model(),
      system: buildRagSystemPrompt(chunks, doc.title),
      prompt: question,
      temperature: 0.2,
    });

    // Only surface excerpts the model actually cited, so a source chip always
    // corresponds to evidence behind a claim.
    const cited = new Set(
      Array.from(text.matchAll(/\[(\d+)\]/g)).map((m) => Number(m[1])),
    );

    const citations: Citation[] = chunks
      .map((chunk, index) => ({ chunk, marker: index + 1 }))
      .filter(({ marker }) => cited.has(marker))
      .map(({ chunk }) => ({
        page: chunk.pageNumber,
        chunkId: chunk.id,
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        snippet: chunk.content.slice(0, SNIPPET_LENGTH),
      }));

    const durationMs = elapsed();

    if (conversationId) {
      await supabase.from("chat_messages").insert([
        { conversation_id: conversationId, user_id: user.id, role: "user", content: question },
        {
          conversation_id: conversationId,
          user_id: user.id,
          role: "assistant",
          content: text,
          citations,
        },
      ]);
    }

    await logEvent({
      supabase,
      userId: user.id,
      type: "chat_message",
      durationMs,
      metadata: { documentId: doc.id, grounded, citationCount: citations.length },
    });

    return NextResponse.json({ answer: text, citations, grounded });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong." },
      { status: 500 },
    );
  }
}
