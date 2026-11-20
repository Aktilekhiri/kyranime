"use server";

import { createHash } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { CHAT_ROOM_RE, REACTIONS, safeAspect } from "@/lib/social";
import type { ChatMessage } from "@/lib/types";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDict, getLocale } from "@/lib/i18n";
import { randomBytes } from "node:crypto";
import { createAdminClient, telegramAuthConfigured } from "@/lib/supabase/admin";
import { announceNewEpisode, announceNewTitle, notifySubscribers } from "@/lib/telegram";
import { THEMES, type Theme } from "@/lib/theme";
import { createClient, getUser, isAdminEmail } from "@/lib/supabase/server";

/** Показывает пользователю короткое сообщение об ошибке (баннер вверху страницы). */
/** Адрес тайтла: только латиница, цифры и дефисы («The Fragrant Flower» → the-fragrant-flower) */
function slugify(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

/** Ссылки на сообщения Telegram (t.me/...) не картинки: такой постер не покажется */
function cleanPosterUrl(raw: FormDataEntryValue | null): string | null {
  const url = String(raw ?? "").trim();
  if (!url || /^https?:\/\/(www\.)?t\.me\//i.test(url) || !/^https?:\/\//i.test(url)) return null;
  return url;
}

async function flashError(label: string, error: { message?: string; code?: string } | null | undefined) {
  if (!error) return;
  console.error(`[${label}]`, error);
  const store = await cookies();
  store.set("flash", encodeURIComponent(`${label}: ${error.message ?? "ошибка"}${error.code ? ` (${error.code})` : ""}`.slice(0, 220)), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
  });
}

export async function setLocale(locale: string, returnTo: string) {
  const store = await cookies();
  store.set("locale", locale === "ru" ? "ru" : "ky", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  redirect(safePath(returnTo));
}

export async function setTheme(theme: Theme, returnTo: string) {
  const store = await cookies();
  store.set("theme", THEMES.includes(theme) ? theme : "dark", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  redirect(safePath(returnTo));
}

/** Разрешаем только внутренние пути, чтобы не было открытого редиректа. */
function safePath(path: string): string {
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export type AuthState = { error?: string; info?: string } | undefined;

type Dictionary = ReturnType<typeof getDict>;

/** Переводим типичные ошибки Supabase на язык сайта. */
function authMessage(error: { code?: string; message: string }, t: Dictionary): string {
  const code = error.code ?? "";
  const msg = error.message.toLowerCase();
  if (code === "invalid_credentials" || msg.includes("invalid login")) return t.errCredentials;
  if (code === "email_not_confirmed" || msg.includes("not confirmed")) return t.errNotConfirmed;
  if (code === "user_already_exists" || msg.includes("already registered")) return t.errExists;
  if (code === "weak_password" || msg.includes("password")) return t.errPasswordShort;
  return t.errGeneric;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const t = getDict(await getLocale());
  const supabase = await createClient();
  if (!supabase) return { error: t.errGeneric };
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: authMessage(error, t) };
  redirect(safePath(String(formData.get("next") ?? "/")));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const t = getDict(await getLocale());
  const supabase = await createClient();
  if (!supabase) return { error: t.errGeneric };
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: t.errPasswordShort };
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? "").trim(),
    password,
  });
  if (error) return { error: authMessage(error, t) };
  // Если в Supabase включено подтверждение почты, сессии ещё нет: просим открыть письмо
  if (!data.session) return { info: t.checkEmail };
  redirect(safePath(String(formData.get("next") ?? "/")));
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const next = safePath(String(formData.get("next") ?? "/"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `https://${host}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/");
}

/** Оценка 1–10: одна на человека для тайтла (её можно менять). Комментарии пишутся отдельно, без ограничений. */
export async function submitReview(formData: FormData) {
  const supabase = await createClient();
  const user = await getUser();
  if (!supabase || !user) redirect("/login");

  const titleId = String(formData.get("title_id"));
  const slug = String(formData.get("slug"));
  const rating = Math.min(10, Math.max(1, Number(formData.get("rating")) || 0));
  if (!rating) return;

  const { error } = await supabase
    .from("reviews")
    .upsert({ title_id: titleId, user_id: user.id, rating }, { onConflict: "title_id,user_id" });
  await flashError("Оценка не сохранена", error);
  revalidatePath(`/anime/${slug}`);
}

/**
 * Комментарий к тайтлу (без season/number) или к серии. Количество не ограничено.
 * Если передан reply_to_id, это ответ: он привязывается к корневому комментарию.
 */
export async function addComment(formData: FormData) {
  const supabase = await createClient();
  const user = await getUser();
  if (!supabase || !user) redirect("/login");

  const titleId = String(formData.get("title_id"));
  const slug = String(formData.get("slug"));
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  if (!body) return;

  let season: number | null = null;
  let number: number | null = null;
  const rawNumber = formData.get("number");
  if (rawNumber !== null && Number.isInteger(Number(formData.get("season"))) && Number.isInteger(Number(rawNumber))) {
    season = Number(formData.get("season"));
    number = Number(rawNumber);
  }

  let parentId: string | null = null;
  let replyToId: string | null = null;
  const replyTo = String(formData.get("reply_to_id") ?? "");
  if (replyTo) {
    const { data: target } = await supabase
      .from("comments")
      .select("id, title_id, season, number, parent_id")
      .eq("id", replyTo)
      .maybeSingle();
    if (!target || target.title_id !== titleId) return;
    parentId = target.parent_id ?? target.id;
    replyToId = target.id;
    season = target.season;
    number = target.number;
  }

  // Защита от случайного двойного нажатия: тот же текст в течение 10 секунд не дублируем
  const { data: last } = await supabase
    .from("comments")
    .select("body, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last && last.body === body && Date.now() - new Date(last.created_at).getTime() < 10_000) return;

  const { error } = await supabase.from("comments").insert({
    user_id: user.id,
    title_id: titleId,
    season,
    number,
    body,
    ...(parentId ? { parent_id: parentId, reply_to_id: replyToId } : {}),
  });
  await flashError("Комментарий не отправлен", error);
  revalidatePath(`/anime/${slug}`);
  revalidatePath("/watch/[slug]/[ep]", "page");
}

/** Изменить свой комментарий (чужие менять нельзя: это проверяет база). */
export async function updateComment(formData: FormData) {
  const supabase = await createClient();
  const user = await getUser();
  if (!supabase || !user) redirect("/login");
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  if (!body) return;
  const { error } = await supabase
    .from("comments")
    .update({ body })
    .eq("id", String(formData.get("id")))
    .eq("user_id", user.id);
  await flashError("Комментарий не изменён (выполни SQL из supabase/edit.sql)", error);
  revalidatePath(`/anime/${String(formData.get("slug"))}`);
  revalidatePath("/watch/[slug]/[ep]", "page");
  revalidatePath("/profile");
}

/** Сменить ник: 3–24 символа, буквы, цифры, _ . - ; ник должен быть свободным. */
export async function updateUsername(formData: FormData) {
  const supabase = await createClient();
  const user = await getUser();
  if (!supabase || !user) redirect("/login");
  const name = String(formData.get("username") ?? "").trim();
  if (!/^[\p{L}\p{N}_.-]{3,24}$/u.test(name)) {
    await flashError("Ник: 3–24 символа, только буквы, цифры, _ . -", { message: "неверный формат" });
    return;
  }
  const { error } = await supabase.from("profiles").update({ username: name }).eq("id", user.id);
  if (error?.code === "23505") await flashError("Этот ник уже занят", { message: name });
  else await flashError("Ник не изменён", error);
  revalidatePath("/", "layout");
}

/** Поставить или снять реакцию (как в Telegram: каждую реакцию человек ставит один раз). */
export async function toggleReaction(formData: FormData) {
  const supabase = await createClient();
  const user = await getUser();
  if (!supabase || !user) redirect("/login");

  const commentId = String(formData.get("comment_id"));
  const emoji = String(formData.get("emoji"));
  if (!(REACTIONS as readonly string[]).includes(emoji)) return;

  const { data: existing } = await supabase
    .from("comment_reactions")
    .select("emoji")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("comment_reactions")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", user.id)
      .eq("emoji", emoji);
  } else {
    const { error } = await supabase.from("comment_reactions").insert({ comment_id: commentId, user_id: user.id, emoji });
    await flashError("Реакция не сохранена", error);
  }
  revalidatePath(`/anime/${String(formData.get("slug"))}`);
  revalidatePath("/watch/[slug]/[ep]", "page");
}

export type ChatSendResult =
  | { ok: true; message: ChatMessage }
  | { ok: false; error: "login" | "empty" | "wait" | "failed" };

/** Отправить сообщение в чат (общий, тайтла или серии). Не чаще одного сообщения в 2 секунды. */
export async function sendChat(room: string, text: string): Promise<ChatSendResult> {
  const supabase = await createClient();
  const user = await getUser();
  if (!supabase || !user) return { ok: false, error: "login" };
  if (!CHAT_ROOM_RE.test(room)) return { ok: false, error: "failed" };

  const body = text.trim().slice(0, 500);
  if (!body) return { ok: false, error: "empty" };

  const { data: last } = await supabase
    .from("chat_messages")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last && Date.now() - new Date(last.created_at).getTime() < 2000) return { ok: false, error: "wait" };

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ room, user_id: user.id, username: profile?.username ?? "user", body })
    .select("id, room, user_id, username, body, created_at")
    .single();
  if (error || !data) return { ok: false, error: "failed" };
  return { ok: true, message: data as ChatMessage };
}

/** Последние сообщения комнаты (запасной вариант, если realtime не подключился). */
export async function fetchChat(room: string): Promise<ChatMessage[]> {
  if (!CHAT_ROOM_RE.test(room)) return [];
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("chat_messages")
    .select("id, room, user_id, username, body, created_at")
    .eq("room", room)
    .order("created_at", { ascending: false })
    .limit(50);
  return ((data ?? []) as ChatMessage[]).reverse();
}

/** Более старые сообщения комнаты (до указанного времени), от старых к новым. Чат не удаляется, историю можно листать. */
export async function fetchOlderChat(room: string, before: string): Promise<ChatMessage[]> {
  if (!CHAT_ROOM_RE.test(room) || Number.isNaN(Date.parse(before))) return [];
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("chat_messages")
    .select("id, room, user_id, username, body, created_at")
    .eq("room", room)
    .lt("created_at", before)
    .order("created_at", { ascending: false })
    .limit(50);
  return ((data ?? []) as ChatMessage[]).reverse();
}

/** Удалить сообщение чата: своё или любое (админ). Права проверяет база (RLS). */
export async function deleteChatMessage(id: string): Promise<boolean> {
  const supabase = await createClient();
  const user = await getUser();
  if (!supabase || !user) return false;
  const { error } = await supabase.from("chat_messages").delete().eq("id", id);
  return !error;
}

/** Удалить комментарий: свой или любой (админ). Права проверяет база (RLS). */
export async function deleteComment(formData: FormData) {
  const supabase = await createClient();
  const user = await getUser();
  if (!supabase || !user) redirect("/login");
  await supabase.from("comments").delete().eq("id", String(formData.get("id")));
  revalidatePath(`/anime/${String(formData.get("slug"))}`);
  revalidatePath("/watch/[slug]/[ep]", "page");
  revalidatePath("/profile");
}

export async function toggleFavorite(formData: FormData) {
  const supabase = await createClient();
  const user = await getUser();
  if (!supabase || !user) redirect("/login");

  const titleId = String(formData.get("title_id"));
  const slug = String(formData.get("slug"));
  const active = formData.get("active") === "1";

  if (active) {
    await supabase.from("favorites").delete().eq("user_id", user.id).eq("title_id", titleId);
  } else {
    await supabase.from("favorites").upsert({ user_id: user.id, title_id: titleId });
  }
  revalidatePath(`/anime/${slug}`);
  revalidatePath("/profile");
}

export async function setListStatus(formData: FormData) {
  const supabase = await createClient();
  const user = await getUser();
  if (!supabase || !user) redirect("/login");

  const titleId = String(formData.get("title_id"));
  const slug = String(formData.get("slug"));
  const status = String(formData.get("status"));

  if (status === "none") {
    await supabase.from("title_lists").delete().eq("user_id", user.id).eq("title_id", titleId);
  } else if (["watching", "planned", "completed", "on_hold", "dropped"].includes(status)) {
    await supabase.from("title_lists").upsert({ user_id: user.id, title_id: titleId, status });
  }
  revalidatePath(`/anime/${slug}`);
  revalidatePath("/profile");
  revalidatePath("/list");
}

export async function saveProgress(episodeId: string, positionSec: number) {
  const supabase = await createClient();
  const user = await getUser();
  if (!supabase || !user) return;
  await supabase.from("watch_progress").upsert({
    user_id: user.id,
    episode_id: episodeId,
    position_sec: Math.max(0, Math.floor(positionSec)),
    updated_at: new Date().toISOString(),
  });
}

// ───────── Админка ─────────

async function requireAdmin() {
  const user = await getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/");
  return (await createClient())!;
}

/** Дни выхода серий из чекбоксов: числа 1–7 (1 = понедельник). */
function parseReleaseDays(formData: FormData): number[] {
  return [...new Set(formData.getAll("release_days").map(Number))]
    .filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)
    .sort((x, y) => x - y);
}

export async function addTitle(formData: FormData) {
  const supabase = await requireAdmin();
  const genres = String(formData.get("genres") ?? "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
  const dubbedBy = String(formData.get("dubbed_by") ?? "").trim();
  const { data: created, error } = await supabase.from("titles").insert({
    slug: slugify(String(formData.get("slug"))) || `title-${Date.now().toString(36)}`,
    title_ky: String(formData.get("title_ky")).trim(),
    title_ru: String(formData.get("title_ru")).trim(),
    title_orig: String(formData.get("title_orig") ?? "").trim() || null,
    description_ky: String(formData.get("description_ky") ?? "").trim() || null,
    description_ru: String(formData.get("description_ru") ?? "").trim() || null,
    poster_url: cleanPosterUrl(formData.get("poster_url")),
    year: Number(formData.get("year")) || null,
    genres,
    release_days: parseReleaseDays(formData),
    status: formData.get("status") === "completed" ? "completed" : "ongoing",
    dubbed_by: dubbedBy || null,
  }).select("id, slug, title_ky, title_ru, poster_url, description_ky, genres").single();
  if (error) redirect("/admin?error=title");
  // Если указана команда озвучки, сразу создаём для неё раздел (ошибку игнорируем: добавишь вручную)
  if (dubbedBy && created) {
    await supabase.from("dubs").insert({ title_id: created.id, studio_name: dubbedBy });
  }
  if (created && formData.get("notify") === "on") await announceNewTitle(created);
  revalidateTag("catalog");
  revalidatePath("/");
  revalidatePath("/admin");
}

/** «25:20», «1:02:03» или просто секунды → секунды; пусто или неверно → null */
function parseOutro(raw: FormDataEntryValue | null): number | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const parts = text.split(":").map((p) => Number(p));
  if (parts.length > 3 || parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  const sec = parts.reduce((acc, n) => acc * 60 + n, 0);
  return sec > 0 ? Math.round(sec) : null;
}

function revalidateCatalogPages() {
  revalidateTag("catalog");
  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/anime/[slug]", "page");
  revalidatePath("/watch/[slug]/[ep]", "page");
  revalidatePath("/admin");
}

export async function addEpisode(formData: FormData) {
  const supabase = await requireAdmin();
  const dubId = String(formData.get("dub_id") ?? "");
  const hlsUrl = String(formData.get("hls_url") ?? "").trim();
  const minutes = Number(formData.get("duration_min"));

  if (!hlsUrl.startsWith("https://")) redirect("/admin?error=url");
  const { data: dub } = await supabase.from("dubs").select("title_id, studio_name").eq("id", dubId).maybeSingle();
  if (!dub) redirect("/admin?error=nodub");
  const titleId = dub.title_id as string;

  const row = {
    title_id: titleId,
    dub_id: dubId,
    season: Number(formData.get("season")) || 1,
    number: Number(formData.get("number")),
    name_ky: String(formData.get("name_ky") ?? "").trim() || null,
    name_ru: String(formData.get("name_ru") ?? "").trim() || null,
    hls_url: hlsUrl,
    duration_sec: minutes > 0 ? Math.round(minutes * 60) : null,
  };
  let { error } = await supabase.from("episodes").insert({ ...row, aspect: safeAspect(String(formData.get("aspect"))) });
  // Если колонки aspect ещё нет (SQL не выполнен), добавляем без неё
  if (error) ({ error } = await supabase.from("episodes").insert(row));
  if (error) redirect("/admin?error=episode");

  if (formData.get("notify") === "on") {
    const { data: t } = await supabase
      .from("titles")
      .select("slug, title_ky, title_ru, poster_url")
      .eq("id", titleId)
      .maybeSingle();
    if (t) {
      const ep = { season: row.season, number: row.number, dub_id: dubId };
      const dubName = (dub.studio_name as string) ?? null;
      await announceNewEpisode(t, ep, dubName);
      await notifySubscribers(titleId, t, ep, dubName);
    }
  }

  revalidateCatalogPages();
  redirect(`/admin/title/${titleId}`);
}

export async function updateEpisode(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id"));
  const hlsUrl = String(formData.get("hls_url") ?? "").trim();
  const minutes = Number(formData.get("duration_min"));

  if (!hlsUrl.startsWith("https://")) redirect(`/admin/episode/${id}?error=url`);
  const fields = {
    season: Number(formData.get("season")) || 1,
    number: Number(formData.get("number")),
    name_ky: String(formData.get("name_ky") ?? "").trim() || null,
    name_ru: String(formData.get("name_ru") ?? "").trim() || null,
    hls_url: hlsUrl,
    duration_sec: minutes > 0 ? Math.round(minutes * 60) : null,
    published: formData.get("published") === "on",
  };
  const save = (values: Record<string, unknown>) =>
    supabase.from("episodes").update(values).eq("id", id).select("title_id").maybeSingle();
  const extra = { aspect: safeAspect(String(formData.get("aspect"))), outro_sec: parseOutro(formData.get("outro")) };
  let { data, error } = await save({ ...fields, ...extra });
  // Если новых колонок ещё нет (SQL не выполнен), сохраняем без них по очереди
  if (error) ({ data, error } = await save({ ...fields, aspect: extra.aspect }));
  if (error) ({ data, error } = await save(fields));
  if (error || !data) redirect(`/admin/episode/${id}?error=save`);

  revalidateCatalogPages();
  redirect(`/admin/title/${data.title_id}`);
}

export async function deleteEpisode(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id"));
  const titleId = String(formData.get("title_id"));
  if (formData.get("confirm") !== "yes") redirect(`/admin/episode/${id}?error=confirm`);

  const { error } = await supabase.from("episodes").delete().eq("id", id);
  if (error) redirect(`/admin/episode/${id}?error=save`);

  revalidateCatalogPages();
  redirect(`/admin/title/${titleId}`);
}

function cleanStudioUrl(formData: FormData): string | null | undefined {
  const raw = String(formData.get("studio_url") ?? "").trim();
  if (!raw) return null;
  return raw.startsWith("https://") ? raw : undefined; // undefined = неверная ссылка
}

export async function addDub(formData: FormData) {
  const supabase = await requireAdmin();
  const titleId = String(formData.get("title_id"));
  const name = String(formData.get("studio_name") ?? "").trim();
  const url = cleanStudioUrl(formData);
  if (!name || url === undefined) redirect(`/admin/title/${titleId}?error=dub`);

  const { error } = await supabase
    .from("dubs")
    .insert({ title_id: titleId, studio_name: name, studio_url: url, sort: Number(formData.get("sort")) || 0 });
  if (error) redirect(`/admin/title/${titleId}?error=dubsave`);

  revalidateCatalogPages();
  redirect(`/admin/title/${titleId}`);
}

export async function updateDub(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id"));
  const titleId = String(formData.get("title_id"));
  const name = String(formData.get("studio_name") ?? "").trim();
  const url = cleanStudioUrl(formData);
  if (!name || url === undefined) redirect(`/admin/title/${titleId}?error=dub`);

  const { error } = await supabase
    .from("dubs")
    .update({
      studio_name: name,
      studio_url: url,
      sort: Number(formData.get("sort")) || 0,
      published: formData.get("published") === "on",
    })
    .eq("id", id);
  if (error) redirect(`/admin/title/${titleId}?error=dubsave`);

  revalidateCatalogPages();
  redirect(`/admin/title/${titleId}`);
}

export async function deleteDub(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id"));
  const titleId = String(formData.get("title_id"));
  if (formData.get("confirm") !== "yes") redirect(`/admin/title/${titleId}?error=dubconfirm`);

  const { error } = await supabase.from("dubs").delete().eq("id", id);
  if (error) redirect(`/admin/title/${titleId}?error=dubsave`);

  revalidateCatalogPages();
  redirect(`/admin/title/${titleId}`);
}

export async function deleteReview(formData: FormData) {
  const supabase = await requireAdmin();
  await supabase.from("reviews").delete().eq("id", String(formData.get("id")));
  revalidatePath(`/anime/${String(formData.get("slug"))}`);
}

export async function updateTitle(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id"));
  const genres = String(formData.get("genres") ?? "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);

  const { data } = await supabase
    .from("titles")
    .update({
      title_ky: String(formData.get("title_ky")).trim(),
      title_ru: String(formData.get("title_ru")).trim(),
      title_orig: String(formData.get("title_orig") ?? "").trim() || null,
      description_ky: String(formData.get("description_ky") ?? "").trim() || null,
      description_ru: String(formData.get("description_ru") ?? "").trim() || null,
      poster_url: cleanPosterUrl(formData.get("poster_url")),
      year: Number(formData.get("year")) || null,
      genres,
      release_days: parseReleaseDays(formData),
      status: formData.get("status") === "completed" ? "completed" : "ongoing",
      dubbed_by: String(formData.get("dubbed_by") ?? "").trim() || null,
    })
    .eq("id", id)
    .select("slug")
    .maybeSingle();

  revalidateTag("catalog");
  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/admin");
  if (data?.slug) revalidatePath(`/anime/${data.slug}`);
  redirect("/admin");
}

export type PosterState = { ok?: boolean; error?: string; url?: string };

const POSTER_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Загрузка постера в Supabase Storage (bucket "posters") и запись ссылки в тайтл. */
export async function uploadPoster(formData: FormData): Promise<PosterState> {
  const supabase = await requireAdmin();
  const titleId = String(formData.get("title_id") ?? "");
  const file = formData.get("poster");

  if (!(file instanceof File) || file.size === 0) return { error: "Файл не выбран" };
  const ext = POSTER_TYPES[file.type];
  if (!ext) return { error: "Нужна картинка JPG, PNG или WebP" };
  if (file.size > 3 * 1024 * 1024) return { error: "Файл больше 3 МБ" };

  const path = `${titleId}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("posters")
    .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (upErr) return { error: `Не удалось загрузить: ${upErr.message}` };

  const { data: pub } = supabase.storage.from("posters").getPublicUrl(path);
  const { data: title, error: dbErr } = await supabase
    .from("titles")
    .update({ poster_url: pub.publicUrl })
    .eq("id", titleId)
    .select("slug")
    .maybeSingle();
  if (dbErr) return { error: `Файл загружен, но ссылка не сохранилась: ${dbErr.message}` };

  revalidateTag("catalog");
  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/admin");
  if (title?.slug) revalidatePath(`/anime/${title.slug}`);
  return { ok: true, url: pub.publicUrl };
}

export type BunnyUploadAuth =
  | { ok: true; videoId: string; libraryId: string; expirationTime: number; signature: string; playUrl: string }
  | { ok: false; error: "forbidden" | "config" | "failed" };

/**
 * Готовит загрузку видео в Bunny прямо из браузера админа.
 * Секретный ключ библиотеки (BUNNY_API_KEY) остаётся на сервере: браузер получает только подпись на одно видео.
 */
export async function createBunnyUpload(fileName: string): Promise<BunnyUploadAuth> {
  const user = await getUser();
  if (!user || !isAdminEmail(user.email)) return { ok: false, error: "forbidden" };

  const apiKey = process.env.BUNNY_API_KEY?.trim();
  const libraryId = process.env.BUNNY_LIBRARY_ID?.trim();
  if (!apiKey || !libraryId || !/^\d+$/.test(libraryId)) return { ok: false, error: "config" };

  const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
    method: "POST",
    headers: { AccessKey: apiKey, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ title: fileName.trim().slice(0, 200) || "video" }),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, error: "failed" };
  const video = (await res.json()) as { guid?: string };
  if (!video.guid || !/^[0-9a-f-]{36}$/i.test(video.guid)) return { ok: false, error: "failed" };

  const expirationTime = Math.floor(Date.now() / 1000) + 6 * 3600; // 6 часов на загрузку
  const signature = createHash("sha256")
    .update(`${libraryId}${apiKey}${expirationTime}${video.guid}`)
    .digest("hex");

  return {
    ok: true,
    videoId: video.guid,
    libraryId,
    expirationTime,
    signature,
    playUrl: `https://player.mediadelivery.net/play/${libraryId}/${video.guid}`,
  };
}

