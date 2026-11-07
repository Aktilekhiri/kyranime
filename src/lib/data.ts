import { DEMO_EPISODES, DEMO_TITLES } from "./demo";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "./supabase/public";
import { createClient, isSupabaseConfigured } from "./supabase/server";
import type { Dub, Episode, Rating, Review, Title } from "./types";

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
    return (data as Title | null) ?? null;
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
    return await fetchTitleBySlug(slug);
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
