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
