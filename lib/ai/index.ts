import { createEmbeddingProvider } from "./embeddings";
import { createGroqProvider } from "./groq";
import type { EmbeddingProvider, LLMProvider } from "./provider";

let llm: LLMProvider | null = null;
let embeddings: EmbeddingProvider | null = null;

export function getLLMProvider(): LLMProvider {
  llm ??= createGroqProvider();
  return llm;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  embeddings ??= createEmbeddingProvider();
  return embeddings;
}

export type { ChatMessage, LLMProvider, EmbeddingProvider } from "./provider";
