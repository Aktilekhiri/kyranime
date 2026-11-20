"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export type TabRow = {
  id: string;
  slug: string;
  name: string;
  poster: string | null;
  meta: string;
  rating: string | null;
  year: number | null;
  description: string;
};

type TabKey = "latest" | "ongoing" | "announce" | "movies" | "completed";
const ORDER: TabKey[] = ["latest", "ongoing", "announce", "movies", "completed"];

export function HomeTabsView({ lists, labels, initial, empty }: { lists: Record<TabKey, TabRow[]>; labels: Record<TabKey, string>; initial: TabKey; empty: string }) {
  const [tab, setTab] = useState<TabKey>(initial);
  const list = lists[tab];

  return (
    <section className="space-y-4">
      <div role="tablist" className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {ORDER.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={k === tab}
            onClick={() => setTab(k)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-base font-semibold transition ${
              k === tab ? "border-neon text-snow" : "border-transparent text-snow-dim hover:text-snow"
            }`}
          >
            {labels[k]}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-snow-dim">{empty}</p>
      ) : (
        <ul className="grid gap-x-8 gap-y-5 md:grid-cols-2">
          {list.map((x) => (
            <li key={x.id}>
              <Link href={`/anime/${x.slug}`} className="group flex gap-4">
                <div className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-xl border border-ink-200 bg-ink-100 sm:w-28">
                  {x.poster ? (
                    <Image src={x.poster} alt={x.name} fill sizes="112px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-3xl font-black text-snow-dim/40">{x.name.charAt(0)}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-base font-bold leading-snug group-hover:text-neon">{x.name}</h3>
                  <p className="mt-1 text-sm text-snow-dim">
                    {x.meta}
                    {x.rating ? <span className="text-neon"> · ★ {x.rating}</span> : null}
                    {x.year ? ` · ${x.year}` : ""}
                  </p>
                  <p className="mt-1.5 line-clamp-3 text-sm text-snow-dim/80">{x.description}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
