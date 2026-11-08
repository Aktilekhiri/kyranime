-- KyrAnime: формат кадра, ответы на комментарии, реакции, чат
-- Выполнить целиком в Supabase → SQL Editor ПОСЛЕ comments.sql. Можно запускать повторно.

-- 1. Формат кадра серии (убирает чёрные полосы, если видео не 16:9)
alter table public.episodes add column if not exists aspect text not null default '16/9';

-- 2. Ответы на комментарии
alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade;
alter table public.comments
  add column if not exists reply_to_id uuid references public.comments(id) on delete set null;
create index if not exists comments_parent_idx on public.comments (parent_id);

-- 3. Реакции на комментарии (как в Telegram: человек ставит каждую реакцию один раз)
create table if not exists public.comment_reactions (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 8),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id, emoji)
);

alter table public.comment_reactions enable row level security;

drop policy if exists "reactions read" on public.comment_reactions;
create policy "reactions read" on public.comment_reactions for select using (true);
drop policy if exists "reactions insert own" on public.comment_reactions;
create policy "reactions insert own" on public.comment_reactions for insert with check (auth.uid() = user_id);
drop policy if exists "reactions delete own" on public.comment_reactions;
create policy "reactions delete own" on public.comment_reactions for delete using (auth.uid() = user_id);

-- 4. Чат: комнаты 'global', 'title:<id тайтла>', 'ep:<id тайтла>:<сезон>-<номер>'
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  username text not null,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists chat_room_idx on public.chat_messages (room, created_at desc);

alter table public.chat_messages enable row level security;

drop policy if exists "chat read" on public.chat_messages;
create policy "chat read" on public.chat_messages for select using (true);
drop policy if exists "chat insert own" on public.chat_messages;
create policy "chat insert own" on public.chat_messages for insert with check (auth.uid() = user_id);
drop policy if exists "chat delete own or admin" on public.chat_messages;
create policy "chat delete own or admin" on public.chat_messages for delete
  using (auth.uid() = user_id or public.is_admin());

-- Сообщения приходят всем в реальном времени
do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
