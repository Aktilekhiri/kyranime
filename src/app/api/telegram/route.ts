import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

type Update = { message?: { text?: string; chat: { id: number; type: string }; from?: { username?: string } } };

async function reply(chatId: number, text: string, button?: { text: string; url: string }) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(button ? { reply_markup: { inline_keyboard: [[button]] } } : {}),
    }),
  }).catch(() => {});
}

/** Вебхук бота: /start login_<код> (вход), /start link_<код> (привязка), /stop и /on (уведомления). */
export async function POST(req: Request) {
  if (!process.env.TELEGRAM_WEBHOOK_SECRET || req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 401 });
  }
  const update = (await req.json().catch(() => ({}))) as Update;
  const msg = update.message;
  if (!msg?.text || msg.chat.type !== "private") return Response.json({ ok: true });

  const chatId = msg.chat.id;
  const username = msg.from?.username ?? null;
  const text = msg.text.trim();
  const admin = createAdminClient();
  if (!admin) return Response.json({ ok: true });

  const start = /^\/start(?:@\w+)?\s+(login|link)_([A-Za-z0-9]{16,64})$/.exec(text);
  if (start) {
    const [, kind, token] = start;
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: row } = await admin
      .from("telegram_tokens")
      .select("token, kind, user_id, chat_id")
      .eq("token", token)
      .gt("created_at", since)
      .maybeSingle();
    if (!row || row.kind !== kind || row.chat_id) {
      await reply(chatId, "Код устарел. Вернитесь на сайт и нажмите кнопку ещё раз / Код эскирген, сайттан кайра басыңыз.");
      return Response.json({ ok: true });
    }
    if (kind === "link") {
      const { data: taken } = await admin.from("telegram_links").select("user_id").eq("chat_id", chatId).maybeSingle();
      if (taken && taken.user_id !== row.user_id) {
        await reply(chatId, "Этот Telegram уже привязан к другому аккаунту / Бул Telegram башка аккаунтка байланган.");
        return Response.json({ ok: true });
      }
      await admin.from("telegram_links").upsert({ user_id: row.user_id, chat_id: chatId, username }, { onConflict: "user_id" });
      await admin.from("telegram_tokens").delete().eq("token", token);
      await reply(chatId, "✅ Telegram привязан. Теперь я буду писать, когда выйдут новые серии / Telegram байланды, жаңы сериялар чыкканда жазам.", {
        text: "kyranime.com",
        url: SITE_URL,
      });
    } else {
      await admin.from("telegram_tokens").update({ chat_id: chatId, tg_username: username }).eq("token", token);
      await reply(chatId, "✅ Вы подтвердили вход. Вернитесь на сайт / Кирүү ырасталды, сайтка кайтыңыз.", { text: "kyranime.com", url: SITE_URL });
    }
    return Response.json({ ok: true });
  }

  if (/^\/stop(@\w+)?$/.test(text) || /^\/on(@\w+)?$/.test(text)) {
    const on = text.startsWith("/on");
    const { data } = await admin.from("telegram_links").update({ notify: on }).eq("chat_id", chatId).select("user_id");
    await reply(
      chatId,
      !data || data.length === 0
        ? "Telegram не привязан к аккаунту. Привяжите его в профиле на сайте / Профилде байланыштырыңыз."
        : on
          ? "🔔 Уведомления включены / Билдирүүлөр күйгүзүлдү"
          : "🔕 Уведомления выключены. Включить: /on / Билдирүүлөр өчүрүлдү. Күйгүзүү: /on",
    );
    return Response.json({ ok: true });
  }

  await reply(
    chatId,
    "Саламатсызбы! Мен kyranime.com сайтынын боту. Профилде Telegram'ды байланыштырсаңыз, жаңы сериялар чыкканда жазам.\n\n/stop — билдирүүлөрдү өчүрүү\n/on — күйгүзүү\n\nПривет! Я бот сайта kyranime.com: пишу, когда выходят новые серии, если привязать Telegram в профиле.",
    { text: "kyranime.com", url: SITE_URL },
  );
  return Response.json({ ok: true });
}
