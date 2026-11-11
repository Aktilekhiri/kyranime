-- Кыргызча аниме: возможность скрыть тайтл с сайта (для всех, кроме админа)
-- Выполнить целиком в Supabase → SQL Editor. Можно запускать повторно.

alter table public.titles add column if not exists hidden boolean not null default false;

-- Скрытые тайтлы видит только админ
drop policy if exists "titles read" on public.titles;
create policy "titles read" on public.titles for select using (not hidden or public.is_admin());

-- Скрываем тайтлы издательства Kodansha, пока нет ответа правообладателя
update public.titles set hidden = true
where slug in (
  'attack-on-titan',
  'the-seven-deadly-sins',
  'vinland-saga',
  'tokyo-revengers',
  'blue-lock',
  'grand-blue',
  'the-fragrant-flower-blooms-with-dignity'
);
