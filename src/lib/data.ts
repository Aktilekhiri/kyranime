import { DEMO_EPISODES, DEMO_TITLES } from "./demo";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "./supabase/public";
import { createClient, isSupabaseConfigured } from "./supabase/server";
import type { ChatMessage, Comment, Dub, Episode, Rating, Review, Title } from "./types";

/** Убираем символы, которые ломают фильтр PostgREST. */
function cleanQuery(q: string): string {
  return q.replace(/[%,()*\\]/g, " ").trim().slice(0, 80);
}

// Публичные данные каталога кэшируются на минуту и сбрасываются тегом "catalog",
// когда админ меняет тайтлы или серии (см. revalidateTag в actions.ts).
const CATALOG = { revalidate: 60, tags: ["catalog"] };

const fetchTitles = unstable_cache(
  async (q: string): Promise<Title[]> => {
    const supabase = createPublicClient()!;
    let req = supabase.from("titles").select("*").order("created_at", { ascending: false });
    if (q) req = req.or(`title_ky.ilike.%${q}%,title_ru.ilike.%${q}%,title_orig.ilike.%${q}%`);
    const { data, error } = await req;
    if (error) throw error; // ошибки не кэшируются
    return (data ?? []) as Title[];
  },
  ["titles"],
  CATALOG,
);

const fetchTitleBySlug = unstable_cache(
  async (slug: string): Promise<Title | null> => {
    const supabase = createPublicClient()!;
    const { data, error } = await supabase.from("titles").select("*").eq("slug", slug).maybeSingle();
    if (error) throw error;
    // «Не найдено» не кэшируем: бросаем ошибку, её ловит getTitleBySlug. Иначе страница нового тайтла могла бы остаться 404.
    if (!data) throw new Error("title not found");
    return data as Title;
  },
  ["title-by-slug"],
  CATALOG,
);

const fetchEpisodes = unstable_cache(
  async (titleId: string): Promise<Episode[]> => {
    const supabase = createPublicClient()!;
    const { data, error } = await supabase
      .from("episodes")
      .select("*")
      .eq("title_id", titleId)
      .eq("published", true)
      .order("season")
      .order("number");
    if (error) throw error;
    return (data ?? []) as Episode[];
  },
  ["episodes"],
  CATALOG,
);

const fetchDubs = unstable_cache(
  async (titleId: string): Promise<Dub[]> => {
    const supabase = createPublicClient()!;
    const { data, error } = await supabase
      .from("dubs")
      .select("*")
      .eq("title_id", titleId)
      .eq("published", true)
      .order("sort")
      .order("created_at");
    if (error) throw error;
    return (data ?? []) as Dub[];
  },
  ["dubs"],
  CATALOG,
);

/** Озвучки тайтла (только видимые). Пока SQL из supabase/dubs.sql не выполнен, вернёт []. */
export async function listDubs(titleId: string): Promise<Dub[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    return await fetchDubs(titleId);
  } catch {
    return [];
  }
}

export async function listTitles(query?: string): Promise<Title[]> {
  const q = query ? cleanQuery(query) : "";

  if (!isSupabaseConfigured()) {
    const needle = q.toLowerCase();
    return DEMO_TITLES.filter(
      (t) =>
        !needle ||
        [t.title_ky, t.title_ru, t.title_orig ?? ""].some((s) => s.toLowerCase().includes(needle)),
    );
  }

  try {
    return await fetchTitles(q);
  } catch {
    return [];
  }
}

export async function getTitleBySlug(slug: string): Promise<Title | null> {
  if (!isSupabaseConfigured()) return DEMO_TITLES.find((t) => t.slug === slug) ?? null;
  try {
    // В адресе пробелы приходят как %20: раскодируем, чтобы найти тайтл со старым адресом с пробелами
    let clean = slug;
    try {
      clean = decodeURIComponent(slug);
    } catch {}
    return await fetchTitleBySlug(clean);
  } catch {
    return null;
  }
}

export async function listEpisodes(titleId: string): Promise<Episode[]> {
  if (!isSupabaseConfigured()) return DEMO_EPISODES.filter((e) => e.title_id === titleId);
  try {
    return await fetchEpisodes(titleId);
  } catch {
    return [];
  }
}

export async function getRating(titleId: string): Promise<Rating | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("title_ratings")
    .select("avg_rating, reviews_count")
    .eq("title_id", titleId)
    .maybeSingle();
  return data ? { avg_rating: Number(data.avg_rating), reviews_count: Number(data.reviews_count) } : null;
}

