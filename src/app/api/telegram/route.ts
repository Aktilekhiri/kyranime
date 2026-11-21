import { createAdminClient } from "@/lib/supabase/admin";
import { listLatestEpisodes, listTitles } from "@/lib/data";
import { WEEKDAYS } from "@/lib/i18n";
import { daysUntilRelease } from "@/lib/ranks";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function tg(method: string, body: Record<string, unknown>) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

/** Сообщение с HTML-разметкой и (по желанию) кнопкой. */
const html = (chatId: number, text: string, button?: { text: string; url: string }) =>
  tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(button ? { reply_markup: { inline_keyboard: [[button]] } } : {}),
  });

const HELP =
  "Саламатсызбы! Бул kyranime.com сайтынын боту.\n\n" +
  "/random — кокус аниме\n/ongoing — онгоингдерге жазылуу\n/list — менин тизмем\n/history — акыркы чыккан сериялар\n/upcoming — бүгүн кандай серия чыгат\n/calendar — жумалык расписание\n" +
  "/bug <текст> — ката жөнүндө жазуу\n/on, /stop — билдирүүлөрдү күйгүзүү / өчүрүү\n\n" +
  "Привет! Это бот сайта kyranime.com. Команды выше: случайное аниме, подписка на онгоинги (/ongoing), ваш список (/list), последние серии, расписание на сегодня и неделю, /bug — сообщить об ошибке, /on и /stop — уведомления (нужно привязать Telegram в профиле).";

type Admin = NonNullable<ReturnType<typeof createAdminClient>>;
const ONGOING_TEXT =
  "📡 <b>Онгоингдер</b>\nБаскычты басыңыз: аниме «Көрүп жатам» тизмесине кошулат, жаңы серия чыкканда өзүм жазам. Дагы бир жолу бассаңыз, алынып салынат.\n\nНажмите на тайтл, чтобы подписаться на новые серии (повторное нажатие отменяет). Нужен привязанный Telegram.";

/** Кнопки онгоингов: ✅ если тайтл уже в «Смотрю»/«В планах», ➕ если нет. */
async function ongoingKeyboard(admin: Admin, chatId: number) {
  const ongoing = (await listTitles()).filter((x) => x.status === "ongoing").slice(0, 25);
  const { data: link } = await admin.from("telegram_links").select("user_id").eq("chat_id", chatId).maybeSingle();
  const mine = new Set<string>();
  if (link) {
    const { data } = await admin.from("title_lists").select("title_id").eq("user_id", link.user_id).in("status", ["watching", "planned"]).in("title_id", ongoing.map((t) => t.id));
    for (const r of data ?? []) mine.add(r.title_id as string);
  }
  return { inline_keyboard: ongoing.map((t) => [{ text: `${mine.has(t.id) ? "✅" : "➕"} ${t.title_ky}`.slice(0, 60), callback_data: `s:${t.id}` }]) };
}

async function onCallback(cq: NonNullable<Update["callback_query"]>, admin: Admin) {
  const chatId = cq.message?.chat.id;
  const m = /^s:([0-9a-f-]{36})$/.exec(cq.data ?? "");
  if (!chatId || !m) return tg("answerCallbackQuery", { callback_query_id: cq.id });
  const { data: link } = await admin.from("telegram_links").select("user_id").eq("chat_id", chatId).maybeSingle();
  if (!link) return tg("answerCallbackQuery", { callback_query_id: cq.id, show_alert: true, text: "Алгач профилде Telegram'ды байланыштырыңыз / Сначала привяжите Telegram в профиле на сайте" });
  const { data: cur } = await admin.from("title_lists").select("status").eq("user_id", link.user_id).eq("title_id", m[1]).maybeSingle();
  const on = cur?.status === "watching" || cur?.status === "planned";
  if (on) await admin.from("title_lists").delete().eq("user_id", link.user_id).eq("title_id", m[1]);
  else await admin.from("title_lists").upsert({ user_id: link.user_id, title_id: m[1], status: "watching" });
  await tg("answerCallbackQuery", { callback_query_id: cq.id, text: on ? "Алынып салынды / Убрано" : "Кошулду, жаңы серия чыкканда жазам / Добавлено" });
  if (cq.message) await tg("editMessageReplyMarkup", { chat_id: chatId, message_id: cq.message.message_id, reply_markup: await ongoingKeyboard(admin, chatId) });
}

