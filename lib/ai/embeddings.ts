import type { EmbeddingProvider } from "./provider";

const DIMENSION = 384;

/**
 * gte-small runs inside a Supabase Edge Function, so embeddings cost nothing
 * extra and need no second vendor API key.
 */
export function createEmbeddingProvider(): EmbeddingProvider {
  const url = process.env.SUPABASE_EDGE_EMBED_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("SUPABASE_EDGE_EMBED_URL is not set. Add it to .env.local.");
  if (!anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");

  return {
    id: "supabase-gte-small",
    dimension: DIMENSION,
    async embed(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return [];

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ texts }),
      });

      if (!response.ok) {
        throw new Error(`Embedding request failed (${response.status}): ${await response.text()}`);
      }

      const { embeddings } = (await response.json()) as { embeddings: number[][] };

      if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
        throw new Error("Embedding response shape did not match the request.");
      }

      return embeddings;
    },
  };
}

/** pgvector accepts its literal form over PostgREST, not a JS array. */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
