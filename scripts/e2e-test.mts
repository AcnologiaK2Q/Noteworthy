/**
 * End-to-end check against the live project, driving the real pipeline
 * modules: ingest -> retrieve -> answer -> save -> flashcards, plus an RLS
 * cross-user isolation test.
 *
 *   npx tsx scripts/e2e-test.mts <path-to-pdf>
 */

import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { generateText } from "ai";

import { getLLMProvider } from "../lib/ai";
import { buildRagSystemPrompt } from "../lib/ai/prompts";
import { ingestDocument } from "../features/documents/pipeline/ingestDocument";
import { retrieveChunks } from "../features/documents/retrieval/retrieveChunks";
import { generateFlashcards } from "../features/flashcards/generate";
import type { Database } from "../lib/types/database.types";

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error("Usage: npx tsx scripts/e2e-test.mts <path-to-pdf>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const admin = createClient<Database>(url, serviceKey, { auth: { persistSession: false } });

const results: { name: string; pass: boolean; detail: string }[] = [];
function check(name: string, pass: boolean, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}

const stamp = Date.now();
const userA = { email: `e2e-a-${stamp}@noteworthy.test`, password: randomUUID() };
const userB = { email: `e2e-b-${stamp}@noteworthy.test`, password: randomUUID() };

console.log("\n--- 1. Auth & profile trigger ---");

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email: userA.email,
  password: userA.password,
  email_confirm: true,
  user_metadata: { full_name: "E2E Tester" },
});
check("create user A", !createErr, createErr?.message ?? created!.user.id);
const userAId = created!.user.id;

const { data: userBCreated } = await admin.auth.admin.createUser({
  email: userB.email,
  password: userB.password,
  email_confirm: true,
});
const userBId = userBCreated!.user.id;

const { data: profile } = await admin
  .from("profiles")
  .select("id, full_name")
  .eq("id", userAId)
  .maybeSingle();
check("profile auto-created by trigger", !!profile, profile?.full_name ?? "no row");

// Session-scoped client — every query below runs under user A's RLS policies.
const asUserA = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
const { data: signIn, error: signInErr } = await asUserA.auth.signInWithPassword(userA);
check("sign in with password", !signInErr && !!signIn.session, signInErr?.message ?? "session ok");

console.log("\n--- 2. Upload & ingestion ---");

const documentId = randomUUID();
const storagePath = `${userAId}/${documentId}/attention.pdf`;
const pdf = await readFile(pdfPath);

const { error: uploadErr } = await asUserA.storage
  .from("documents")
  .upload(storagePath, pdf, { contentType: "application/pdf" });
check("upload PDF to storage (as user)", !uploadErr, uploadErr?.message ?? `${pdf.byteLength} bytes`);

const { error: rowErr } = await asUserA.from("documents").insert({
  id: documentId,
  user_id: userAId,
  title: "Attention Is All You Need",
  storage_path: storagePath,
  file_size_bytes: pdf.byteLength,
  status: "processing",
});
check("insert documents row", !rowErr, rowErr?.message ?? documentId);

const ingest = await ingestDocument({
  supabase: asUserA,
  userId: userAId,
  documentId,
  storagePath,
});
check(
  "ingest: extract -> chunk -> embed -> store",
  ingest.chunkCount > 0,
  `${ingest.pageCount} pages, ${ingest.chunkCount} chunks, ${(ingest.durationMs / 1000).toFixed(1)}s`,
);

const { data: doc } = await asUserA
  .from("documents")
  .select("status, page_count")
  .eq("id", documentId)
  .single();
check("document marked ready", doc?.status === "ready", `status=${doc?.status}`);

const { count: chunkCount } = await asUserA
  .from("document_chunks")
  .select("id", { count: "exact", head: true })
  .eq("document_id", documentId);
check("chunks persisted with embeddings", (chunkCount ?? 0) > 0, `${chunkCount} rows`);

console.log("\n--- 3. Retrieval & grounded answer ---");

const question = "What is the Transformer architecture and what does it replace?";
const retrieval = await retrieveChunks({
  supabase: asUserA,
  userId: userAId,
  question,
  documentId,
});
check(
  "semantic retrieval returns matches",
  retrieval.chunks.length > 0,
  `${retrieval.chunks.length} chunks, top similarity ${retrieval.topSimilarity?.toFixed(3)}`,
);
check("retrieval judged grounded", retrieval.grounded, `threshold 0.5`);

