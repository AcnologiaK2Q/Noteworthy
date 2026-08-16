-- Noteworthy - complete schema, RLS policies, and functions.
-- Paste this whole file into the Supabase SQL Editor and run it once.
-- Generated from supabase/migrations/*.sql - keep those as the source of truth.

-- ============================================================
-- 001_profiles.sql
-- ============================================================
-- Extensions used across the schema.
create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Keeps updated_at honest without the app having to remember.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Auth rows live in a schema the client can't write to, so the profile row is
-- created server-side the moment a user signs up (email or OAuth).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 002_documents.sql
-- ============================================================
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  storage_path text not null,
  file_size_bytes bigint,
  page_count int,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  error_message text,
  -- Demo papers are readable by anyone so the public demo needs no signup.
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents (user_id, created_at desc);
create index if not exists documents_demo_idx on public.documents (is_demo) where is_demo;

alter table public.documents enable row level security;

create policy documents_select_own on public.documents
  for select using (auth.uid() = user_id or is_demo);

create policy documents_insert_own on public.documents
  for insert with check (auth.uid() = user_id);

create policy documents_update_own on public.documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy documents_delete_own on public.documents
  for delete using (auth.uid() = user_id);

create trigger documents_touch_updated_at
  before update on public.documents
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 003_document_chunks.sql
-- ============================================================
-- 384 dimensions matches the gte-small model served by the embed Edge Function.
create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  chunk_index int not null,
  page_number int,
  content text not null,
  token_count int,
  embedding vector(384),
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index if not exists document_chunks_document_id_idx
  on public.document_chunks (document_id, chunk_index);

create index if not exists document_chunks_embedding_idx
  on public.document_chunks using hnsw (embedding vector_cosine_ops);

alter table public.document_chunks enable row level security;

-- Chunk visibility follows its parent document, including demo papers.
create policy document_chunks_select_own on public.document_chunks
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.documents d
      where d.id = document_chunks.document_id and d.is_demo
    )
  );

create policy document_chunks_insert_own on public.document_chunks
  for insert with check (auth.uid() = user_id);

create policy document_chunks_delete_own on public.document_chunks
  for delete using (auth.uid() = user_id);

-- Similarity search scoped to one document. security invoker so the caller's
-- RLS policies still apply to the underlying table.
create or replace function public.match_document_chunks (
  query_embedding vector(384),
  match_document_id uuid,
  match_count int default 6
)
returns table (
  id uuid,
  chunk_index int,
  page_number int,
  content text,
  similarity float
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.chunk_index,
    c.page_number,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  where c.document_id = match_document_id
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- Same search across every document the caller can see (library-wide chat).
create or replace function public.match_library_chunks (
  query_embedding vector(384),
  match_count int default 8
)
returns table (
  id uuid,
  document_id uuid,
  document_title text,
  chunk_index int,
  page_number int,
  content text,
  similarity float
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    c.document_id,
    d.title as document_title,
    c.chunk_index,
    c.page_number,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  join public.documents d on d.id = c.document_id
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================================
-- 004_chat.sql
-- ============================================================
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New chat',
  -- null means a general research chat rather than one scoped to a paper.
  document_id uuid references public.documents (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_conversations_user_idx
  on public.chat_conversations (user_id, updated_at desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  -- [{ page, chunkId, documentId, snippet }] for citation-grounded answers.
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_conversation_idx
  on public.chat_messages (conversation_id, created_at);

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

create policy chat_conversations_crud_own on public.chat_conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy chat_messages_crud_own on public.chat_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger chat_conversations_touch_updated_at
  before update on public.chat_conversations
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 005_notes.sql
-- ============================================================
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled note',
  content_markdown text not null default '',
  -- Set when a note was saved out of a document Q&A.
  document_id uuid references public.documents (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_idx on public.notes (user_id, updated_at desc);

alter table public.notes enable row level security;

create policy notes_crud_own on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger notes_touch_updated_at
  before update on public.notes
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 006_flashcards.sql
-- ============================================================
create table if not exists public.flashcard_decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('note', 'document', 'manual')),
  source_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists flashcard_decks_user_idx
  on public.flashcard_decks (user_id, created_at desc);

-- ease_factor/interval_days/repetitions/due_at hold SM-2 scheduling state.
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.flashcard_decks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null,
  answer text not null,
  ease_factor numeric not null default 2.5,
  interval_days int not null default 0,
  repetitions int not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists flashcards_deck_idx on public.flashcards (deck_id);
create index if not exists flashcards_due_idx on public.flashcards (user_id, due_at);

alter table public.flashcard_decks enable row level security;
alter table public.flashcards enable row level security;

create policy flashcard_decks_crud_own on public.flashcard_decks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy flashcards_crud_own on public.flashcards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger flashcard_decks_touch_updated_at
  before update on public.flashcard_decks
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 007_storage.sql
-- ============================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Object keys are {user_id}/{document_id}/{filename}.pdf, so the first path
-- segment is the owner check.
create policy documents_storage_select on storage.objects
  for select using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy documents_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy documents_storage_delete on storage.objects
  for delete using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- 008_events.sql
-- ============================================================
-- Append-only instrumentation log. Every dashboard statistic is derived from
-- these rows, so no number shown in the UI is ever hardcoded.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (
    event_type in (
      'pdf_upload',
      'pdf_processed',
      'pdf_failed',
      'retrieval',
      'chat_message',
      'flashcard_generated'
    )
  ),
  metadata jsonb not null default '{}'::jsonb,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists events_user_type_idx
  on public.events (user_id, event_type, created_at desc);

alter table public.events enable row level security;

create policy events_select_own on public.events
  for select using (auth.uid() = user_id);

create policy events_insert_own on public.events
  for insert with check (auth.uid() = user_id);

-- Aggregates the stat tiles in one round trip. Returns nulls (not zeros) where
-- there is no data yet so the UI can render an em dash instead of a fake 0%.
create or replace function public.get_user_stats ()
returns table (
  documents_ready int,
  questions_answered int,
  notes_count int,
  flashcards_count int,
  cards_due int,
  retrieval_success_rate numeric,
  avg_response_ms int,
  avg_processing_ms int
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (select count(*)::int from documents where user_id = auth.uid() and status = 'ready'),
    (select count(*)::int from chat_messages where user_id = auth.uid() and role = 'assistant'),
    (select count(*)::int from notes where user_id = auth.uid()),
    (select count(*)::int from flashcards where user_id = auth.uid()),
    (select count(*)::int from flashcards where user_id = auth.uid() and due_at <= now()),
    (
      select round(
        100.0 * count(*) filter (where (metadata ->> 'grounded')::boolean) / nullif(count(*), 0),
        0
      )
      from events
      where user_id = auth.uid() and event_type = 'retrieval'
    ),
    (
      select avg(duration_ms)::int
      from events
      where user_id = auth.uid() and event_type = 'chat_message' and duration_ms is not null
    ),
    (
      select avg(duration_ms)::int
      from events
      where user_id = auth.uid() and event_type = 'pdf_processed' and duration_ms is not null
    );
$$;

