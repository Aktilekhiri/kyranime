import { genreKey } from "@/lib/genres";
import { getDict, pick, type Locale } from "@/lib/i18n";
import type { RatingMap } from "@/lib/data";
import type { Title } from "@/lib/types";
import { HomeTabsView, type TabRow } from "./HomeTabsView";

export const TABS = ["latest", "ongoing", "announce", "movies", "completed"] as const;
export type Tab = (typeof TABS)[number];

type Stats = Map<string, { count: number; last: string }>;

const isMovie = (t: Title) => t.genres.some((g) => ["фильм", "фильмы", "movie", "film"].includes(genreKey(g)));

/** Вкладки главной: Последнее / Онгоинги / Анонсы / Фильмы / Завершённые. Анонс = тайтл, у которого ещё нет серий; фильм = жанр «Фильм».
 *  Все списки считаются здесь, а переключаются в браузере без перезагрузки страницы (иначе страница прыгает вверх). */
export function HomeTabs({ titles, stats, ratings, tab, locale }: { titles: Title[]; stats: Stats; ratings: RatingMap; tab: Tab; locale: Locale }) {
  const t = getDict(locale);
  const has = (x: Title) => (stats.get(x.id)?.count ?? 0) > 0;
  const row = (x: Title): TabRow => {
    const n = stats.get(x.id)?.count ?? 0;
    const r = ratings.get(x.id);
    return {
      id: x.id,
      slug: x.slug,
      name: pick(x, "title", locale),
      poster: x.poster_url,
      meta: `${n > 0 ? t.episodesCount.replace("{n}", String(n)) : t.tabAnnounce}`,
      rating: r ? String(r.avg) : null,
      year: x.year,
      description: pick(x, "description", locale),
    };
  };
  const lists: Record<Tab, TabRow[]> = {
    latest: titles
      .filter(has)
      .sort((a, b) => stats.get(b.id)!.last.localeCompare(stats.get(a.id)!.last))
      .map(row),
    ongoing: titles.filter((x) => x.status === "ongoing" && has(x) && !isMovie(x)).map(row),
    announce: titles.filter((x) => !has(x)).map(row),
    movies: titles.filter(isMovie).map(row),
    completed: titles.filter((x) => x.status === "completed" && has(x)).map(row),
  };
  const labels: Record<Tab, string> = {
    latest: t.tabLatest,
    ongoing: t.tabOngoing,
    announce: t.tabAnnounce,
    movies: t.tabMovies,
    completed: t.tabCompleted,
  };
  return <HomeTabsView lists={lists} labels={labels} initial={tab} empty={t.nothingYet} />;
}
