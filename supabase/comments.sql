-- KyrAnime: безлимитные комментарии (на тайтл и на серию)
-- Выполнить целиком в Supabase → SQL Editor. Можно запускать повторно.

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_id uuid not null references public.titles(id) on delete cascade,
  season int,                 -- null вместе с number = комментарий к тайтлу
  number int,                 -- иначе комментарий к серии (общий для всех озвучек)
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  check ((season is null) = (number is null))
);

create index if not exists comments_title_idx
  on public.comments (title_id, season, number, created_at desc);

-- Тексты старых отзывов становятся комментариями к тайтлу (один раз)
insert into public.comments (user_id, title_id, body, created_at)
select r.user_id, r.title_id, btrim(r.body), r.created_at
from public.reviews r
where r.body is not null and btrim(r.body) <> ''
  and not exists (
    select 1 from public.comments c
    where c.user_id = r.user_id and c.title_id = r.title_id
      and c.season is null and c.body = btrim(r.body)
  );

alter table public.comments enable row level security;

drop policy if exists "comments read" on public.comments;
create policy "comments read" on public.comments for select using (true);

drop policy if exists "comments insert own" on public.comments;
create policy "comments insert own" on public.comments for insert with check (auth.uid() = user_id);

drop policy if exists "comments delete own or admin" on public.comments;
create policy "comments delete own or admin" on public.comments for delete
  using (auth.uid() = user_id or public.is_admin());
