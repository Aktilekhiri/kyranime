-- Кыргызча аниме: редактирование своих комментариев и смена ника.
-- Выполнить целиком в Supabase → SQL Editor. Можно запускать повторно.

alter table public.comments add column if not exists edited_at timestamptz;

drop policy if exists "comments update own" on public.comments;
create policy "comments update own" on public.comments for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Менять можно только текст: автор, тайтл, серия и дата остаются прежними
create or replace function public.comments_only_body()
returns trigger language plpgsql as $$
begin
  if new.user_id is distinct from old.user_id
     or new.title_id is distinct from old.title_id
     or new.season is distinct from old.season
     or new.number is distinct from old.number
     or new.created_at is distinct from old.created_at then
    raise exception 'only body can be edited';
  end if;
  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists comments_only_body on public.comments;
create trigger comments_only_body before update on public.comments
  for each row execute function public.comments_only_body();

-- Ник: 3–24 символа (политика "profiles update own" уже есть в schema.sql)
alter table public.profiles drop constraint if exists profiles_username_len;
alter table public.profiles add constraint profiles_username_len
  check (char_length(username) between 3 and 24) not valid;