export async function listReviews(titleId: string): Promise<Review[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("reviews")
    .select("id, title_id, user_id, rating, body, created_at, profiles(username)")
    .eq("title_id", titleId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((r) => {
    const profile = r.profiles as unknown as { username: string } | { username: string }[] | null;
    const username = Array.isArray(profile) ? profile[0]?.username : profile?.username;
    return {
      id: r.id,
      title_id: r.title_id,
      user_id: r.user_id,
      rating: r.rating,
      body: r.body,
      created_at: r.created_at,
      username: username ?? "user",
    };
  });
}

export async function isFavorite(userId: string, titleId: string): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;
  const { data } = await supabase
    .from("favorites")
    .select("title_id")
    .eq("user_id", userId)
    .eq("title_id", titleId)
    .maybeSingle();
  return Boolean(data);
}

export async function listFavorites(userId: string): Promise<Title[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("favorites")
    .select("titles(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []).flatMap((row) => {
    const t = row.titles as unknown as Title | Title[] | null;
    return Array.isArray(t) ? t : t ? [t] : [];
  });
}

export type ContinueItem = { title: Title; episode: Episode; position_sec: number };

export async function listContinueWatching(userId: string): Promise<ContinueItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("watch_progress")
    .select("position_sec, episodes(*, titles(*))")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(12);

  const items: ContinueItem[] = [];
  const seen = new Set<string>();
  for (const row of data ?? []) {
    const ep = row.episodes as unknown as (Episode & { titles: Title | Title[] | null }) | null;
    if (!ep) continue;
    const title = Array.isArray(ep.titles) ? ep.titles[0] : ep.titles;
    if (!title || seen.has(title.id)) continue;
    seen.add(title.id);
    items.push({ title, episode: ep, position_sec: row.position_sec });
  }
  return items;
}

export async function getProgress(userId: string, episodeId: string): Promise<number> {
  const supabase = await createClient();
  if (!supabase) return 0;
  const { data } = await supabase
    .from("watch_progress")
    .select("position_sec")
    .eq("user_id", userId)
    .eq("episode_id", episodeId)
    .maybeSingle();
  return data?.position_sec ?? 0;
}

/** Оценка текущего пользователя этому тайтлу (одна на тайтл). */
export async function getMyRating(userId: string, titleId: string): Promise<number | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("reviews")
    .select("rating")
    .eq("user_id", userId)
    .eq("title_id", titleId)
    .maybeSingle();
  return data?.rating ?? null;
}

type RawComment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  edited_at?: string | null;
  parent_id?: string | null;
  reply_to_id?: string | null;
  profiles: { username: string; avatar_url?: string | null } | { username: string; avatar_url?: string | null }[] | null;
  comment_reactions?: { user_id: string; emoji: string }[] | null;
};

/**
 * Комментарии без ограничения числа на человека, с ответами и реакциями.
 * Без `episode` возвращает комментарии к тайтлу, с `episode` — к серии (общие для всех озвучек).
 * Если SQL из supabase/social.sql ещё не выполнен, работает по-старому (без ответов и реакций).
 */
export async function listComments(
  titleId: string,
  episode?: { season: number; number: number },
  viewerId?: string | null,
): Promise<Comment[]> {
  const supabase = await createClient();
  if (!supabase) return [];

  const query = async (columns: string) => {
    let req = supabase.from("comments").select(columns).eq("title_id", titleId);
    req = episode ? req.eq("season", episode.season).eq("number", episode.number) : req.is("season", null);
    return req.order("created_at", { ascending: false }).limit(200);
  };

  const FK = "profiles!comments_user_id_fkey(username, avatar_url)";
  const REL = "parent_id, reply_to_id";
  // Если edit.sql ещё не выполнен (нет edited_at), падаем на прежний набор колонок
  let res = await query(`id, user_id, body, created_at, edited_at, ${REL}, ${FK}, comment_reactions(user_id, emoji)`);
  if (res.error) {
    res = await query(`id, user_id, body, created_at, ${REL}, ${FK}, comment_reactions(user_id, emoji)`);
  }
  if (res.error) {
    console.error("[listComments] full select failed:", res.error);
    res = await query(`id, user_id, body, created_at, ${FK}`);
    if (res.error) console.error("[listComments] fallback select failed:", res.error);
  }
  const rows = (res.data ?? []) as unknown as RawComment[];

  return rows.map((c) => {
    const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
    const counts = new Map<string, { count: number; mine: boolean }>();
    for (const r of c.comment_reactions ?? []) {
      const entry = counts.get(r.emoji) ?? { count: 0, mine: false };
      entry.count += 1;
      if (viewerId && r.user_id === viewerId) entry.mine = true;
      counts.set(r.emoji, entry);
    }
    return {
      id: c.id,
      user_id: c.user_id,
      body: c.body,
      created_at: c.created_at,
      edited_at: c.edited_at ?? null,
      username: profile?.username ?? "user",
      avatar_url: profile?.avatar_url ?? null,
      parent_id: c.parent_id ?? null,
      reply_to_id: c.reply_to_id ?? null,
      reactions: [...counts.entries()].map(([emoji, v]) => ({ emoji, ...v })),
    };
  });
}

