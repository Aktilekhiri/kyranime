-- Личные списки: смотрю / в планах / просмотрено. Выполнить один раз в Supabase → SQL Editor.
create table if not exists public.title_lists (
  user_id uuid not null references auth.users(id) on delete cascade,
  title_id uuid not null references public.titles(id) on delete cascade,
  status text not null check (status in ('watching','planned','completed')),
  created_at timestamptz not null default now(),
  primary key (user_id, title_id)
);
alter table public.title_lists enable row level security;
drop policy if exists "lists own all" on public.title_lists;
create policy "lists own all" on public.title_lists for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
