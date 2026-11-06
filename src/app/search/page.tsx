import type { Metadata } from "next";
import { AnimeCard } from "@/components/AnimeCard";
import { listTitles } from "@/lib/data";
import { getDict, getLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDict(await getLocale()).search };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const locale = await getLocale();
  const t = getDict(locale);
  const titles = await listTitles(q);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {t.search}
        {q && <span className="text-snow-dim">: «{q}»</span>}
      </h1>

      {titles.length === 0 ? (
        <p className="text-snow-dim">{t.searchEmpty}</p>
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
