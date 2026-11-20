import { getUser, isAdminEmail } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Один раз (только админ): открой /api/telegram/setup, и бот начнёт присылать сообщения на сайт. */
export async function GET(req: Request) {
  const user = await getUser();
  if (!user || !isAdminEmail(user.email)) return new Response("Только для админа", { status: 403 });
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret) return new Response("Нет TELEGRAM_BOT_TOKEN или TELEGRAM_WEBHOOK_SECRET в Vercel", { status: 500 });
  // Адрес берём из самого запроса: Telegram не ходит по редиректам (kyranime.com → www.kyranime.com даёт ошибку 308)
  const origin = new URL(req.url).origin;
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: `${origin}/api/telegram`, secret_token: secret, allowed_updates: ["message"] }),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  // Диагностика: что Telegram видит у вебхука (последняя ошибка, сколько сообщений ждёт)
  const info = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)
    .then((r) => r.json() as Promise<{ result?: { url?: string; pending_update_count?: number; last_error_date?: number; last_error_message?: string } }>)
    .catch(() => null);
  const i = info?.result;
  const report = i
    ? `\nURL: ${i.url}\nОжидают: ${i.pending_update_count ?? 0}\nПоследняя ошибка: ${i.last_error_message ?? "нет"}${i.last_error_date ? ` (${new Date(i.last_error_date * 1000).toISOString()})` : ""}`
    : "";
  return new Response((data.ok ? `Готово: вебхук установлен (${origin}/api/telegram)` : `Ошибка Telegram: ${data.description ?? res.status}`) + report, {
    status: data.ok ? 200 : 502,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
