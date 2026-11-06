"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

/** Разрешаем только внутренние пути, чтобы не было открытого редиректа. */
function safePath(path: string): string {
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export type AuthState = { error?: string } | undefined;

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured" };
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: error.message };
  redirect(safePath(String(formData.get("next") ?? "/")));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  if (!supabase) return { error: "Supabase is not configured" };
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password,
  });
  if (error) return { error: error.message };
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

export async function addTitle(formData: FormData) {
  const supabase = await requireAdmin();
  const genres = String(formData.get("genres") ?? "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
  await supabase.from("titles").insert({
    slug: String(formData.get("slug")).trim().toLowerCase(),
    title_ky: String(formData.get("title_ky")).trim(),
    title_ru: String(formData.get("title_ru")).trim(),
    title_orig: String(formData.get("title_orig") ?? "").trim() || null,
    description_ky: String(formData.get("description_ky") ?? "").trim() || null,
    description_ru: String(formData.get("description_ru") ?? "").trim() || null,
    poster_url: String(formData.get("poster_url") ?? "").trim() || null,
    year: Number(formData.get("year")) || null,
    genres,
    status: formData.get("status") === "completed" ? "completed" : "ongoing",
    dubbed_by: String(formData.get("dubbed_by") ?? "").trim() || null,
  });
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function addEpisode(formData: FormData) {
  const supabase = await requireAdmin();
  await supabase.from("episodes").insert({
    title_id: String(formData.get("title_id")),
    season: Number(formData.get("season")) || 1,
    number: Number(formData.get("number")),
    name_ky: String(formData.get("name_ky") ?? "").trim() || null,
    name_ru: String(formData.get("name_ru") ?? "").trim() || null,
    hls_url: String(formData.get("hls_url")).trim(),
    duration_sec: Number(formData.get("duration_min")) ? Number(formData.get("duration_min")) * 60 : null,
  });
  revalidatePath("/admin");
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
      status: formData.get("status") === "completed" ? "completed" : "ongoing",
      dubbed_by: String(formData.get("dubbed_by") ?? "").trim() || null,
    })
    .eq("id", id)
    .select("slug")
    .maybeSingle();

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

  revalidatePath("/");
  revalidatePath("/catalog");
  revalidatePath("/admin");
  if (title?.slug) revalidatePath(`/anime/${title.slug}`);
  return { ok: true, url: pub.publicUrl };
}
