import { generateText } from "ai";
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

const JSON_INSTRUCTION = `Respond with JSON only, no prose and no markdown fences, in exactly this shape:
{"cards":[{"question":"...","answer":"..."}]}`;

/**
 * Asks for JSON directly rather than using the AI SDK's structured-output mode,
 * because `json_schema` support varies by model on Groq. Parsing and validating
 * here keeps flashcards working across any provider the adapter is pointed at.
 */
export async function generateFlashcards(
  sourceTitle: string,
  sourceContent: string,
  cardCount: number,
): Promise<GeneratedCard[]> {
  const material = sourceContent.slice(0, MAX_SOURCE_CHARS);
  const system = `${buildFlashcardPrompt(sourceTitle, cardCount)}\n\n${JSON_INSTRUCTION}`;

  let lastError = "";

  // One retry: a malformed first response is usually fixed by naming the fault.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { text } = await generateText({
      model: getLLMProvider().model(),
      system,
      prompt: attempt === 0 ? material : `${material}\n\nYour previous reply was invalid: ${lastError}`,
      temperature: 0.3,
    });

    try {
      const parsed = schema.parse(JSON.parse(extractJsonObject(text)));
      return parsed.cards.slice(0, cardCount);
    } catch (error) {
      lastError = error instanceof Error ? error.message : "unparseable output";
    }
  }

  throw new Error(`The model did not return usable flashcards. ${lastError}`);
}

/** Tolerates markdown fences or stray commentary around the JSON body. */
function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced?.[1] ?? text).trim();

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("no JSON object found in the response");
  }

  return candidate.slice(start, end + 1);
}
