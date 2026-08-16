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
