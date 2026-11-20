import { getUser, isAdminEmail } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Один раз (только админ): открой /api/telegram/setup, и бот начнёт присылать сообщения на сайт. */
export async function GET() {
  const user = await getUser();
  if (!user || !isAdminEmail(user.email)) return new Response("Только для админа", { status: 403 });
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret) return new Response("Нет TELEGRAM_BOT_TOKEN или TELEGRAM_WEBHOOK_SECRET в Vercel", { status: 500 });
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: `${SITE_URL}/api/telegram`, secret_token: secret, allowed_updates: ["message"] }),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  return new Response(data.ok ? `Готово: вебхук установлен (${SITE_URL}/api/telegram)` : `Ошибка Telegram: ${data.description ?? res.status}`, {
    status: data.ok ? 200 : 502,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
