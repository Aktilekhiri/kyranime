import { episodeHref } from "@/lib/dubs";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteComment, signOut, updateComment, updateUsername } from "@/app/actions";
import { AvatarUploader } from "@/components/AvatarUploader";
import { AnimeCard } from "@/components/AnimeCard";
import { listContinueWatching, listFavorites, listMyComments, listMyLists } from "@/lib/data";
import { getDict, getLocale, pick } from "@/lib/i18n";
import { createClient, getUser, isAdminEmail } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDict(await getLocale()).profile };
}
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/profile");

  const locale = await getLocale();
  const t = getDict(locale);
  const supabase = await createClient();
  const { data: profile } = await supabase!.from("profiles").select("username, avatar_url").eq("id", user.id).maybeSingle();

  const [favorites, resume, myComments, lists] = await Promise.all([
    listFavorites(user.id),
    listContinueWatching(user.id),
    listMyComments(user.id),
    listMyLists(user.id),
  ]);

  return (
    <div className="space-y-10">
      <header className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{profile?.username ?? "user"}</h1>
          <p className="text-sm text-snow-dim">{user.email}</p>
        </div>
        <div className="ml-auto flex flex-wrap justify-end gap-2">
          {isAdminEmail(user.email) && (
            <Link href="/admin" className="btn-ghost">
              {t.admin}
            </Link>
          )}
          <form action={signOut}>
            <button type="submit" className="btn-ghost">
              {t.logout}
            </button>
          </form>
        </div>
      </header>

      <section className="card space-y-4 p-4">
        <AvatarUploader
          url={profile?.avatar_url ?? null}
          name={profile?.username ?? user.email ?? "?"}
          labels={{ change: t.changeAvatar, remove: t.removeAvatar }}
        />
      </section>

      <section>
        <form action={updateUsername} className="card flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-0 flex-1">
            <label htmlFor="username" className="label">
              {t.nickname}
            </label>
            <input
              id="username"
              name="username"
              defaultValue={profile?.username ?? ""}
              required
              minLength={3}
              maxLength={24}
              autoComplete="nickname"
              className="input"
            />
          </div>
          <button type="submit" className="btn-primary">
            {t.changeNick}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">{t.continueWatching}</h2>
        {resume.length === 0 ? (
          <p className="text-sm text-snow-dim">{t.nothingYet}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {resume.map(({ title, episode }) => (
              <Link
                key={episode.id}
                href={episodeHref(title.slug, episode)}
                className="card p-3 text-sm transition hover:border-neon"
              >
                <span className="line-clamp-2 font-semibold">{pick(title, "title", locale)}</span>
                <span className="mt-1 block text-xs text-snow-dim">
                  {episode.number} {t.episode}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">
          {t.myComments} <span className="text-base font-normal text-snow-dim">({myComments.length})</span>
        </h2>
        {myComments.length === 0 ? (
          <p className="text-sm text-snow-dim">{t.nothingYet}</p>
        ) : (
          <ul className="space-y-3">
            {myComments.map((c) => (
              <li key={c.id} className="card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <Link href={`/anime/${encodeURIComponent(c.slug)}`} className="font-semibold text-neon hover:underline">
                    {pick({ title_ky: c.title_ky, title_ru: c.title_ru }, "title", locale)}
                    {c.number !== null ? ` · ${c.number} ${t.episode}` : ""}
                  </Link>
                  <span className="text-xs text-snow-dim">
                    {new Date(c.created_at).toLocaleDateString("ru-RU", { timeZone: "Asia/Bishkek" })}
                    {c.edited_at ? ` · ${t.edited}` : ""}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-line break-words text-sm text-snow/90">{c.body}</p>
                <div className="mt-2 flex flex-wrap items-start gap-x-4 gap-y-2">
                  <details className="w-full">
                    <summary className="cursor-pointer list-none select-none text-xs text-snow-dim underline hover:text-snow [&::-webkit-details-marker]:hidden">
                      {t.edit}
                    </summary>
                    <form action={updateComment} className="mt-2 space-y-2">
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="slug" value={c.slug} />
                      <label htmlFor={`my-${c.id}`} className="sr-only">
                        {t.edit}
                      </label>
                      <textarea id={`my-${c.id}`} name="body" rows={3} required maxLength={2000} defaultValue={c.body} className="input" />
                      <button type="submit" className="btn-primary">
                        {t.save}
                      </button>
                    </form>
                  </details>
                  <form action={deleteComment}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="slug" value={c.slug} />
                    <button type="submit" className="text-xs text-snow-dim underline hover:text-snow">
                      {t.delete}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(
        [
          ["watching", t.listWatching],
          ["planned", t.listPlanned],
          ["completed", t.listCompleted],
        ] as const
      ).map(([key, label]) =>
        lists[key].length === 0 ? null : (
          <section key={key}>
            <h2 className="mb-4 text-xl font-bold">
              {label} <span className="text-base font-normal text-snow-dim">({lists[key].length})</span>
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {lists[key].map((title) => (
                <AnimeCard key={title.id} title={title} locale={locale} />
              ))}
            </div>
          </section>
        ),
      )}

      <section>
        <h2 className="mb-4 text-xl font-bold">{t.favorites}</h2>
        {favorites.length === 0 ? (
          <p className="text-sm text-snow-dim">{t.nothingYet}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {favorites.map((title) => (
              <AnimeCard key={title.id} title={title} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
