import type { LanguageModel } from "ai";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * The only surface the rest of the app is allowed to know about. Swapping
 * providers means adding a sibling of `groq.ts` and changing the factory in
 * `index.ts`, with no route or feature code changes.
 */
export interface LLMProvider {
  readonly id: string;
  readonly modelId: string;
  /** Model handle passed to the AI SDK's streamText/generateObject. */
  model(): LanguageModel;
}

export interface EmbeddingProvider {
  readonly id: string;
  readonly dimension: number;
  embed(texts: string[]): Promise<number[][]>;
}
