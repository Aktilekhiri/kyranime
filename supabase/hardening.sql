-- Усиление защиты. Выполнить один раз в Supabase -> SQL Editor. Можно запускать повторно.

-- 1. Сводка оценок работала от имени владельца и обходила RLS. Теперь работает с правами читающего.
alter view public.title_ratings set (security_invoker = on);

-- 2. Аватарка в профиле может быть только файлом из нашего хранилища (не внешней ссылкой).
alter table public.profiles drop constraint if exists profiles_avatar_url_ok;
alter table public.profiles add constraint profiles_avatar_url_ok
  check (avatar_url is null or avatar_url like 'https://peujlyndfcjmxqbjptno.supabase.co/storage/v1/object/public/avatars/%')
  not valid;

-- 3. Не больше 20 сообщений в минуту от одного человека в чате и в комментариях.
create or replace function public.rate_limit_insert()
returns trigger language plpgsql as $$
declare n int;
begin
  execute format('select count(*) from public.%I where user_id = $1 and created_at > now() - interval ''1 minute''', tg_table_name)
    into n using new.user_id;
  if n >= 20 then
    raise exception 'rate_limit';
  end if;
  return new;
end;
$$;

drop trigger if exists chat_rate on public.chat_messages;
create trigger chat_rate before insert on public.chat_messages
  for each row execute function public.rate_limit_insert();

drop trigger if exists comments_rate on public.comments;
create trigger comments_rate before insert on public.comments
  for each row execute function public.rate_limit_insert();
