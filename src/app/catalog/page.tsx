import type { Metadata } from "next";
import Link from "next/link";
import { AnimeCard } from "@/components/AnimeCard";
import { listTitles } from "@/lib/data";
import { getDict, getLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Каталог" };
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
  const genres = [...new Set(all.flatMap((title) => title.genres))].sort((a, b) => a.localeCompare(b));
  const titles = genre ? all.filter((title) => title.genres.includes(genre)) : all;

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
          <Link href="/catalog" className={chip(!genre)}>
            {t.allGenres}
          </Link>
          {genres.map((g) => (
            <Link key={g} href={`/catalog?genre=${encodeURIComponent(g)}`} className={chip(g === genre)}>
              {g}
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
