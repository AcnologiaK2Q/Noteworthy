// Supabase Edge Function: embeds text with the runtime's built-in gte-small
// model (384 dimensions). Deploy with:
//   supabase functions deploy embed
//
// Deno globals are provided by the Edge Runtime, not by the Next.js tsconfig,
// so this file is excluded from the app's type-check.

// @ts-nocheck
const session = new Supabase.ai.Session("gte-small");

const MAX_TEXTS = 64;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Use POST." }, { status: 405 });
  }

  let payload: { texts?: unknown };
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const { texts } = payload;

  if (!Array.isArray(texts) || texts.some((t) => typeof t !== "string")) {
    return Response.json({ error: "`texts` must be an array of strings." }, { status: 400 });
  }

  if (texts.length === 0) {
    return Response.json({ embeddings: [] });
  }

  if (texts.length > MAX_TEXTS) {
    return Response.json(
      { error: `Batch too large: ${texts.length} > ${MAX_TEXTS}.` },
      { status: 400 },
    );
  }

  try {
    // Sequential on purpose: running the whole batch concurrently spikes memory
    // past the Edge Function resource limit on larger batches.
    const embeddings: number[][] = [];
    for (const text of texts) {
      embeddings.push(await session.run(text, { mean_pool: true, normalize: true }));
    }
    return Response.json({ embeddings });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Embedding failed." },
      { status: 500 },
    );
  }
});
