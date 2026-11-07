"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDict, getLocale } from "@/lib/i18n";
import { THEMES, type Theme } from "@/lib/theme";
import { createClient, getUser, isAdminEmail } from "@/lib/supabase/server";

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

export async function signOut() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/");
}

export async function submitReview(formData: FormData) {
  const supabase = await createClient();
  const user = await getUser();
  if (!supabase || !user) redirect("/login");

  const titleId = String(formData.get("title_id"));
  const slug = String(formData.get("slug"));
  const rating = Math.min(10, Math.max(1, Number(formData.get("rating")) || 0));
  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  if (!rating) return;

  await supabase
    .from("reviews")
    .upsert({ title_id: titleId, user_id: user.id, rating, body: body || null }, { onConflict: "title_id,user_id" });
  revalidatePath(`/anime/${slug}`);
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
    slug: String(formData.get("slug")).trim().toLowerCase(),
    title_ky: String(formData.get("title_ky")).trim(),
    title_ru: String(formData.get("title_ru")).trim(),
    title_orig: String(formData.get("title_orig") ?? "").trim() || null,
    description_ky: String(formData.get("description_ky") ?? "").trim() || null,
    description_ru: String(formData.get("description_ru") ?? "").trim() || null,
    poster_url: String(formData.get("poster_url") ?? "").trim() || null,
    year: Number(formData.get("year")) || null,
    genres,
    release_days: parseReleaseDays(formData),
    status: formData.get("status") === "completed" ? "completed" : "ongoing",
    dubbed_by: dubbedBy || null,
  }).select("id").single();
  if (error) redirect("/admin?error=title");
  // Если указана команда озвучки, сразу создаём для неё раздел (ошибку игнорируем: добавишь вручную)
  if (dubbedBy && created) {
    await supabase.from("dubs").insert({ title_id: created.id, studio_name: dubbedBy });
  }
  revalidateTag("catalog");
  revalidatePath("/");
  revalidatePath("/admin");
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
  const { data: dub } = await supabase.from("dubs").select("title_id").eq("id", dubId).maybeSingle();
  if (!dub) redirect("/admin?error=nodub");
  const titleId = dub.title_id as string;

  const { error } = await supabase.from("episodes").insert({
    title_id: titleId,
    dub_id: dubId,
    season: Number(formData.get("season")) || 1,
    number: Number(formData.get("number")),
    name_ky: String(formData.get("name_ky") ?? "").trim() || null,
    name_ru: String(formData.get("name_ru") ?? "").trim() || null,
    hls_url: hlsUrl,
    duration_sec: minutes > 0 ? Math.round(minutes * 60) : null,
  });
  if (error) redirect("/admin?error=episode");

  revalidateCatalogPages();
  redirect(`/admin/title/${titleId}`);
}

export async function updateEpisode(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id"));
  const hlsUrl = String(formData.get("hls_url") ?? "").trim();
  const minutes = Number(formData.get("duration_min"));

  if (!hlsUrl.startsWith("https://")) redirect(`/admin/episode/${id}?error=url`);
  const { data, error } = await supabase
    .from("episodes")
    .update({
      season: Number(formData.get("season")) || 1,
      number: Number(formData.get("number")),
      name_ky: String(formData.get("name_ky") ?? "").trim() || null,
      name_ru: String(formData.get("name_ru") ?? "").trim() || null,
      hls_url: hlsUrl,
      duration_sec: minutes > 0 ? Math.round(minutes * 60) : null,
      published: formData.get("published") === "on",
    })
    .eq("id", id)
    .select("title_id")
    .maybeSingle();
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
      poster_url: String(formData.get("poster_url") ?? "").trim() || null,
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
