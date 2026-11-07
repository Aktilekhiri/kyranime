-- KyrAnime: разделы озвучек (несколько озвучек у одного тайтла)
-- Выполнить целиком в Supabase → SQL Editor. Можно запускать повторно.

-- 1. Таблица озвучек: у каждого тайтла свои студии
create table if not exists public.dubs (
  id uuid primary key default gen_random_uuid(),
  title_id uuid not null references public.titles(id) on delete cascade,
  studio_name text not null,
  studio_url text,                       -- TikTok / Telegram студии (необязательно)
  sort int not null default 0,           -- порядок: меньше = выше; при равенстве — кто добавлен раньше
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists dubs_title_idx on public.dubs (title_id, sort, created_at);

-- 2. Серия принадлежит озвучке
alter table public.episodes
  add column if not exists dub_id uuid references public.dubs(id) on delete cascade;

-- 3. Старые серии: создаём каждому тайтлу одну озвучку (из поля «Команда озвучки»)
insert into public.dubs (title_id, studio_name)
select t.id, coalesce(nullif(trim(t.dubbed_by), ''), 'Основная озвучка')
from public.titles t
where exists (select 1 from public.episodes e where e.title_id = t.id and e.dub_id is null)
  and not exists (select 1 from public.dubs d where d.title_id = t.id);

update public.episodes e
set dub_id = (
  select d.id from public.dubs d
  where d.title_id = e.title_id
  order by d.created_at
  limit 1
)
where e.dub_id is null;

-- 4. Подписываем студии, если название осталось по умолчанию
update public.dubs d set studio_name = 'AniZel TV'
from public.titles t
where d.title_id = t.id and d.studio_name = 'Основная озвучка'
  and (t.slug in ('one-piece', 'attack-on-titan', 'death-note')
       or t.title_ru ilike any (array['%ван%пис%', '%атака титанов%', '%тетрадь смерти%']));

update public.dubs d set studio_name = 'Tokio Voice'
from public.titles t
where d.title_id = t.id and d.studio_name = 'Основная озвучка'
  and (t.slug = 'naruto' or t.title_ru ilike '%наруто%');

-- 5. Теперь номер серии уникален внутри озвучки, а не внутри тайтла
alter table public.episodes drop constraint if exists episodes_title_id_season_number_key;
create unique index if not exists episodes_dub_season_number_idx
  on public.episodes (dub_id, season, number);

-- 6. Права: читать могут все (скрытые озвучки видит только админ), менять — только админ
alter table public.dubs enable row level security;

drop policy if exists "dubs read" on public.dubs;
create policy "dubs read" on public.dubs for select using (published or public.is_admin());

drop policy if exists "dubs admin write" on public.dubs;
create policy "dubs admin write" on public.dubs for all
  using (public.is_admin()) with check (public.is_admin());
