"use server";

import { revalidatePath } from "next/cache";

import { logEvent, startTimer } from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";
import type { DeckSourceType } from "@/lib/types/database.types";

import { generateFlashcards } from "./generate";
import { scheduleNextReview, type ReviewGrade } from "./sm2";

const DEFAULT_CARD_COUNT = 10;
const MAX_DOC_CHUNKS = 40;

export async function generateDeck(
  sourceType: Extract<DeckSourceType, "note" | "document">,
  sourceId: string,
  cardCount: number = DEFAULT_CARD_COUNT,
): Promise<{ deckId?: string; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not signed in." };

  const elapsed = startTimer();

  try {
    const source = await loadSource(sourceType, sourceId);
    if (!source) return { error: "Source not found." };

    if (source.content.trim().length < 200) {
      return { error: "There isn't enough material here to make flashcards." };
    }

    const cards = await generateFlashcards(source.title, source.content, cardCount);

    const { data: deck, error: deckError } = await supabase
      .from("flashcard_decks")
      .insert({
        user_id: user.id,
        title: source.title,
        source_type: sourceType,
        source_id: sourceId,
      })
      .select("id")
      .single();

    if (deckError) return { error: deckError.message };

    const { error: cardsError } = await supabase.from("flashcards").insert(
      cards.map((card) => ({
        deck_id: deck.id,
        user_id: user.id,
        question: card.question,
        answer: card.answer,
      })),
    );

    if (cardsError) return { error: cardsError.message };

    await logEvent({
      supabase,
      userId: user.id,
      type: "flashcard_generated",
      durationMs: elapsed(),
      metadata: { deckId: deck.id, sourceType, cardCount: cards.length },
    });

    revalidatePath("/flashcards");
    revalidatePath("/dashboard");
    return { deckId: deck.id };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Generation failed." };
  }

  async function loadSource(type: typeof sourceType, id: string) {
    if (type === "note") {
      const { data } = await supabase
        .from("notes")
        .select("title, content_markdown")
        .eq("id", id)
        .maybeSingle();

      return data ? { title: data.title, content: data.content_markdown } : null;
    }

    const { data: doc } = await supabase
      .from("documents")
      .select("title")
      .eq("id", id)
      .maybeSingle();

    if (!doc) return null;

    const { data: chunks } = await supabase
      .from("document_chunks")
      .select("content")
      .eq("document_id", id)
      .order("chunk_index", { ascending: true })
      .limit(MAX_DOC_CHUNKS);

    return {
      title: doc.title,
      content: (chunks ?? []).map((c) => c.content).join("\n\n"),
    };
  }
}

export async function reviewCard(
  cardId: string,
  grade: ReviewGrade,
): Promise<{ error?: string }> {
  const supabase = createClient();

  const { data: card } = await supabase
    .from("flashcards")
    .select("ease_factor, interval_days, repetitions")
    .eq("id", cardId)
    .maybeSingle();

  if (!card) return { error: "Card not found." };

  const next = scheduleNextReview(
    {
      easeFactor: Number(card.ease_factor),
      intervalDays: card.interval_days,
      repetitions: card.repetitions,
    },
    grade,
  );

  const { error } = await supabase
    .from("flashcards")
    .update({
      ease_factor: next.easeFactor,
      interval_days: next.intervalDays,
      repetitions: next.repetitions,
      due_at: next.dueAt.toISOString(),
      last_reviewed_at: new Date().toISOString(),
    })
    .eq("id", cardId);

  if (error) return { error: error.message };

  revalidatePath("/flashcards");
  revalidatePath("/dashboard");
  return {};
}

export async function deleteDeck(deckId: string): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.from("flashcard_decks").delete().eq("id", deckId);

  if (error) return { error: error.message };

  revalidatePath("/flashcards");
  revalidatePath("/dashboard");
  return {};
}
