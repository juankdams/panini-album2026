create table public.collections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.collections enable row level security;

create policy "Users read own collection"
  on public.collections for select
  using (auth.uid() = user_id);

create policy "Users insert own collection"
  on public.collections for insert
  with check (auth.uid() = user_id);

create policy "Users update own collection"
  on public.collections for update
  using (auth.uid() = user_id);