/** Последние сообщения комнаты чата, от старых к новым. */
export async function listChat(room: string, limit = 50): Promise<ChatMessage[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, room, user_id, username, body, created_at")
    .eq("room", room)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return ((data ?? []) as ChatMessage[]).reverse();
}

/** Все тайтлы для админки, включая скрытые (видны только админу по правилам базы). */
export async function listTitlesForAdmin(): Promise<Title[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase.from("titles").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Title[];
}

export type MyComment = {
  id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  season: number | null;
  number: number | null;
  slug: string;
  title_ky: string;
  title_ru: string;
};

/** Все комментарии пользователя (на тайтлах и сериях) для страницы профиля. */
export async function listMyComments(userId: string): Promise<MyComment[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const base = "id, body, created_at, season, number, titles(slug, title_ky, title_ru)";
  let res = await supabase.from("comments").select(`${base}, edited_at`).eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  if (res.error) res = (await supabase.from("comments").select(base).eq("user_id", userId).order("created_at", { ascending: false }).limit(100)) as typeof res;
  type Row = { id: string; body: string; created_at: string; edited_at?: string | null; season: number | null; number: number | null; titles: { slug: string; title_ky: string; title_ru: string } | { slug: string; title_ky: string; title_ru: string }[] | null };
  return ((res.data ?? []) as unknown as Row[]).flatMap((c) => {
    const t = Array.isArray(c.titles) ? c.titles[0] : c.titles;
    if (!t) return [];
    return [{ id: c.id, body: c.body, created_at: c.created_at, edited_at: c.edited_at ?? null, season: c.season, number: c.number, slug: t.slug, title_ky: t.title_ky, title_ru: t.title_ru }];
  });
}

/** Аватарки всех пользователей, у кого она есть (для модерации в админке). */
export async function listAvatarsForAdmin(): Promise<{ id: string; username: string; avatar_url: string }[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .not("avatar_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);
  return (data ?? []) as { id: string; username: string; avatar_url: string }[];
}

/** Публичная часть профиля: ник, аватарка, дата регистрации (почта и избранное не показываются). */
export async function getPublicProfile(username: string): Promise<{ id: string; username: string; avatar_url: string | null; created_at: string } | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, created_at")
    .eq("username", username)
    .maybeSingle();
  return data ?? null;
}

// ───────── Рейтинги, новые серии, озвучки, пользователи (для Топа, Расписания, каталога) ─────────

export type RatingMap = Map<string, { avg: number; count: number }>;

const fetchRatings = unstable_cache(
  async () => {
    const supabase = createPublicClient()!;
    const { data, error } = await supabase.from("title_ratings").select("title_id, avg_rating, reviews_count");
    if (error) throw error;
    return (data ?? []) as { title_id: string; avg_rating: number; reviews_count: number }[];
  },
  ["ratings"],
  CATALOG,
);

export async function listRatings(): Promise<RatingMap> {
  const map: RatingMap = new Map();
  if (!isSupabaseConfigured()) return map;
  try {
    for (const r of await fetchRatings()) map.set(r.title_id, { avg: Number(r.avg_rating), count: Number(r.reviews_count) });
  } catch {}
  return map;
}

export type LatestEpisode = {
  id: string;
  season: number;
  number: number;
  dub_id: string | null;
  created_at: string;
  slug: string;
  title_ky: string;
  title_ru: string;
  poster_url: string | null;
};

const fetchLatestEpisodes = unstable_cache(
  async () => {
    const supabase = createPublicClient()!;
    const { data, error } = await supabase
      .from("episodes")
      .select("id, season, number, dub_id, created_at, titles(slug, title_ky, title_ru, poster_url)")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(24);
    if (error) throw error;
    return (data ?? []) as unknown as (Omit<LatestEpisode, "slug" | "title_ky" | "title_ru" | "poster_url"> & {
      titles: { slug: string; title_ky: string; title_ru: string; poster_url: string | null } | { slug: string; title_ky: string; title_ru: string; poster_url: string | null }[] | null;
    })[];
  },
  ["latest-episodes"],
  CATALOG,
);

