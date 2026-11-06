import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Player } from "@/components/Player";
import { getProgress, getTitleBySlug, listEpisodes } from "@/lib/data";
import { getDict, getLocale, pick } from "@/lib/i18n";
import { getUser } from "@/lib/supabase/server";

type Params = Promise<{ slug: string; ep: string }>;

/** Адрес серии: /watch/<slug>/<сезон>-<номер>, например /watch/one-piece/1-12 */
function parseEp(ep: string): { season: number; number: number } | null {
  const m = /^(\d+)-(\d+)$/.exec(ep);
  return m ? { season: Number(m[1]), number: Number(m[2]) } : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, ep } = await params;
  const title = await getTitleBySlug(slug);
  const parsed = parseEp(ep);
  return { title: title && parsed ? `${title.title_ky} · ${parsed.number}` : "KyrAnime" };
}

export default async function WatchPage({ params }: { params: Params }) {
  const { slug, ep } = await params;
  const parsed = parseEp(ep);
  const title = await getTitleBySlug(slug);
  if (!title || !parsed) notFound();

  const episodes = await listEpisodes(title.id);
  const index = episodes.findIndex((e) => e.season === parsed.season && e.number === parsed.number);
  if (index === -1) notFound();

  const episode = episodes[index];
  const prev = episodes[index - 1];
  const next = episodes[index + 1];
  const href = (e: { season: number; number: number }) => `/watch/${title.slug}/${e.season}-${e.number}`;

  const locale = await getLocale();
  const t = getDict(locale);
  const user = await getUser();
  const startAt = user ? await getProgress(user.id, episode.id) : 0;

  return (
    <div className="space-y-6">
      <div className="text-sm">
        <Link href={`/anime/${title.slug}`} className="text-snow-dim hover:text-snow">
          ← {t.backToTitle}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{pick(title, "title", locale)}</h1>
        <p className="text-snow-dim">
          {t.season} {episode.season} · {episode.number} {t.episode}
          {pick(episode, "name", locale) && ` · ${pick(episode, "name", locale)}`}
        </p>
      </div>

      <Player
        key={episode.id}
        src={episode.hls_url}
        episodeId={episode.id}
        startAt={startAt}
        nextHref={next ? href(next) : null}
        canSave={Boolean(user)}
      />

      <div className="flex flex-wrap gap-3">
        {prev && (
          <Link href={href(prev)} className="btn-ghost">
            ← {t.prevEpisode}
          </Link>
        )}
        {next && (
          <Link href={href(next)} className="btn-primary">
            {t.nextEpisode} →
          </Link>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-bold">{t.episodes}</h2>
        <div className="flex flex-wrap gap-2">
          {episodes.map((e) => (
            <Link
              key={e.id}
              href={href(e)}
              aria-current={e.id === episode.id ? "page" : undefined}
              className={`min-w-10 rounded-lg border px-3 py-2 text-center text-sm font-medium transition ${
                e.id === episode.id
                  ? "border-neon bg-neon text-ink"
                  : "border-ink-300 hover:border-snow"
              }`}
            >
              {e.number}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
