import { genreKey, genreLabel } from "@/lib/genres";
import type { Metadata } from "next";
import Link from "next/link";
import { AnimeCard } from "@/components/AnimeCard";
import { QuickLinks } from "@/components/QuickLinks";
import { listAllDubs, listRatings, listTitles } from "@/lib/data";
import { getDict, getLocale, pick } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDict(await getLocale()).catalog };
}
export const dynamic = "force-dynamic";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string; status?: string; year?: string; dub?: string; sort?: string }>;
}) {
  const { genre, status, year, dub, sort = "new" } = await searchParams;
  const locale = await getLocale();
  const t = getDict(locale);

  const [all, ratings, allDubs] = await Promise.all([listTitles(), listRatings(), listAllDubs()]);
  // Жанры без дублей («Сёнен» = «сёнен» = «сёнэн»), названия на языке посетителя
  const labels = new Map<string, string>();
  for (const g of all.flatMap((title) => title.genres)) {
    if (!labels.has(genreKey(g))) labels.set(genreKey(g), genreLabel(g, locale));
  }
  const genres = [...labels.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const activeKey = genre ? genreKey(genre) : null;
  const dubNames = [...new Set(allDubs.map((d) => d.studio_name))].sort((a, b) => a.localeCompare(b));
  const years = [...new Set(all.map((x) => x.year).filter((y): y is number => !!y))].sort((a, b) => b - a);
  const dubTitleIds = dub ? new Set(allDubs.filter((d) => d.studio_name === dub).map((d) => d.title_id)) : null;
  const titles = all
    .filter((x) => !activeKey || x.genres.some((g) => genreKey(g) === activeKey))
    .filter((x) => !status || x.status === status)
    .filter((x) => !year || String(x.year) === year)
    .filter((x) => !dubTitleIds || dubTitleIds.has(x.id));
  if (sort === "rating") titles.sort((a, b) => (ratings.get(b.id)?.avg ?? 0) - (ratings.get(a.id)?.avg ?? 0));
  else if (sort === "name") titles.sort((a, b) => pick(a, "title", locale).localeCompare(pick(b, "title", locale)));
  else if (sort === "year") titles.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
  const keep = (g: string) => {
    const q = new URLSearchParams();
    if (g) q.set("genre", g);
    if (status) q.set("status", status);
    if (year) q.set("year", year);
    if (dub) q.set("dub", dub);
    if (sort !== "new") q.set("sort", sort);
    const str = q.toString();
    return str ? `/catalog?${str}` : "/catalog";
  };

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
      active ? "border-neon bg-neon text-ink" : "border-ink-300 text-snow-dim hover:border-snow hover:text-snow"
    }`;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-bold">{t.catalog}</h1>
        <p className="text-sm text-snow-dim">
          {titles.length} {t.catalogCount}
        </p>
      </div>

      <QuickLinks t={t} />

      <form action="/catalog" className="grid grid-cols-2 items-end gap-3 sm:grid-cols-5">
        {genre && <input type="hidden" name="genre" value={genre} />}
        <div>
          <label htmlFor="f-status" className="label">{t.filterStatus}</label>
          <select id="f-status" name="status" defaultValue={status ?? ""} className="input">
            <option value="">{t.anyOption}</option>
            <option value="ongoing">{t.status_ongoing}</option>
            <option value="completed">{t.status_completed}</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-year" className="label">{t.filterYear}</label>
          <select id="f-year" name="year" defaultValue={year ?? ""} className="input">
            <option value="">{t.anyOption}</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-dub" className="label">{t.filterDub}</label>
          <select id="f-dub" name="dub" defaultValue={dub ?? ""} className="input">
            <option value="">{t.anyOption}</option>
            {dubNames.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-sort" className="label">{t.sortBy}</label>
          <select id="f-sort" name="sort" defaultValue={sort} className="input">
            <option value="new">{t.sortNew}</option>
            <option value="rating">{t.sortRating}</option>
            <option value="name">{t.sortName}</option>
            <option value="year">{t.sortYear}</option>
          </select>
        </div>
        <div className="col-span-2 flex gap-2 sm:col-span-1">
          <button type="submit" className="btn-primary flex-1">{t.applyFilters}</button>
          <Link href="/catalog" className="btn-ghost">{t.resetFilters}</Link>
        </div>
      </form>

      {genres.length > 0 && (
        // На телефоне жанры прокручиваются вбок одной строкой
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Link href={keep("")} className={chip(!activeKey)}>
            {t.allGenres}
          </Link>
          {genres.map(([key, label]) => (
            <Link key={key} href={keep(key)} className={chip(key === activeKey)}>
              {label}
            </Link>
          ))}
        </div>
      )}

      {titles.length === 0 ? (
        <p className="text-snow-dim">{t.nothingYet}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {titles.map((title) => (
            <AnimeCard key={title.id} title={title} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
