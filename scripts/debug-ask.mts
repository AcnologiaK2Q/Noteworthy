/**
 * Reproduces the document Q&A path as a signed-in user who does NOT own the
 * document, which is the case for anyone opening the public demo paper.
 *
 *   npx tsx --env-file=.env.local scripts/debug-ask.mts <documentId>
 */

import { createClient } from "@supabase/supabase-js";
import { generateText } from "ai";

import { getLLMProvider } from "../lib/ai";
import { buildRagSystemPrompt } from "../lib/ai/prompts";
import { retrieveChunks } from "../features/documents/retrieval/retrieveChunks";
import type { Database } from "../lib/types/database.types";

const documentId = process.argv[2];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(url, anonKey, { auth: { persistSession: false } });

const { data: session, error: signInErr } = await supabase.auth.signInWithPassword({
  email: "login-check@noteworthy.test",
  password: "TempCheck!2026xyz",
});
console.log(signInErr ? `sign-in FAILED: ${signInErr.message}` : `signed in as ${session.user?.id}`);

const { data: doc, error: docErr } = await supabase
  .from("documents")
  .select("id, title, status, user_id, is_demo")
  .eq("id", documentId)
  .maybeSingle();
console.log("document:", docErr ? docErr.message : JSON.stringify(doc));

try {
  const retrieval = await retrieveChunks({
    supabase,
    userId: session.user!.id,
    question: "What methodology did the researchers use?",
    documentId,
  });
  console.log(`retrieval: ${retrieval.chunks.length} chunks, top ${retrieval.topSimilarity}`);

  const { text } = await generateText({
    model: getLLMProvider().model(),
    system: buildRagSystemPrompt(retrieval.chunks, doc!.title),
    prompt: "What methodology did the researchers use?",
    temperature: 0.2,
  });
  console.log(`answer (${text.length} chars): ${text.slice(0, 200)}`);
} catch (error) {
  console.log("\nTHREW:");
  console.log(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  if (error instanceof Error && error.stack) console.log(error.stack.split("\n").slice(0, 6).join("\n"));
}
