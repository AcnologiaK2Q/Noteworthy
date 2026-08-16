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
