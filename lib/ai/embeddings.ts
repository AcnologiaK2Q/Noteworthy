import type { EmbeddingProvider } from "./provider";

const DIMENSION = 384;

/**
 * gte-small runs inside a Supabase Edge Function, so embeddings cost nothing
 * extra and need no second vendor API key.
 */
export function createEmbeddingProvider(): EmbeddingProvider {
  const url = process.env.SUPABASE_EDGE_EMBED_URL;
  // Embedding only ever runs server-side, so the function can stay behind JWT
  // verification rather than being exposed to the browser.
  const authKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("SUPABASE_EDGE_EMBED_URL is not set. Add it to .env.local.");
  if (!authKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");

  // The Edge Function runs out of memory somewhere above ten passages, and the
  // exact ceiling moves with passage length, so on a resource-limit response
  // the batch is split and retried rather than failing the whole ingestion.
  async function embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch(url!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authKey}`,
      },
      body: JSON.stringify({ texts }),
    });

    if (!response.ok) {
      const body = await response.text();
      const outOfResources = response.status === 546 || body.includes("WORKER_RESOURCE_LIMIT");

      if (outOfResources && texts.length > 1) {
        const mid = Math.ceil(texts.length / 2);
        const left = await embedBatch(texts.slice(0, mid));
        const right = await embedBatch(texts.slice(mid));
        return [...left, ...right];
      }

      throw new Error(`Embedding request failed (${response.status}): ${body}`);
    }

    const { embeddings } = (await response.json()) as { embeddings: number[][] };

    if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
      throw new Error("Embedding response shape did not match the request.");
    }

    return embeddings;
  }

  return {
    id: "supabase-gte-small",
    dimension: DIMENSION,
    async embed(texts: string[]): Promise<number[][]> {
      if (texts.length === 0) return [];
      return embedBatch(texts);
    },
  };
}

/** pgvector accepts its literal form over PostgREST, not a JS array. */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
