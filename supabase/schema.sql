-- KyrAnime: схема базы данных (Supabase / PostgreSQL)
-- Выполнить целиком в Supabase → SQL Editor.

create extension if not exists pg_trgm;

-- ───────── Профили (создаются автоматически при регистрации) ─────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(nullif(split_part(new.email, '@', 1), ''), 'user') || '_' || substr(new.id::text, 1, 4)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────── Каталог ─────────
create table if not exists public.titles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_ky text not null,          -- название по-кыргызски
  title_ru text not null,          -- название по-русски
  title_orig text,                 -- оригинальное название
  description_ky text,
  description_ru text,
  poster_url text,
  banner_url text,
  year int,
  genres text[] not null default '{}',
  status text not null default 'ongoing' check (status in ('ongoing', 'completed')),
  dubbed_by text,                  -- команда озвучки
  created_at timestamptz not null default now()
);

create index if not exists titles_search_idx on public.titles
  using gin ((coalesce(title_ky,'') || ' ' || coalesce(title_ru,'') || ' ' || coalesce(title_orig,'')) gin_trgm_ops);

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.titles(id) on delete cascade,
  season int not null default 1,
  number int not null,
  name_ky text,
  name_ru text,
  hls_url text not null,           -- ссылка на master.m3u8 (Cloudflare R2 / Bunny)
  thumbnail_url text,
  duration_sec int,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  unique (title_id, season, number)
);

create index if not exists episodes_title_idx on public.episodes (title_id, season, number);

-- ───────── Пользовательские данные ─────────
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.titles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 10),
  body text check (char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  unique (title_id, user_id)        -- один отзыв на тайтл от пользователя
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  title_id uuid not null references public.titles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, title_id)
);

create table if not exists public.watch_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  position_sec int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, episode_id)
);

-- ───────── Средний рейтинг ─────────
create or replace view public.title_ratings as
  select title_id, round(avg(rating)::numeric, 1) as avg_rating, count(*) as reviews_count
  from public.reviews
  group by title_id;

-- ───────── Админ ─────────
-- Админ определяется по email из JWT. ЗАМЕНИ на свою почту:
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'CHANGE_ME@example.com';
$$;

-- ───────── Row Level Security ─────────
alter table public.profiles enable row level security;
alter table public.titles enable row level security;
alter table public.episodes enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.watch_progress enable row level security;

-- Публичное чтение каталога и отзывов
create policy "titles read" on public.titles for select using (true);
create policy "episodes read" on public.episodes for select using (published or public.is_admin());
create policy "reviews read" on public.reviews for select using (true);
create policy "profiles read" on public.profiles for select using (true);

-- Запись каталога — только админ
create policy "titles admin write" on public.titles for all using (public.is_admin()) with check (public.is_admin());
create policy "episodes admin write" on public.episodes for all using (public.is_admin()) with check (public.is_admin());

-- Профиль: менять может только владелец
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);

-- Отзывы: свои создаём/правим/удаляем (админ может удалять любые)
create policy "reviews insert own" on public.reviews for insert with check (auth.uid() = user_id);
create policy "reviews update own" on public.reviews for update using (auth.uid() = user_id);
create policy "reviews delete own" on public.reviews for delete using (auth.uid() = user_id or public.is_admin());

-- Избранное и прогресс — только свои
create policy "favorites own" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "progress own" on public.watch_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