/** Скрыть тайтл с сайта или вернуть. Скрытый тайтл видит только админ. */
export async function setTitleHidden(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const hidden = formData.get("hidden") === "1";
  const { error } = await supabase.from("titles").update({ hidden }).eq("id", id);
  if (error) {
    await flashError("Не удалось скрыть. Выполни SQL из файла supabase/hidden.sql", error);
    return;
  }
  revalidateCatalogPages();
}

export type AvatarState = { ok?: boolean; error?: string; url?: string };

/** Стираем все файлы пользователя в bucket "avatars" (у каждого своя папка с именем = id). */
async function wipeAvatarFiles(supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>, userId: string) {
  const { data } = await supabase.storage.from("avatars").list(userId, { limit: 100 });
  const paths = (data ?? []).map((f) => `${userId}/${f.name}`);
  if (paths.length) await supabase.storage.from("avatars").remove(paths);
}

/** Загрузка своей аватарки (браузер заранее сжимает фото до 256×256). */
export async function uploadAvatar(formData: FormData): Promise<AvatarState> {
  const supabase = await createClient();
  const user = await getUser();
  if (!supabase || !user) return { error: "Нужно войти" };
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Файл не выбран" };
  if (file.type !== "image/jpeg") return { error: "Нужна картинка JPG" };
  if (file.size > 600 * 1024) return { error: "Файл слишком большой" };

  await wipeAvatarFiles(supabase, user.id);
  const path = `${user.id}/${Date.now()}.jpg`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, file, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (upErr) return { error: `Не удалось загрузить: ${upErr.message} (выполни SQL из supabase/avatars.sql)` };

  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
  const { error } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", user.id);
  if (error) return { error: `Файл загружен, но ссылка не сохранилась: ${error.message}` };
  revalidatePath("/", "layout");
  return { ok: true, url: pub.publicUrl };
}

