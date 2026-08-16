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
