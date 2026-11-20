import Image from "next/image";
import Link from "next/link";
import { genreKey } from "@/lib/genres";
import { getDict, pick, type Locale } from "@/lib/i18n";
import type { RatingMap } from "@/lib/data";
import type { Title } from "@/lib/types";

export const TABS = ["latest", "ongoing", "announce", "movies", "completed"] as const;
export type Tab = (typeof TABS)[number];

type Stats = Map<string, { count: number; last: string }>;

const isMovie = (t: Title) => t.genres.some((g) => ["фильм", "фильмы", "movie", "film"].includes(genreKey(g)));

/** Вкладки главной: Последнее / Онгоинги / Анонсы / Фильмы / Завершённые. Анонс = тайтл, у которого ещё нет серий; фильм = жанр «Фильм». */
export function HomeTabs({ titles, stats, ratings, tab, locale }: { titles: Title[]; stats: Stats; ratings: RatingMap; tab: Tab; locale: Locale }) {
  const t = getDict(locale);
  const has = (x: Title) => (stats.get(x.id)?.count ?? 0) > 0;

  let list: Title[];
  if (tab === "ongoing") list = titles.filter((x) => x.status === "ongoing" && has(x) && !isMovie(x));
  else if (tab === "announce") list = titles.filter((x) => !has(x));
  else if (tab === "movies") list = titles.filter(isMovie);
  else if (tab === "completed") list = titles.filter((x) => x.status === "completed" && has(x));
  else
    list = titles
      .filter(has)
      .sort((a, b) => (stats.get(b.id)!.last).localeCompare(stats.get(a.id)!.last));

  const labels: Record<Tab, string> = {
    latest: t.tabLatest,
    ongoing: t.tabOngoing,
    announce: t.tabAnnounce,
    movies: t.tabMovies,
    completed: t.tabCompleted,
  };

  return (
    <section className="space-y-4">
      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label={t.popular}>
        {TABS.map((k) => (
          <Link
            key={k}
            href={k === "latest" ? "/" : `/?tab=${k}`}
            scroll={false}
            aria-current={k === tab ? "page" : undefined}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-base font-semibold transition ${
              k === tab ? "border-neon text-snow" : "border-transparent text-snow-dim hover:text-snow"
            }`}
          >
            {labels[k]}
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <p className="text-snow-dim">{t.nothingYet}</p>
      ) : (
        <ul className="grid gap-x-8 gap-y-5 md:grid-cols-2">
          {list.map((x) => {
            const name = pick(x, "title", locale);
            const n = stats.get(x.id)?.count ?? 0;
            const r = ratings.get(x.id);
            return (
              <li key={x.id}>
                <Link href={`/anime/${x.slug}`} className="group flex gap-4">
                  <div className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-xl border border-ink-200 bg-ink-100 sm:w-28">
                    {x.poster_url ? (
                      <Image src={x.poster_url} alt={name} fill sizes="112px" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl font-black text-snow-dim/40">{name.charAt(0)}</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-base font-bold leading-snug group-hover:text-neon">{name}</h3>
                    <p className="mt-1 text-sm text-snow-dim">
                      {n > 0 ? t.episodesCount.replace("{n}", String(n)) : t.tabAnnounce}
                      {r ? <span className="text-neon"> · ★ {r.avg}</span> : null}
                      {x.year ? ` · ${x.year}` : ""}
                    </p>
                    <p className="mt-1.5 line-clamp-3 text-sm text-snow-dim/80">{pick(x, "description", locale)}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
