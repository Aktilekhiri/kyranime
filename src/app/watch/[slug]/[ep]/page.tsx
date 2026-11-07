import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Player } from "@/components/Player";
import { getProgress, getTitleBySlug, listDubs, listEpisodes } from "@/lib/data";
import { episodeHref, resolveDubs } from "@/lib/dubs";
import { getDict, getLocale, pick } from "@/lib/i18n";
import { getViewer } from "@/lib/supabase/server";
import { bunnyEmbedUrl } from "@/lib/video";

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

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ dub?: string }>;
}) {
  const { slug, ep } = await params;
  const { dub: wantedDub } = await searchParams;
  const parsed = parseEp(ep);
  const title = await getTitleBySlug(slug);
  if (!title || !parsed) notFound();

  const [allEpisodes, dubList] = await Promise.all([listEpisodes(title.id), listDubs(title.id)]);
  const view = resolveDubs(dubList, allEpisodes, wantedDub);
  const { episodes } = view;
  const sameEp = (e: { season: number; number: number }) => e.season === parsed.season && e.number === parsed.number;
  const index = episodes.findIndex(sameEp);
  if (index === -1) {
    // В выбранной озвучке этой серии нет: открываем её в другой озвучке, если там есть
    const elsewhere = view.all.find(sameEp);
    if (elsewhere) redirect(episodeHref(title.slug, elsewhere));
    notFound();
  }

  const episode = episodes[index];
  const prev = episodes[index - 1];
  const next = episodes[index + 1];
  const href = (e: { season: number; number: number; dub_id?: string | null }) => episodeHref(title.slug, e);
  // Эта же серия в других озвучках (для переключателя)
  const versions = view.dubs
    .map((d) => ({ dub: d, episode: view.all.find((e) => e.dub_id === d.id && sameEp(e)) }))
    .filter((v): v is { dub: (typeof view.dubs)[number]; episode: (typeof view.all)[number] } => Boolean(v.episode));

  const locale = await getLocale();
  const t = getDict(locale);
  const user = await getViewer();
  const embedSrc = bunnyEmbedUrl(episode.hls_url);
  const startAt = user && !embedSrc ? await getProgress(user.id, episode.id) : 0;

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

      {versions.length > 1 && (
        <div className="space-y-2">
          <p className="text-sm text-snow-dim">{t.dubbedBy}:</p>
          <div className="flex flex-wrap gap-2">
            {versions.map(({ dub, episode: e }) => (
              <Link
                key={dub.id}
                href={href(e)}
                replace
                aria-current={dub.id === episode.dub_id ? "page" : undefined}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                  dub.id === episode.dub_id ? "border-neon bg-neon text-ink" : "border-ink-300 hover:border-snow"
                }`}
              >
                {dub.studio_name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {embedSrc ? (
        // Ссылка от Bunny (player.mediadelivery.net): показываем его плеер целиком
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
          <iframe
            key={episode.id}
            src={embedSrc}
            title={`${pick(title, "title", locale)} · ${episode.number}`}
            loading="lazy"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 size-full border-0"
          />
        </div>
      ) : (
        <Player
          key={episode.id}
          src={episode.hls_url}
          episodeId={episode.id}
          startAt={startAt}
          nextHref={next ? href(next) : null}
          canSave={Boolean(user)}
        />
      )}

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
