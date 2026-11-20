import type { Metadata } from "next";
import { AnimeCard } from "@/components/AnimeCard";
import { listRatings, listTitles } from "@/lib/data";
import { getDict, getLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDict(await getLocale()).top };
}
export const dynamic = "force-dynamic";

export default async function TopPage() {
  const locale = await getLocale();
  const t = getDict(locale);
  const [titles, ratings] = await Promise.all([listTitles(), listRatings()]);
  const ranked = titles
    .filter((x) => ratings.has(x.id))
    .sort((a, b) => {
      const ra = ratings.get(a.id)!;
      const rb = ratings.get(b.id)!;
      return rb.avg - ra.avg || rb.count - ra.count;
    });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🏆 {t.top}</h1>
      {ranked.length === 0 ? (
        <p className="text-snow-dim">{t.nothingYet}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {ranked.map((title, i) => {
            const r = ratings.get(title.id)!;
            return (
              <div key={title.id} className="relative">
                <span className="absolute left-2 top-2 z-10 rounded-md bg-ink/90 px-2 py-0.5 text-xs font-bold text-neon">#{i + 1}</span>
                <AnimeCard title={title} locale={locale} />
                <p className="text-xs font-bold text-neon">
                  ★ {r.avg} <span className="font-normal text-snow-dim">· {r.count} {t.votes}</span>
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
