import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AnimeCard } from "@/components/AnimeCard";
import { Tabs } from "@/components/Tabs";
import { LIST_STATUSES, listHistory, listMyLists } from "@/lib/data";
import { getDict, getLocale, pick } from "@/lib/i18n";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Список" };
export const dynamic = "force-dynamic";

export default async function ListPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const locale = await getLocale();
  const t = getDict(locale);
  const [lists, history] = await Promise.all([listMyLists(user.id), listHistory(user.id)]);

  const names = {
    watching: t.listWatching,
    planned: t.listPlanned,
    completed: t.listCompleted,
    on_hold: t.listOnHold,
    dropped: t.listDropped,
  };

  const tabs = [
    ...LIST_STATUSES.map((key) => ({
      key,
      label: names[key],
      count: lists[key].length,
      panel:
        lists[key].length === 0 ? (
          <p className="text-snow-dim">{t.listEmpty}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {lists[key].map((title) => (
              <AnimeCard key={title.id} title={title} locale={locale} />
            ))}
          </div>
        ),
    })),
    {
      key: "history",
      label: t.history,
      count: 0,
      panel:
        history.length === 0 ? (
          <p className="text-snow-dim">{t.historyEmpty}</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {history.map((h) => {
              const name = pick(h.title, "title", locale);
              return (
                <li key={h.episode.id}>
                  <Link href={`/watch/${h.title.slug}/${h.episode.season}-${h.episode.number}`} className="group flex items-center gap-4">
                    <div className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-lg border border-ink-200 bg-ink-100">
                      {h.title.poster_url && <Image src={h.title.poster_url} alt={name} fill sizes="64px" className="object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-semibold group-hover:text-neon">{name}</p>
                      <p className="text-sm text-snow-dim">
                        {h.episode.number}
                        {t.episodeShort}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{t.myList}</h1>
      <Tabs tabs={tabs} />
    </div>
  );
}
