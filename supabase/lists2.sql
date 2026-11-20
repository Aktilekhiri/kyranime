-- Добавляем статусы «Отложено» и «Брошено». Выполнить один раз в Supabase -> SQL Editor.
alter table public.title_lists drop constraint if exists title_lists_status_check;
alter table public.title_lists add constraint title_lists_status_check
  check (status in ('watching','planned','completed','on_hold','dropped'));
