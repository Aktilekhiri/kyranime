import { genreKey, genreLabel } from "@/lib/genres";
import type { Metadata } from "next";
import Link from "next/link";
import { AnimeCard } from "@/components/AnimeCard";
import { listTitles } from "@/lib/data";
import { getDict, getLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDict(await getLocale()).catalog };
}
export const dynamic = "force-dynamic";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  const { genre } = await searchParams;
  const locale = await getLocale();
  const t = getDict(locale);

  const all = await listTitles();
  // Жанры без дублей («Сёнен» = «сёнен» = «сёнэн»), названия на языке посетителя
  const labels = new Map<string, string>();
  for (const g of all.flatMap((title) => title.genres)) {
    if (!labels.has(genreKey(g))) labels.set(genreKey(g), genreLabel(g, locale));
  }
  const genres = [...labels.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const activeKey = genre ? genreKey(genre) : null;
  const titles = activeKey ? all.filter((title) => title.genres.some((g) => genreKey(g) === activeKey)) : all;

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

      {genres.length > 0 && (
        // На телефоне жанры прокручиваются вбок одной строкой
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Link href="/catalog" className={chip(!activeKey)}>
            {t.allGenres}
          </Link>
          {genres.map(([key, label]) => (
            <Link key={key} href={`/catalog?genre=${encodeURIComponent(key)}`} className={chip(key === activeKey)}>
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
