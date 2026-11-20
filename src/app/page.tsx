import { episodeHref } from "@/lib/dubs";
import Image from "next/image";
import Link from "next/link";
import { AnimeCard } from "@/components/AnimeCard";
import { TelegramBanner } from "@/components/TelegramBanner";
import { QuickLinks } from "@/components/QuickLinks";
import { listContinueWatching, listLatestEpisodes, listTitles } from "@/lib/data";
import { getDict, getLocale, pick } from "@/lib/i18n";
import { getViewer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const locale = await getLocale();
  const t = getDict(locale);
  const [titles, user, latest] = await Promise.all([listTitles(), getViewer(), listLatestEpisodes(6)]);
  const resume = user ? await listContinueWatching(user.id) : [];

  return (
    <div className="space-y-12">
      <section className="rounded-2xl border border-ink-200 bg-gradient-to-br from-ink-100 to-ink px-6 py-12 sm:px-10 sm:py-16">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-neon">{t.tagline}</p>
        <h1 className="max-w-2xl text-3xl font-extrabold leading-tight sm:text-5xl">{t.heroTitle}</h1>
        <p className="mt-4 max-w-xl text-snow-dim">{t.heroText}</p>
        {titles[0] && (
          <Link href={`/anime/${titles[0].slug}`} className="btn-primary mt-8">
            {t.watch}
          </Link>
        )}
      </section>

      <QuickLinks t={t} />

      {latest.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">{t.latestEpisodes}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {latest.map((e) => (
              <Link key={e.id} href={episodeHref(e.slug, e)} className="group block">
                <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-ink-200 bg-ink-100 text-sm font-semibold text-white group-hover:border-neon">
                  {e.poster_url && (
                    <Image src={e.poster_url} alt="" fill sizes="(max-width: 640px) 45vw, 180px" className="object-cover" />
                  )}
                  <span className="absolute inset-0 bg-black/55" />
                  <span className="relative">{e.number} {t.episode}</span>
                </div>
                <p className="mt-2 line-clamp-1 text-sm font-semibold">{pick(e, "title", locale)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <TelegramBanner />

      {resume.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">{t.continueWatching}</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {resume.map(({ title, episode }) => (
              <Link
                key={episode.id}
                href={episodeHref(title.slug, episode)}
                className="group block"
              >
                <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-ink-200 bg-ink-100 text-sm font-semibold text-white group-hover:border-neon">
                  {title.poster_url && (
                    <Image src={title.poster_url} alt="" fill sizes="(max-width: 640px) 45vw, 180px" className="object-cover" />
                  )}
                  <span className="absolute inset-0 bg-black/55" />
                  <span className="relative">{t.season} {episode.season} · {episode.number} {t.episode}</span>
                </div>
                <p className="mt-2 line-clamp-1 text-sm font-semibold">{pick(title, "title", locale)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-bold">{t.popular}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {titles.map((title) => (
            <AnimeCard key={title.id} title={title} locale={locale} />
          ))}
        </div>
      </section>
    </div>
  );
}
