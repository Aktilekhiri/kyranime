-- Приватность: ник по умолчанию больше не берётся из почты. Выполнить один раз в Supabase -> SQL Editor.

-- 1. Новые пользователи получают нейтральный ник user_xxxxxxxx (раньше: начало почты + 4 символа id).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, 'user_' || substr(replace(new.id::text, '-', ''), 1, 8));
  return new;
end;
$$;

-- 2. Старые автоматические ники (они заканчиваются на _ и первые 4 символа id) заменяем на нейтральные.
--    Ники, которые люди выбрали сами, не трогаем.
update public.profiles
set username = 'user_' || substr(replace(id::text, '-', ''), 1, 8)
where right(username, 5) = '_' || substr(id::text, 1, 4);

-- 3. В чате ник дублируется в сообщениях: обновляем и там.
update public.chat_messages m
set username = p.username
from public.profiles p
where p.id = m.user_id and m.username <> p.username;
