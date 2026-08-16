/**
 * Seeds a public demo paper by running it through the real ingestion pipeline,
 * so the demo exercises the same retrieval path as any uploaded document.
 *
 *   node scripts/seed-demo.mjs <path-to-pdf> "Paper title"
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_EDGE_EMBED_URL in .env.local.
 * Use a paper you have the right to redistribute (e.g. arXiv, CC-licensed).
 */

import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { extractText, getDocumentProxy } from "unpdf";

const DEMO_EMAIL = "demo@noteworthy.local";
const EMBED_BATCH_SIZE = 20;

await loadEnv();

const [pdfPath, titleArg] = process.argv.slice(2);

if (!pdfPath) {
  console.error('Usage: node scripts/seed-demo.mjs <path-to-pdf> "Paper title"');
  process.exit(1);
}

const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const embedUrl = requireEnv("SUPABASE_EDGE_EMBED_URL");

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const title = titleArg ?? basename(pdfPath).replace(/\.pdf$/i, "");
const ownerId = await ensureDemoUser();
const documentId = randomUUID();
const storagePath = `${ownerId}/${documentId}/${basename(pdfPath).replace(/[^a-zA-Z0-9._-]/g, "_")}`;

console.log(`Seeding "${title}"…`);

const fileBuffer = await readFile(pdfPath);

const { error: uploadError } = await supabase.storage
  .from("documents")
  .upload(storagePath, fileBuffer, { contentType: "application/pdf", upsert: true });

if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

const { error: insertError } = await supabase.from("documents").insert({
  id: documentId,
  user_id: ownerId,
  title,
  storage_path: storagePath,
  file_size_bytes: fileBuffer.byteLength,
  status: "processing",
  is_demo: true,
});

if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

const pdf = await getDocumentProxy(new Uint8Array(fileBuffer));
const { text, totalPages } = await extractText(pdf, { mergePages: false });

const pages = text
  .map((pageText, index) => ({ pageNumber: index + 1, text: normalize(pageText) }))
  .filter((page) => page.text.length > 0);

const chunks = chunkPages(pages);
console.log(`Extracted ${pages.length} pages, ${chunks.length} chunks.`);

for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
  const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
  const embeddings = await embed(batch.map((chunk) => chunk.content));

  const { error } = await supabase.from("document_chunks").insert(
    batch.map((chunk, index) => ({
      document_id: documentId,
      user_id: ownerId,
      chunk_index: chunk.chunkIndex,
      page_number: chunk.pageNumber,
      content: chunk.content,
      token_count: chunk.tokenCount,
      embedding: `[${embeddings[index].join(",")}]`,
    })),
  );

  if (error) throw new Error(`Chunk insert failed: ${error.message}`);
  console.log(`  embedded ${Math.min(i + EMBED_BATCH_SIZE, chunks.length)}/${chunks.length}`);
}

await supabase
  .from("documents")
  .update({ status: "ready", page_count: totalPages })
  .eq("id", documentId);

console.log(`\nDone. Demo paper is live at /documents/${documentId}`);
console.log("Enable anonymous sign-ins in Supabase (Authentication > Sign In / Providers).");

async function ensureDemoUser() {
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 200 });
  const existing = list?.users.find((u) => u.email === DEMO_EMAIL);
  if (existing) return existing.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: randomUUID(),
    email_confirm: true,
    user_metadata: { full_name: "Noteworthy Demo" },
  });

  if (error) throw new Error(`Could not create the demo user: ${error.message}`);
  return data.user.id;
}

async function embed(texts) {
  const response = await fetch(embedUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify({ texts }),
  });

  if (!response.ok) throw new Error(`Embedding failed: ${await response.text()}`);

  const { embeddings } = await response.json();
  return embeddings;
}

function normalize(text) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/-\n(?=[a-z])/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function estimateTokens(text) {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

function chunkPages(pages) {
  const chunks = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const sentences = page.text
      .split(/(?<=[.!?])\s+(?=[A-Z(\[])|\n{2,}/)
      .map((s) => s.trim())
      .filter(Boolean);

    let current = [];
    let currentTokens = 0;

    const flush = () => {
      if (current.length === 0) return;
      const content = current.join(" ").trim();
      const tokenCount = estimateTokens(content);
      if (tokenCount >= 20) {
        chunks.push({ chunkIndex: chunkIndex++, pageNumber: page.pageNumber, content, tokenCount });
      }
    };

    for (const sentence of sentences) {
      const tokens = estimateTokens(sentence);

      if (currentTokens + tokens > 800 && current.length > 0) {
        flush();
        const overlap = [];
        let overlapTokens = 0;
        for (let i = current.length - 1; i >= 0; i -= 1) {
          const t = estimateTokens(current[i]);
          if (overlapTokens + t > 150) break;
          overlap.unshift(current[i]);
          overlapTokens += t;
        }
        current = overlap;
        currentTokens = overlapTokens;
      }

      current.push(sentence);
      currentTokens += tokens;
    }

    flush();
  }

  return chunks;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Add it to .env.local.`);
    process.exit(1);
  }
  return value;
}

async function loadEnv() {
  try {
    const raw = await readFile(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Fall back to the ambient environment.
  }
}
