-- Кыргызча аниме: время начала титров (с него идёт отсчёт до следующей серии).
-- Выполнить в Supabase → SQL Editor. Можно запускать повторно.
alter table public.episodes add column if not exists outro_sec int;
