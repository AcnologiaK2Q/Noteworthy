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