/** Недавно добавленные серии (по одной на тайтл, скрытые тайтлы не попадают). */
export async function listLatestEpisodes(limit = 8): Promise<LatestEpisode[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const rows = await fetchLatestEpisodes();
    const seen = new Set<string>();
    const out: LatestEpisode[] = [];
    for (const r of rows) {
      const t = Array.isArray(r.titles) ? r.titles[0] : r.titles;
      if (!t || seen.has(t.slug)) continue;
      seen.add(t.slug);
      out.push({ id: r.id, season: r.season, number: r.number, dub_id: r.dub_id, created_at: r.created_at, ...t });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

const fetchAllDubs = unstable_cache(
  async () => {
    const supabase = createPublicClient()!;
    const { data, error } = await supabase.from("dubs").select("title_id, studio_name").eq("published", true);
    if (error) throw error;
    return (data ?? []) as { title_id: string; studio_name: string }[];
  },
  ["all-dubs"],
  CATALOG,
);

/** Озвучки всех тайтлов: нужны для фильтра каталога. */
export async function listAllDubs(): Promise<{ title_id: string; studio_name: string }[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    return await fetchAllDubs();
  } catch {
    return [];
  }
}

export async function listUsers(limit = 200): Promise<{ id: string; username: string; avatar_url: string | null; created_at: string }[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

/** Сколько комментариев написал каждый из этих людей (для званий). */
export async function countCommentsByUsers(ids: string[]): Promise<Record<string, number>> {
  const supabase = await createClient();
  const counts: Record<string, number> = {};
  if (!supabase || ids.length === 0) return counts;
  const { data } = await supabase.from("comments").select("user_id").in("user_id", ids).limit(10000);
  for (const r of data ?? []) counts[r.user_id] = (counts[r.user_id] ?? 0) + 1;
  return counts;
}

export type ListStatus = "watching" | "planned" | "completed" | "on_hold" | "dropped";
export const LIST_STATUSES: ListStatus[] = ["watching", "planned", "completed", "on_hold", "dropped"];

/** Статус тайтла в личном списке (null, если не в списке или SQL из supabase/lists.sql ещё не выполнен). */
export async function getListStatus(userId: string, titleId: string): Promise<ListStatus | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("title_lists")
    .select("status")
    .eq("user_id", userId)
    .eq("title_id", titleId)
    .maybeSingle();
  if (error) return null;
  return (data?.status as ListStatus) ?? null;
}

export async function listMyLists(userId: string): Promise<Record<ListStatus, Title[]>> {
  const out: Record<ListStatus, Title[]> = { watching: [], planned: [], completed: [], on_hold: [], dropped: [] };
  const supabase = await createClient();
  if (!supabase) return out;
  const { data, error } = await supabase
    .from("title_lists")
    .select("status, titles(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return out;
  for (const row of data ?? []) {
    const t = row.titles as unknown as Title | Title[] | null;
    const title = Array.isArray(t) ? t[0] : t;
    if (title && row.status in out) out[row.status as ListStatus].push(title);
  }
  return out;
}

const fetchEpisodeStats = unstable_cache(
  async () => {
    const supabase = createPublicClient()!;
    const { data, error } = await supabase
      .from("episodes")
      .select("title_id, created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) throw error;
    return (data ?? []) as { title_id: string; created_at: string }[];
  },
  ["episode-stats"],
  CATALOG,
);

/** По тайтлам: сколько опубликовано серий (без повторов озвучек не считаем, берём все записи) и когда добавлена последняя. */
export async function listEpisodeStats(): Promise<Map<string, { count: number; last: string }>> {
  const map = new Map<string, { count: number; last: string }>();
  if (!isSupabaseConfigured()) return map;
  try {
    for (const r of await fetchEpisodeStats()) {
      const cur = map.get(r.title_id);
      if (cur) cur.count += 1;
      else map.set(r.title_id, { count: 1, last: r.created_at });
    }
  } catch {}
  return map;
}

export type HistoryItem = { title: Title; episode: Episode; at: string };

/** История просмотра: серии, которые пользователь открывал, свежие сверху. */
export async function listHistory(userId: string, limit = 60): Promise<HistoryItem[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("watch_progress")
    .select("updated_at, episodes(*, titles(*))")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  const out: HistoryItem[] = [];
  for (const row of data ?? []) {
    const ep = row.episodes as unknown as (Episode & { titles: Title | Title[] | null }) | null;
    const title = ep && (Array.isArray(ep.titles) ? ep.titles[0] : ep.titles);
    if (ep && title) out.push({ title, episode: ep, at: row.updated_at });
  }
  return out;
}

/** Отмечает открытие серии в истории, не сбрасывая сохранённое место просмотра. */
export async function markEpisodeOpened(userId: string, episodeId: string, positionSec: number) {
  const supabase = await createClient();
  if (!supabase) return;
  await supabase.from("watch_progress").upsert({
    user_id: userId,
    episode_id: episodeId,
    position_sec: positionSec,
    updated_at: new Date().toISOString(),
  });
}
