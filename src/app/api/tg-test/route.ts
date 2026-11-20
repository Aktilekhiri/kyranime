import { getUser, isAdminEmail } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Проверка бота (только админ): открой /api/tg-test, придёт тестовое сообщение в канал, а на странице будет результат. */
export async function GET() {
  const user = await getUser();
  if (!user || !isAdminEmail(user.email)) return new Response("Только для админа", { status: 403 });
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return new Response("Нет переменной TELEGRAM_BOT_TOKEN в Vercel (или сайт не пересобран после её добавления)", { status: 500 });
  const channel = process.env.TELEGRAM_CHANNEL || "@kyranime";
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: channel, text: "✅ Бот подключён к сайту kyranime.com" }),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  return new Response(data.ok ? `Готово: тестовое сообщение отправлено в ${channel}` : `Ошибка Telegram: ${data.description ?? res.status}`, {
    status: data.ok ? 200 : 502,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
