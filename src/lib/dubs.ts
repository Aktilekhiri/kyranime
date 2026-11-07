import type { Dub, Episode } from "./types";

export type DubView = {
  /** Озвучки, у которых есть хотя бы одна опубликованная серия */
  dubs: Dub[];
  /** Выбранная озвучка (null, если у тайтла озвучек ещё нет) */
  current: Dub | null;
  /** Серии выбранной озвучки */
  episodes: Episode[];
  /** Все видимые серии всех озвучек */
  all: Episode[];
};

/**
 * Выбирает озвучку по параметру ?dub=. Если параметра нет или он неверный, берётся первая добавленная.
 * Серии скрытой озвучки не попадают ни в один список.
 * Если озвучек нет вообще (SQL ещё не выполнен), показываем серии как раньше.
 */
export function resolveDubs(dubs: Dub[], episodes: Episode[], wanted?: string): DubView {
  const withEpisodes = dubs.filter((d) => episodes.some((e) => e.dub_id === d.id));
  if (withEpisodes.length === 0) {
    const legacy = episodes.filter((e) => !e.dub_id);
    return { dubs: [], current: null, episodes: legacy, all: legacy };
  }
  const current = withEpisodes.find((d) => d.id === wanted) ?? withEpisodes[0];
  const all = episodes.filter((e) => e.dub_id && withEpisodes.some((d) => d.id === e.dub_id));
  return { dubs: withEpisodes, current, episodes: all.filter((e) => e.dub_id === current.id), all };
}

/** Адрес серии с учётом озвучки: /watch/<slug>/<сезон>-<номер>?dub=<id> */
export function episodeHref(slug: string, e: { season: number; number: number; dub_id?: string | null }): string {
  return `/watch/${slug}/${e.season}-${e.number}${e.dub_id ? `?dub=${e.dub_id}` : ""}`;
}
