import { SITE_URL } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/admin";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Канал, куда бот публикует новости. Можно переопределить переменной TELEGRAM_CHANNEL (@имя или числовой id). */
const CHANNEL = process.env.TELEGRAM_CHANNEL || "@kyranime";

async function call(method: string, body: Record<string, unknown>): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) console.error("[telegram]", method, res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("[telegram]", method, e);
    return false;
  }
}

/** Пост в канал: постер (если есть) + подпись + кнопка. Ошибки не бросает: сайт работает и без Telegram. */
async function postToChannel(opts: { poster: string | null; html: string; buttonText?: string; url?: string; chat?: string | number }): Promise<boolean> {
  const reply_markup = opts.buttonText && opts.url ? { inline_keyboard: [[{ text: opts.buttonText, url: opts.url }]] } : undefined;
  const photo = opts.poster && /^https:\/\//.test(opts.poster) ? opts.poster : null;
  if (photo) {
    const ok = await call("sendPhoto", { chat_id: opts.chat ?? CHANNEL, photo, caption: opts.html.slice(0, 1000), parse_mode: "HTML", reply_markup });
    if (ok) return true; // если картинка не прошла, ниже отправим просто текстом
  }
  return call("sendMessage", { chat_id: opts.chat ?? CHANNEL, text: opts.html, parse_mode: "HTML", reply_markup, link_preview_options: { is_disabled: true } });
}

type TitleInfo = { slug: string; title_ky: string; title_ru: string; poster_url: string | null; description_ky?: string | null; genres?: string[] };

export function announceNewEpisode(title: TitleInfo, ep: { season: number; number: number; dub_id: string | null }, dubName: string | null) {
  const html =
    `🆕 <b>Жаңы серия!</b>\n\n<b>${esc(title.title_ky)}</b>\n` +
    `${ep.season > 1 ? `${ep.season}-сезон, ` : ""}${ep.number}-серия` +
    (dubName ? `\n🎙 Озвучка: ${esc(dubName)}` : "");
  const url = `${SITE_URL}/watch/${title.slug}/${ep.season}-${ep.number}${ep.dub_id ? `?dub=${ep.dub_id}` : ""}`;
  return postToChannel({ poster: title.poster_url, html, buttonText: "▶ Көрүү", url });
}

export function announceNewTitle(title: TitleInfo, chat?: string | number) {
  const about = (title.description_ky || "").trim();
  const html =
    `✨ <b>Сайтка жаңы аниме кошулду!</b>\n\n<b>${esc(title.title_ky)}</b>` +
    (about ? `\n\n${esc(about.length > 300 ? about.slice(0, 297) + "…" : about)}` : "");
  return postToChannel({ poster: title.poster_url, html, buttonText: "Ачуу", url: `${SITE_URL}/anime/${title.slug}`, chat });
}

/** Личные сообщения тем, у кого тайтл в избранном, «Смотрю» или «В планах», если Telegram привязан и уведомления включены. */
export async function notifySubscribers(titleId: string, title: TitleInfo, ep: { season: number; number: number; dub_id: string | null }, dubName: string | null) {
  const admin = createAdminClient();
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!admin || !token) return;
  try {
    const ids = new Set<string>();
    const fav = await admin.from("favorites").select("user_id").eq("title_id", titleId);
    for (const r of fav.data ?? []) ids.add(r.user_id);
    const lists = await admin.from("title_lists").select("user_id, status").eq("title_id", titleId).in("status", ["watching", "planned"]);
    for (const r of lists.data ?? []) ids.add(r.user_id);
    if (ids.size === 0) return;
    const { data: links } = await admin.from("telegram_links").select("chat_id").in("user_id", [...ids]).eq("notify", true);
    const text =
      `🆕 <b>${esc(title.title_ky)}</b>\n${ep.season > 1 ? `${ep.season}-сезон, ` : ""}${ep.number}-серия чыкты!` +
      (dubName ? `\n🎙 ${esc(dubName)}` : "") +
      `\n\n/stop — билдирүүлөрдү өчүрүү`;
    const url = `${SITE_URL}/watch/${title.slug}/${ep.season}-${ep.number}${ep.dub_id ? `?dub=${ep.dub_id}` : ""}`;
    const chats = (links ?? []).map((l) => l.chat_id as number);
    for (let i = 0; i < chats.length; i += 20) {
      await Promise.all(
        chats.slice(i, i + 20).map((chat_id) =>
          call("sendMessage", { chat_id, text, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "▶ Көрүү", url }]] } }),
        ),
      );
    }
  } catch (e) {
    console.error("[telegram] notifySubscribers", e);
  }
}

/** Своё сообщение в канал (из админки): простой текст, картинка и кнопка по желанию. */
export function postCustomToChannel(opts: { text: string; image: string | null; buttonText?: string; url?: string }) {
  return postToChannel({ poster: opts.image, html: esc(opts.text), buttonText: opts.buttonText, url: opts.url });
}
