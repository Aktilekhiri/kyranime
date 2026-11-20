import type { Metadata } from "next";
import { AnimeCard } from "@/components/AnimeCard";
import { listTitles } from "@/lib/data";
import { getDict, getLocale, WEEKDAYS } from "@/lib/i18n";
import { daysUntilRelease } from "@/lib/ranks";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDict(await getLocale()).schedule };
}
export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const locale = await getLocale();
  const t = getDict(locale);
  const titles = (await listTitles()).filter((x) => x.status === "ongoing");
  // «сегодня» = день, до которого 0 дней
  const today = [1, 2, 3, 4, 5, 6, 7].find((d) => daysUntilRelease([d]) === 0) ?? 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t.schedule}</h1>
      {[1, 2, 3, 4, 5, 6, 7].map((day) => {
        const list = titles.filter((x) => (x.release_days ?? []).includes(day));
        const isToday = day === today;
        return (
          <section key={day}>
            <h2 className={`mb-3 text-lg font-bold ${isToday ? "text-neon" : ""}`}>
              {WEEKDAYS[locale][day - 1]}
              {isToday && <span className="ml-2 rounded-md bg-neon px-2 py-0.5 text-xs text-ink">{t.today}</span>}
            </h2>
            {list.length === 0 ? (
              <p className="text-sm text-snow-dim">{t.noScheduled}</p>
            ) : (
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {list.map((title) => (
                  <AnimeCard key={title.id} title={title} locale={locale} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