/** Убрать аватарку: свою или (админ) чужую, если передан user_id. */
export async function removeAvatar(formData: FormData) {
  const supabase = await createClient();
  const user = await getUser();
  if (!supabase || !user) redirect("/login");
  const target = String(formData.get("user_id") ?? "") || user.id;
  if (target !== user.id && !isAdminEmail(user.email)) return;
  await wipeAvatarFiles(supabase, target);
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", target);
  await flashError("Аватарка не удалена (выполни SQL из supabase/avatars.sql)", error);
  revalidatePath("/", "layout");
}

/** Ники и аватарки по id (для чата): запрос идёт через сервер, а не из браузера в базу. */
export async function getProfilesByIds(ids: string[]): Promise<{ id: string; username: string; avatar_url: string | null }[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const clean = ids.filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 100);
  if (clean.length === 0) return [];
  const { data } = await supabase.from("profiles").select("id, username, avatar_url").in("id", clean);
  return data ?? [];
}

// ───────── Telegram: вход, привязка, уведомления ─────────

const BOT = process.env.TELEGRAM_BOT_USERNAME || "kyranime_bot";

export type TgStart = { token: string; url: string } | { error: string };

async function newToken(kind: "login" | "link", userId: string | null): Promise<TgStart> {
  const admin = createAdminClient();
  if (!admin || !telegramAuthConfigured()) return { error: "Нет переменных Telegram/Supabase в Vercel" };
  const token = randomBytes(18).toString("hex");
  // Заодно чистим старые коды
  await admin.from("telegram_tokens").delete().lt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
  const { error } = await admin.from("telegram_tokens").insert({ token, kind, user_id: userId });
  if (error) {
    console.error("[telegram] newToken", error);
    // Подсказка для админа: чаще всего не выполнен supabase/telegram.sql или неверный ключ service_role
    return { error: error.code === "42P01" || /relation|does not exist|schema cache/i.test(error.message) ? "Не выполнен SQL telegram.sql в Supabase" : /jwt|api key|invalid/i.test(error.message) ? "Неверный SUPABASE_SERVICE_ROLE_KEY в Vercel" : error.message };
  }
  return { token, url: `https://t.me/${BOT}?start=${kind}_${token}` };
}

