import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { submitReview, toggleFavorite } from "@/app/actions";
import { Comments } from "@/components/Comments";
import {
  getMyRating,
  getRating,
  getTitleBySlug,
  isFavorite,
  listComments,
  listDubs,
  listEpisodes,
} from "@/lib/data";
import { episodeHref, resolveDubs } from "@/lib/dubs";
import { formatReleaseDays, getDict, getLocale, pick } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import { getViewer, isAdminEmail } from "@/lib/supabase/server";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const title = await getTitleBySlug(slug);
  if (!title) return { title: "KyrAnime" };
  const names = [title.title_ru, title.title_ky, title.title_orig].filter(Boolean) as string[];
  const text = title.description_ru || title.description_ky || "";
  const description = `${title.title_ru} кыргызча: смотреть онлайн бесплатно. ${title.title_ky} кыргыз тилинде, кыргызча дубляж. ${text}`.slice(0, 300);
  return {
    title: `${title.title_ru} кыргызча — ${title.title_ky}`,
    description,
    keywords: [
      ...names.flatMap((n) => [`${n} кыргызча`, `${n} кыргыз тилинде`, `${n} смотреть онлайн`]),
      "аниме кыргызча",
      "аниме кыргыз тилинде",
      "кыргызча дубляж",
    ],
    alternates: { canonical: `/anime/${title.slug}` },
    openGraph: {
      title: `${title.title_ru} кыргызча`,
      description,
      type: "video.tv_show",
      images: title.poster_url ? [title.poster_url] : undefined,
    },
  };
}

