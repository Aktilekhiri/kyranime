import Image from "next/image";
import Link from "next/link";
import { pick, type Locale } from "@/lib/i18n";
import type { Title } from "@/lib/types";

export function AnimeCard({ title, locale }: { title: Title; locale: Locale }) {
  const name = pick(title, "title", locale);

  return (
    <Link href={`/anime/${title.slug}`} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-ink-200 bg-ink-100">
        {title.poster_url ? (
          <Image
            src={title.poster_url}
            alt={name}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 180px"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          // Нет постера: тёмный градиент с первой буквой, чтобы карточка не была пустой
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ink-200 to-ink text-5xl font-black text-snow-dim/40">
            {name.charAt(0)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/95 to-transparent p-3 pt-10" />
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-neon">{name}</h3>
      {title.year && <p className="text-xs text-snow-dim">{title.year}</p>}
    </Link>
  );
}
