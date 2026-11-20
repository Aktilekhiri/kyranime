-- Вход и уведомления через Telegram. Выполнить один раз в Supabase → SQL Editor.
create table if not exists public.telegram_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  chat_id bigint unique not null,
  username text,
  notify boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.telegram_links enable row level security;
drop policy if exists "tg links read own" on public.telegram_links;
create policy "tg links read own" on public.telegram_links for select using (auth.uid() = user_id);

-- Одноразовые коды входа/привязки. Доступны только серверу (service role), политик нет.
create table if not exists public.telegram_tokens (
  token text primary key,
  kind text not null check (kind in ('login', 'link')),
  user_id uuid references auth.users(id) on delete cascade,
  chat_id bigint,
  tg_username text,
  created_at timestamptz not null default now()
);
alter table public.telegram_tokens enable row level security;