/** Простые команды без привязки аккаунта. Возвращает true, если команда обработана. */
async function command(chatId: number, name: string, arg: string, admin: NonNullable<ReturnType<typeof createAdminClient>>, username: string | null): Promise<boolean> {
  if (name === "help" || name === "menu") {
    await html(chatId, esc(HELP), { text: "kyranime.com", url: SITE_URL });
    return true;
  }
  if (name === "random") {
    const { data } = await admin.from("titles").select("slug, title_ky, poster_url, description_ky");
    const t = data && data.length ? data[Math.floor(Math.random() * data.length)] : null;
    if (!t) return await html(chatId, "Азырынча аниме жок / Пока нет аниме"), true;
    const about = (t.description_ky ?? "").trim();
    const caption = `🎲 <b>${esc(t.title_ky)}</b>` + (about ? `\n\n${esc(about.length > 250 ? about.slice(0, 247) + "…" : about)}` : "");
    const markup = { inline_keyboard: [[{ text: "Ачуу", url: `${SITE_URL}/anime/${t.slug}` }]] };
    if (t.poster_url && /^https:\/\//.test(t.poster_url)) {
      await tg("sendPhoto", { chat_id: chatId, photo: t.poster_url, caption, parse_mode: "HTML", reply_markup: markup });
    } else {
      await tg("sendMessage", { chat_id: chatId, text: caption, parse_mode: "HTML", reply_markup: markup });
    }
    return true;
  }
  if (name === "history") {
    const eps = await listLatestEpisodes(10);
    const text = eps.length
      ? "🕘 <b>Акыркы чыккан сериялар</b>\n\n" +
        eps.map((e) => `• <a href="${SITE_URL}/watch/${e.slug}/${e.season}-${e.number}">${esc(e.title_ky)}</a> — ${e.season > 1 ? `${e.season}-сезон, ` : ""}${e.number}-серия`).join("\n")
      : "Азырынча серия жок / Серий пока нет";
    await html(chatId, text);
    return true;
  }
  if (name === "upcoming" || name === "calendar") {
    const ongoing = (await listTitles()).filter((x) => x.status === "ongoing");
    const today = [1, 2, 3, 4, 5, 6, 7].find((d) => daysUntilRelease([d]) === 0) ?? 0;
    const line = (x: { slug: string; title_ky: string }) => `• <a href="${SITE_URL}/anime/${x.slug}">${esc(x.title_ky)}</a>`;
    const days = name === "upcoming" ? [today] : [1, 2, 3, 4, 5, 6, 7];
    const parts = days.map((d) => {
      const list = ongoing.filter((x) => (x.release_days ?? []).includes(d));
      return `<b>${WEEKDAYS.ky[d - 1]}${d === today ? " · бүгүн" : ""}</b>\n` + (list.length ? list.map(line).join("\n") : "—");
    });
    await html(chatId, `📅 ${parts.join("\n\n")}`);
    return true;
  }
  if (name === "ongoing") {
    await tg("sendMessage", { chat_id: chatId, text: ONGOING_TEXT, parse_mode: "HTML", reply_markup: await ongoingKeyboard(admin, chatId) });
    return true;
  }
  if (name === "list") {
    const { data: link } = await admin.from("telegram_links").select("user_id").eq("chat_id", chatId).maybeSingle();
    if (!link) return await html(chatId, "Алгач профилде Telegram'ды байланыштырыңыз / Сначала привяжите Telegram в профиле на сайте"), true;
    const { data } = await admin.from("title_lists").select("status, titles(slug, title_ky)").eq("user_id", link.user_id).in("status", ["watching", "planned"]).order("created_at", { ascending: false }).limit(60);
    const groups: Record<string, string[]> = { watching: [], planned: [] };
    for (const r of data ?? []) {
      const t = r.titles as unknown as { slug: string; title_ky: string } | { slug: string; title_ky: string }[] | null;
      const title = Array.isArray(t) ? t[0] : t;
      if (title) groups[r.status as string]?.push(`• <a href="${SITE_URL}/anime/${title.slug}">${esc(title.title_ky)}</a>`);
    }
    const parts = [
      groups.watching.length ? `▶️ <b>Көрүп жатам</b>\n${groups.watching.join("\n")}` : "",
      groups.planned.length ? `📌 <b>Көрөм</b>\n${groups.planned.join("\n")}` : "",
    ].filter(Boolean);
    await html(chatId, parts.length ? parts.join("\n\n") : "Тизме бош. /ongoing аркылуу кошуңуз / Список пуст. Добавьте через /ongoing");
    return true;
  }
  if (name === "bug") {
    if (!arg) return await html(chatId, "Катаны жазыңыз: /bug <текст>\nНапишите: /bug <описание ошибки>"), true;
    // Куда слать: TELEGRAM_ADMIN_CHAT_ID, иначе привязанный Telegram админа (по ADMIN_EMAIL)
    let target: number | null = process.env.TELEGRAM_ADMIN_CHAT_ID ? Number(process.env.TELEGRAM_ADMIN_CHAT_ID) : null;
    if (!target && process.env.ADMIN_EMAIL) {
      const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const a = users?.users.find((u) => u.email?.toLowerCase() === process.env.ADMIN_EMAIL!.trim().toLowerCase());
      if (a) {
        const { data: link } = await admin.from("telegram_links").select("chat_id").eq("user_id", a.id).maybeSingle();
        target = (link?.chat_id as number | undefined) ?? null;
      }
    }
    if (target) await html(target, `🐞 <b>Ката жөнүндө билдирүү</b>${username ? ` от @${esc(username)}` : ""}\n\n${esc(arg.slice(0, 1500))}`);
    await html(chatId, target ? "Рахмат! Жөнөтүлдү / Спасибо, отправлено" : "Азыр жөнөтө албадым / Сейчас не получилось отправить");
    return true;
  }
  return false;
}

type Update = { callback_query?: { id: string; data?: string; message?: { message_id: number; chat: { id: number } } }; message?: { text?: string; chat: { id: number; type: string }; from?: { username?: string } } };

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
  if (update.callback_query) {
    const adminCb = createAdminClient();
    if (adminCb) await onCallback(update.callback_query, adminCb);
    return Response.json({ ok: true });
  }
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

  const cmd = /^\/(\w+)(?:@\w+)?(?:\s+([\s\S]*))?$/.exec(text);
  if (cmd && (await command(chatId, cmd[1].toLowerCase(), (cmd[2] ?? "").trim(), admin, username))) return Response.json({ ok: true });

  await reply(
    chatId,
    "Саламатсызбы! Мен kyranime.com сайтынын боту. Профилде Telegram'ды байланыштырсаңыз, жаңы сериялар чыкканда жазам.\n\n/stop — билдирүүлөрдү өчүрүү\n/on — күйгүзүү\n\nПривет! Я бот сайта kyranime.com: пишу, когда выходят новые серии, если привязать Telegram в профиле.",
    { text: "kyranime.com", url: SITE_URL },
  );
  return Response.json({ ok: true });
}