const { text: answer } = await generateText({
  model: getLLMProvider().model(),
  system: buildRagSystemPrompt(retrieval.chunks, "Attention Is All You Need"),
  prompt: question,
  temperature: 0.2,
});
const citationMarkers = [...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
check("answer generated", answer.length > 50, `${answer.length} chars`);
check("answer contains citations", citationMarkers.length > 0, `markers: ${[...new Set(citationMarkers)].join(", ")}`);

const citedPages = [...new Set(citationMarkers)]
  .map((n) => retrieval.chunks[n - 1]?.pageNumber)
  .filter((p): p is number => typeof p === "number");
check("citations map to real pages", citedPages.length > 0, `pages: ${citedPages.join(", ")}`);

console.log("\n  Answer preview:");
console.log("  " + answer.slice(0, 400).replace(/\n/g, "\n  "));

console.log("\n--- 4. Refusal on out-of-scope question ---");

const offTopic = "What is the recommended daily intake of vitamin D for adults?";
const offRetrieval = await retrieveChunks({
  supabase: asUserA,
  userId: userAId,
  question: offTopic,
  documentId,
});
const { text: refusal } = await generateText({
  model: getLLMProvider().model(),
  system: buildRagSystemPrompt(offRetrieval.chunks, "Attention Is All You Need"),
  prompt: offTopic,
  temperature: 0.2,
});
const declined = /\b(not|no|doesn'?t|does not|cannot|can'?t|unable|nothing)\b/i.test(refusal.slice(0, 300));
check("declines question not covered by paper", declined, refusal.slice(0, 120).replace(/\n/g, " "));

console.log("\n--- 5. Save to notes ---");

const { data: note, error: noteErr } = await asUserA
  .from("notes")
  .insert({
    user_id: userAId,
    title: question.slice(0, 80),
    content_markdown: `# ${question}\n\n${answer}`,
    document_id: documentId,
  })
  .select("id, title")
  .single();
check("save answer as note", !noteErr && !!note, noteErr?.message ?? note!.title);

console.log("\n--- 6. Flashcard generation ---");

const sourceText = retrieval.chunks.map((c) => c.content).join("\n\n");
const cards = await generateFlashcards("Attention Is All You Need", sourceText, 5);
check("generate flashcards", cards.length > 0, `${cards.length} cards`);
if (cards.length > 0) {
  console.log(`\n  Q: ${cards[0].question}`);
  console.log(`  A: ${cards[0].answer.slice(0, 160)}`);
}

const { data: deck } = await asUserA
  .from("flashcard_decks")
  .insert({
    user_id: userAId,
    title: "Attention Is All You Need",
    source_type: "document",
    source_id: documentId,
  })
  .select("id")
  .single();

const { error: cardsErr } = await asUserA.from("flashcards").insert(
  cards.map((c) => ({
    deck_id: deck!.id,
    user_id: userAId,
    question: c.question,
    answer: c.answer,
  })),
);
check("persist flashcards", !cardsErr, cardsErr?.message ?? `${cards.length} rows`);

console.log("\n--- 7. RLS cross-user isolation ---");

const asUserB = createClient<Database>(url, anonKey, { auth: { persistSession: false } });
await asUserB.auth.signInWithPassword(userB);

const { data: bSeesDocs } = await asUserB.from("documents").select("id").eq("id", documentId);
check("user B cannot read user A's document", (bSeesDocs?.length ?? 0) === 0, `${bSeesDocs?.length ?? 0} rows`);

const { data: bSeesChunks } = await asUserB
  .from("document_chunks")
  .select("id")
  .eq("document_id", documentId);
check("user B cannot read user A's chunks", (bSeesChunks?.length ?? 0) === 0, `${bSeesChunks?.length ?? 0} rows`);

const { data: bSeesNotes } = await asUserB.from("notes").select("id").eq("id", note!.id);
check("user B cannot read user A's notes", (bSeesNotes?.length ?? 0) === 0, `${bSeesNotes?.length ?? 0} rows`);

const { data: bStorage } = await asUserB.storage.from("documents").download(storagePath);
check("user B cannot download user A's file", !bStorage, bStorage ? "LEAKED" : "blocked");

console.log("\n--- 8. Observability ---");

const { data: stats } = await asUserA.rpc("get_user_stats");
const s = stats?.[0];
check("stats RPC returns measured values", !!s, JSON.stringify(s));
check("papers analyzed counted", (s?.documents_ready ?? 0) === 1, `${s?.documents_ready}`);
check(
  "retrieval success rate computed",
  s?.retrieval_success_rate !== null,
  `${s?.retrieval_success_rate}%`,
);
check(
  "processing time recorded",
  (s?.avg_processing_ms ?? 0) > 0,
  `${((s?.avg_processing_ms ?? 0) / 1000).toFixed(1)}s`,
);

console.log("\n--- Cleanup ---");
await admin.storage.from("documents").remove([storagePath]);
await admin.auth.admin.deleteUser(userAId);
await admin.auth.admin.deleteUser(userBId);
console.log("Test users and files removed.");

const failed = results.filter((r) => !r.pass);
console.log(`\n${"=".repeat(60)}`);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) {
  console.log("\nFailures:");
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
}
process.exit(failed.length > 0 ? 1 : 0);