export default async function AnimePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ dub?: string }>;
}) {
  const { slug } = await params;
  const { dub: wantedDub } = await searchParams;
  const title = await getTitleBySlug(slug);
  if (!title) notFound();

  const locale = await getLocale();
  const t = getDict(locale);
  const user = await getViewer();

  const [allEpisodes, dubList, rating, comments, favorite, myRating] =
    await Promise.all([
      listEpisodes(title.id),
      listDubs(title.id),
      getRating(title.id),
      listComments(title.id, undefined, user?.id),
      user ? isFavorite(user.id, title.id) : Promise.resolve(false),
      user ? getMyRating(user.id, title.id) : Promise.resolve(null),
    ]);

  const {
    dubs,
    current: currentDub,
    episodes,
  } = resolveDubs(dubList, allEpisodes, wantedDub);
  const name = pick(title, "title", locale);
  const first = episodes[0];
  const isAdmin = isAdminEmail(user?.email);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: title.title_ru,
    alternateName: [title.title_ky, title.title_orig].filter(Boolean),
    description: title.description_ru || title.description_ky || undefined,
    image: title.poster_url || undefined,
    inLanguage: "ky",
    genre: title.genres,
    datePublished: title.year ? String(title.year) : undefined,
    url: `${SITE_URL}/anime/${title.slug}`,
    ...(rating && rating.reviews_count > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(rating.avg_rating), ratingCount: Number(rating.reviews_count), bestRating: 10, worstRating: 1 } }
      : {}),
  };

  return (
    <div className="space-y-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="grid gap-6 sm:grid-cols-[220px_1fr]">
        <div className="relative mx-auto aspect-[2/3] w-44 overflow-hidden rounded-xl border border-ink-200 bg-ink-100 sm:w-full">
          {title.poster_url ? (
            <Image
              src={title.poster_url}
              alt={name}
              fill
              sizes="220px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl font-black text-snow-dim/40">
              {name.charAt(0)}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-extrabold">{name}</h1>
            {title.title_orig && (
              <p className="text-snow-dim">{title.title_orig}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {rating && (
              <span className="rounded-md bg-neon px-2 py-1 font-bold text-ink">
                ★ {rating.avg_rating}{" "}
                <span className="font-medium">({rating.reviews_count})</span>
              </span>
            )}
            {title.year && (
              <span className="rounded-md border border-ink-300 px-2 py-1">
                {title.year}
              </span>
            )}
            <span className="rounded-md border border-ink-300 px-2 py-1">
              {title.status === "ongoing"
                ? t.status_ongoing
                : t.status_completed}
            </span>
            {title.genres.map((g) => (
              <span
                key={g}
                className="rounded-md border border-ink-300 px-2 py-1 text-snow-dim"
              >
                {g}
              </span>
            ))}
          </div>

          <p className="max-w-3xl text-snow-dim">
            {pick(title, "description", locale)}
          </p>
          {formatReleaseDays(title.release_days, locale) && (
            <p className="text-sm">
              <span className="text-snow-dim">{t.releaseDays}:</span>{" "}
              <span className="font-semibold text-neon">
                {formatReleaseDays(title.release_days, locale)}
              </span>
            </p>
          )}
          {!currentDub && title.dubbed_by && (
            <p className="text-sm">
              <span className="text-snow-dim">{t.dubbedBy}:</span>{" "}
              {title.dubbed_by}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {first && (
              <Link
                href={episodeHref(title.slug, first)}
                className="btn-primary"
              >
                ▶ {t.watch}
              </Link>
            )}
            <form action={toggleFavorite}>
              <input type="hidden" name="title_id" value={title.id} />
              <input type="hidden" name="slug" value={title.slug} />
              <input type="hidden" name="active" value={favorite ? "1" : "0"} />
              <button type="submit" className="btn-ghost">
                {favorite ? `✓ ${t.removeFavorite}` : `+ ${t.addFavorite}`}
              </button>
            </form>
          </div>
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <section className="min-w-0">
          <h2 className="mb-4 text-xl font-bold">{t.episodes}</h2>
          {dubs.length > 0 && currentDub && (
            <div className="mb-4 space-y-2">
              <p className="text-sm text-snow-dim">{t.dubbedBy}:</p>
              <div
                className="flex flex-wrap gap-2"
                role="tablist"
                aria-label={t.dubbedBy}
              >
                {dubs.map((d) => (
                  <Link
                    key={d.id}
                    href={`/anime/${title.slug}?dub=${d.id}`}
                    scroll={false}
                    role="tab"
                    aria-selected={d.id === currentDub.id}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                      d.id === currentDub.id
                        ? "border-neon bg-neon text-ink"
                        : "border-ink-300 hover:border-snow"
                    }`}
                  >
                    {d.studio_name}
                  </Link>
                ))}
              </div>
              {currentDub.studio_url && (
                <a
                  href={currentDub.studio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-sm text-neon underline underline-offset-2"
                >
                  {currentDub.studio_name} ↗
                </a>
              )}
            </div>
          )}
          <ol className="space-y-2">
            {episodes.map((ep) => {
              const epName = pick(ep, "name", locale);
              return (
                <li key={ep.id}>
                  <Link
                    href={episodeHref(title.slug, ep)}
                    className="card group flex items-center gap-4 px-4 py-3 transition hover:border-neon"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-lg font-bold group-hover:bg-neon group-hover:text-ink">
                      {ep.number}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">
                        {ep.number} {t.episode}
                        {ep.season > 1 && (
                          <span className="ml-1 font-normal text-snow-dim">
                            · S{ep.season}
                          </span>
                        )}
                      </span>
                      {epName && (
                        <span className="mt-0.5 line-clamp-2 block text-sm text-snow-dim">
                          {epName}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-xs text-snow-dim">
                      {ep.duration_sec ? (
                        <span>
                          {Math.round(ep.duration_sec / 60)} {t.minutesShort}
                        </span>
                      ) : null}
                      <svg
                        viewBox="0 0 24 24"
                        className="size-5 group-hover:text-neon"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="min-w-0 space-y-8">
          <section className="space-y-3">
            <h2 className="text-xl font-bold">{t.yourRating}</h2>
            {user ? (
              <form
                action={submitReview}
                className="card flex flex-wrap items-end gap-3 p-4"
              >
                <input type="hidden" name="title_id" value={title.id} />
                <input type="hidden" name="slug" value={title.slug} />
                <div>
                  <label htmlFor="rating" className="label">
                    {t.rating}
                  </label>
                  <select
                    id="rating"
                    name="rating"
                    defaultValue={myRating ?? 10}
                    className="input w-28"
                  >
                    {Array.from({ length: 10 }, (_, i) => 10 - i).map((n) => (
                      <option key={n} value={n}>
                        {n} / 10
                      </option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn-primary">
                  {t.saveRating}
                </button>
              </form>
            ) : (
              <p className="card p-4 text-sm text-snow-dim">
                <Link
                  href="/login"
                  className="text-neon underline underline-offset-2"
                >
                  {t.loginToRate}
                </Link>
              </p>
            )}
          </section>

          <Comments
            heading={t.reviews}
            comments={comments}
            titleId={title.id}
            slug={title.slug}
            viewerId={user?.id ?? null}
            isAdmin={isAdmin}
            t={t}
          />
        </aside>
      </div>
    </div>
  );
}