export async function startTelegramLogin(): Promise<TgStart> {
  return newToken("login", null);
}

export async function startTelegramLink(): Promise<TgStart> {
  const user = await getUser();
  if (!user) return { error: "Сначала войдите" };
  return newToken("link", user.id);
}

/** Опрашивается страницей входа: когда человек нажал Start в боте, создаём/находим аккаунт и входим. */
export async function checkTelegramLogin(token: string): Promise<"pending" | "ok" | "error"> {
  const admin = createAdminClient();
  const supabase = await createClient();
  if (!admin || !supabase || !/^[a-f0-9]{36}$/.test(token)) return "error";
  const { data: row } = await admin
    .from("telegram_tokens")
    .select("token, kind, chat_id, tg_username, created_at")
    .eq("token", token)
    .maybeSingle();
  if (!row || row.kind !== "login" || Date.now() - new Date(row.created_at).getTime() > 10 * 60 * 1000) return "error";
  if (!row.chat_id) return "pending";

  // Код одноразовый: удаляем сразу, повторно им войти нельзя
  const { data: gone } = await admin.from("telegram_tokens").delete().eq("token", token).select("token");
  if (!gone || gone.length === 0) return "error";

  const chatId = Number(row.chat_id);
  const email = `tg${chatId}@telegram.kyranime.com`;
  const { data: link } = await admin.from("telegram_links").select("user_id").eq("chat_id", chatId).maybeSingle();

  let loginEmail = email;
  if (link) {
    const { data: u } = await admin.auth.admin.getUserById(link.user_id);
    if (u.user?.email) loginEmail = u.user.email;
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (error && !/already|registered|exists/i.test(error.message)) return "error";
    const uid = created?.user?.id;
    if (uid) {
      await admin.from("telegram_links").upsert({ user_id: uid, chat_id: chatId, username: row.tg_username }, { onConflict: "user_id" });
      // Ник как в Telegram, если он подходит и свободен; иначе остаётся автоматический
      const nick = row.tg_username ?? "";
      if (/^[A-Za-z0-9_.-]{3,24}$/.test(nick)) await admin.from("profiles").update({ username: nick }).eq("id", uid);
    }
  }

  const { data: gen, error: genErr } = await admin.auth.admin.generateLink({ type: "magiclink", email: loginEmail });
  const hash = gen?.properties?.hashed_token;
  if (genErr || !hash) return "error";
  const { error: verr } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: hash });
  return verr ? "error" : "ok";
}

export async function unlinkTelegram() {
  const supabase = await createClient();
  const user = await getUser();
  const admin = createAdminClient();
  if (!supabase || !user || !admin) return;
  await admin.from("telegram_links").delete().eq("user_id", user.id);
  revalidatePath("/profile");
}

export async function setTelegramNotify(formData: FormData) {
  const user = await getUser();
  const admin = createAdminClient();
  if (!user || !admin) return;
  await admin.from("telegram_links").update({ notify: formData.get("on") === "1" }).eq("user_id", user.id);
  revalidatePath("/profile");
}
