import { generateObject } from "ai";
import { z } from "zod";

import { getLLMProvider } from "@/lib/ai";
import { buildFlashcardPrompt } from "@/lib/ai/prompts";

const schema = z.object({
  cards: z
    .array(
      z.object({
        question: z.string().min(3),
        answer: z.string().min(1),
      }),
    )
    .min(1),
});

export interface GeneratedCard {
  question: string;
  answer: string;
}

// Groq's context window is generous but not unlimited; long papers get trimmed.
const MAX_SOURCE_CHARS = 24_000;

export async function generateFlashcards(
  sourceTitle: string,
  sourceContent: string,
  cardCount: number,
): Promise<GeneratedCard[]> {
  const material = sourceContent.slice(0, MAX_SOURCE_CHARS);

  const { object } = await generateObject({
    model: getLLMProvider().model(),
    schema,
    system: buildFlashcardPrompt(sourceTitle, cardCount),
    prompt: material,
    temperature: 0.3,
  });

  return object.cards.slice(0, cardCount);
}
