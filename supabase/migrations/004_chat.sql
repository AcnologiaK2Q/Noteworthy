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
