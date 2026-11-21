import { announceNewTitle } from "@/lib/telegram";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser, isAdminEmail } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Только админ: присылает ему в личку (в привязанный Telegram) пост о последнем добавленном тайтле, в канал ничего не уходит. */
export async function GET() {
  const user = await getUser();
  if (!user || !isAdminEmail(user.email)) return new Response("Только для админа", { status: 403 });
  const admin = createAdminClient();
  if (!admin) return new Response("Нет SUPABASE_SERVICE_ROLE_KEY", { status: 500 });
  const { data: link } = await admin.from("telegram_links").select("chat_id").eq("user_id", user.id).maybeSingle();
  if (!link) return new Response("Telegram не привязан: привяжи его в профиле", { status: 400 });
  const { data: title } = await admin
    .from("titles")
    .select("slug, title_ky, title_ru, poster_url, description_ky, genres")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!title) return new Response("Тайтлов пока нет", { status: 404 });
  const ok = await announceNewTitle(title, link.chat_id as number);
  return new Response(ok ? `Готово: отправил в твой Telegram «${title.title_ky}»` : "Telegram не принял сообщение (смотри логи Vercel)", {
    status: ok ? 200 : 502,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
