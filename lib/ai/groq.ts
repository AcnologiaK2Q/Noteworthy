import { createGroq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";

import type { LLMProvider } from "./provider";

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export function createGroqProvider(): LLMProvider {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set. Add it to .env.local.");
  }

  const groq = createGroq({ apiKey });
  const modelId = process.env.GROQ_MODEL ?? DEFAULT_MODEL;

  return {
    id: "groq",
    modelId,
    model(): LanguageModel {
      return groq(modelId);
    },
  };
}
