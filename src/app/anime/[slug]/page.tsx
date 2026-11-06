import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteReview, submitReview, toggleFavorite } from "@/app/actions";
import { getRating, getTitleBySlug, isFavorite, listEpisodes, listReviews } from "@/lib/data";
import { formatReleaseDays, getDict, getLocale, pick } from "@/lib/i18n";
import { getViewer, isAdminEmail } from "@/lib/supabase/server";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const title = await getTitleBySlug(slug);
  return { title: title ? `${title.title_ky} / ${title.title_ru}` : "KyrAnime" };
}

export default async function AnimePage({ params }: { params: Params }) {
  const { slug } = await params;
  const title = await getTitleBySlug(slug);
  if (!title) notFound();

  const locale = await getLocale();
  const t = getDict(locale);
  const user = await getViewer();

  const [episodes, rating, reviews, favorite] = await Promise.all([
    listEpisodes(title.id),
    getRating(title.id),
    listReviews(title.id),
    user ? isFavorite(user.id, title.id) : Promise.resolve(false),
  ]);

  const name = pick(title, "title", locale);
  const first = episodes[0];
  const isAdmin = isAdminEmail(user?.email);
  const mine = reviews.find((r) => r.user_id === user?.id);

  return (
    <div className="space-y-10">
      <section className="grid gap-6 sm:grid-cols-[220px_1fr]">
        <div className="relative mx-auto aspect-[2/3] w-44 overflow-hidden rounded-xl border border-ink-200 bg-ink-100 sm:w-full">
          {title.poster_url ? (
            <Image src={title.poster_url} alt={name} fill sizes="220px" className="object-cover" priority />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl font-black text-snow-dim/40">
              {name.charAt(0)}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-extrabold">{name}</h1>
            {title.title_orig && <p className="text-snow-dim">{title.title_orig}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {rating && (
              <span className="rounded-md bg-neon px-2 py-1 font-bold text-ink">
                ★ {rating.avg_rating} <span className="font-medium">({rating.reviews_count})</span>
              </span>
            )}
            {title.year && <span className="rounded-md border border-ink-300 px-2 py-1">{title.year}</span>}
            <span className="rounded-md border border-ink-300 px-2 py-1">
              {title.status === "ongoing" ? t.status_ongoing : t.status_completed}
            </span>
            {title.genres.map((g) => (
              <span key={g} className="rounded-md border border-ink-300 px-2 py-1 text-snow-dim">
                {g}
              </span>
            ))}
          </div>

          <p className="max-w-2xl text-snow-dim">{pick(title, "description", locale)}</p>
          {formatReleaseDays(title.release_days, locale) && (
            <p className="text-sm">
              <span className="text-snow-dim">{t.releaseDays}:</span>{" "}
              <span className="font-semibold text-neon">{formatReleaseDays(title.release_days, locale)}</span>
            </p>
          )}
          {title.dubbed_by && (
            <p className="text-sm">
              <span className="text-snow-dim">{t.dubbedBy}:</span> {title.dubbed_by}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            {first && (
              <Link href={`/watch/${title.slug}/${first.season}-${first.number}`} className="btn-primary">
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

      <section>
        <h2 className="mb-4 text-xl font-bold">{t.episodes}</h2>
        <ol className="max-w-2xl space-y-2">
          {episodes.map((ep) => {
            const epName = pick(ep, "name", locale);
            return (
              <li key={ep.id}>
                <Link
                  href={`/watch/${title.slug}/${ep.season}-${ep.number}`}
                  className="card group flex items-center gap-4 px-4 py-3 transition hover:border-neon"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-lg font-bold group-hover:bg-neon group-hover:text-ink">
                    {ep.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      {ep.number} {t.episode}
                      {ep.season > 1 && <span className="ml-1 font-normal text-snow-dim">· S{ep.season}</span>}
                    </span>
                    {epName && <span className="mt-0.5 line-clamp-2 block text-sm text-snow-dim">{epName}</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-xs text-snow-dim">
                    {ep.duration_sec ? (
                      <span>
                        {Math.round(ep.duration_sec / 60)} {t.minutesShort}
                      </span>
                    ) : null}
                    <svg viewBox="0 0 24 24" className="size-5 group-hover:text-neon" fill="currentColor" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="max-w-2xl space-y-6">
        <h2 className="text-xl font-bold">{t.reviews}</h2>

        {user ? (
          <form action={submitReview} className="card space-y-3 p-4">
            <input type="hidden" name="title_id" value={title.id} />
            <input type="hidden" name="slug" value={title.slug} />
            <div>
              <label htmlFor="rating" className="label">
                {t.rating}
              </label>
              <select id="rating" name="rating" defaultValue={mine?.rating ?? 10} className="input w-28">
                {Array.from({ length: 10 }, (_, i) => 10 - i).map((n) => (
                  <option key={n} value={n}>
                    {n} / 10
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="body" className="label">
                {t.writeReview}
              </label>
              <textarea
                id="body"
                name="body"
                rows={3}
                maxLength={2000}
                defaultValue={mine?.body ?? ""}
                placeholder={t.reviewPlaceholder}
                className="input"
              />
            </div>
            <button type="submit" className="btn-primary">
              {t.send}
            </button>
          </form>
        ) : (
          <p className="card p-4 text-sm text-snow-dim">
            <Link href="/login" className="text-neon underline underline-offset-2">
              {t.loginToReview}
            </Link>
          </p>
        )}

        {reviews.length === 0 ? (
          <p className="text-sm text-snow-dim">{t.noReviews}</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="card p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{r.username}</span>
                  <span className="text-sm font-bold text-neon">★ {r.rating}/10</span>
                </div>
                {r.body && <p className="mt-2 whitespace-pre-line text-sm text-snow/90">{r.body}</p>}
                {isAdmin && (
                  <form action={deleteReview} className="mt-2">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="slug" value={title.slug} />
                    <button className="text-xs text-snow-dim underline hover:text-snow" type="submit">
                      ✕
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
