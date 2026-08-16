# Noteworthy

An AI research workspace. Upload a paper, ask it questions in plain language, and get answers grounded in the exact passages they came from — with page-level citations you can click to see the evidence.

**Core loop:** `PDF → Ask → Evidence → Save`

Built with Next.js 14 (App Router), Supabase (Auth + Postgres + pgvector + Storage), and Groq for inference.

---

## Why it's built this way

**Answers are retrieval-grounded, not model recall.** Every document question runs a semantic search over that paper's own passages first; the model is instructed to answer only from those excerpts and to cite them inline. Citation chips map back to specific chunks, and clicking one scrolls to and highlights the source text. When the best match is weak, the UI says so rather than presenting a confident guess.

**The LLM provider is behind a one-file seam.** `lib/ai/provider.ts` defines the interface; `lib/ai/groq.ts` is the only file that knows which vendor is in use. Swapping providers means adding a sibling implementation and changing one line in `lib/ai/index.ts` — no route or feature code changes. This is what makes the planned multi-model comparison feature an additive change rather than a rewrite.

**Embeddings run on Supabase, not a second vendor.** Groq has no embeddings endpoint. Rather than add another API key and rate limit, a Supabase Edge Function serves the runtime's built-in `gte-small` model (384 dimensions). Vectors live in the same Postgres database as the rest of the data, indexed with pgvector's HNSW — no separate vector database to operate.

**Row-level security is the authorization model.** Supabase exposes tables over PostgREST, so access control lives in the database rather than in application code. Every user-owned table has RLS enabled with policies scoped to `auth.uid()`, and storage objects are namespaced by user id so the bucket policy can enforce ownership from the path.

**Statistics are measured, never decorative.** An append-only `events` table records real timings and outcomes across the pipeline. The dashboard renders an em dash instead of a plausible-looking zero when there is no data yet.

---

## Architecture

```mermaid
flowchart TD
    U[User] --> N[Next.js 14 App Router]
    N --> A[Supabase Auth<br/>email · Google · GitHub]
    A --> M[middleware.ts<br/>session refresh + route guard]

    N --> UP[Upload PDF]
    UP --> S[Supabase Storage<br/>private bucket]
    S --> EX[unpdf<br/>per-page text extraction]
    EX --> CH[Chunking<br/>~800 tokens, 150 overlap]
    CH --> EM[Edge Function<br/>gte-small · 384-dim]
    EM --> PG[(Postgres + pgvector<br/>HNSW cosine index)]

    N --> Q[Ask a question]
    Q --> EM2[Embed question]
    EM2 --> R[match_document_chunks<br/>similarity search]
    R --> PG
    R --> P[Build grounded prompt<br/>answer only from excerpts]
    P --> G[Groq · llama-3.3-70b]
    G --> AN[Answer + page citations]
    AN --> NT[Save to Notes]
    AN --> FC[Generate Flashcards<br/>SM-2 scheduling]

    PG -. RLS scoped to auth.uid() .-> N
```

---

## Features

| Area | What it does |
| --- | --- |
| **Auth** | Email/password plus Google and GitHub OAuth, cookie-based sessions, middleware-guarded routes |
| **Dashboard** | Bento-grid overview with measured statistics and recent papers |
| **Papers** | PDF upload → extraction → chunking → embedding, with live processing status |
| **Document Q&A** | Retrieval-grounded answers with clickable page citations and one-click save to notes |
| **Chat** | Streaming general-purpose research chat with persisted history |
| **Notes** | Markdown editor with live preview and autosave |
| **Flashcards** | AI-generated decks from any paper or note, reviewed with SM-2 spaced repetition |

---

## Tech stack

- **Framework** — Next.js 14 (App Router, Server Components, Server Actions), TypeScript strict
- **Database** — Supabase Postgres with `pgvector`, row-level security on every table
- **Auth** — Supabase Auth via `@supabase/ssr`
- **Storage** — Supabase Storage, private bucket with path-scoped policies
- **Inference** — Groq (`llama-3.3-70b-versatile`) through the Vercel AI SDK
- **Embeddings** — Supabase Edge Function running `gte-small`
- **UI** — Tailwind CSS + shadcn/ui, dark theme

---

## Project structure

```
app/                  Routing and composition only
  (marketing)/        Public landing page
  (auth)/             Login, signup, OAuth callback
  (app)/              Authenticated workspace
  api/                Route handlers (chat, upload, document Q&A)
features/             Domain modules — components, actions, and logic
  auth/ chat/ dashboard/ documents/ flashcards/ notes/
lib/
  ai/                 Provider interface, Groq implementation, prompts
  supabase/           Browser, server, middleware, and admin clients
  types/              Database types
supabase/
  migrations/         Schema and RLS policies
  functions/embed/    gte-small embedding Edge Function
```

`app/` stays thin so new domains land as new `features/*` folders without disturbing existing ones.

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

Create a project at [supabase.com](https://supabase.com), then apply the migrations in `supabase/migrations/` **in numerical order** using the SQL Editor, or with the CLI:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### 3. Deploy the embedding function

```bash
supabase functions deploy embed
```

### 4. Configure OAuth providers

In the Supabase dashboard under **Authentication → Providers**, enable Google and GitHub, using this callback URL in each provider's own console:

```
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

Then under **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback` (and your production equivalent) to the redirect allow list.

### 5. Set environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_EDGE_EMBED_URL=https://YOUR_PROJECT_REF.functions.supabase.co/embed
GROQ_API_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

A free Groq API key is available at [console.groq.com](https://console.groq.com/keys).

### 6. Run

```bash
npm run dev
```

---

## Roadmap

- **Phase 2** — arXiv and Semantic Scholar search, automated paper analysis, citation generator
- **Phase 3** — project workspaces, task lists, study schedules
- **Phase 4** — multi-model comparison, saved prompt library
- **Phase 5** — real-time collaboration on shared notes and papers

---

## License

MIT
