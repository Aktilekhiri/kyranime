import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { getPublicProfile, listMyComments } from "@/lib/data";
import { getDict, getLocale, pick } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ username: string }> };

// Страницы людей не нужны поисковикам
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  return { title: decodeURIComponent(username), robots: { index: false, follow: false } };
}

export default async function PublicProfilePage({ params }: Params) {
  const { username } = await params;
  const profile = await getPublicProfile(decodeURIComponent(username));
  if (!profile) notFound();

  const locale = await getLocale();
  const t = getDict(locale);
  const comments = await listMyComments(profile.id);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="flex items-center gap-4">
        <Avatar url={profile.avatar_url} name={profile.username} size={72} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{profile.username}</h1>
          <p className="text-sm text-snow-dim">
            {t.registered}: {new Date(profile.created_at).toLocaleDateString("ru-RU", { timeZone: "Asia/Bishkek" })}
          </p>
        </div>
      </header>

      <section>
        <h2 className="mb-4 text-xl font-bold">
          {t.publicComments} <span className="text-base font-normal text-snow-dim">({comments.length})</span>
        </h2>
        {comments.length === 0 ? (
          <p className="text-sm text-snow-dim">{t.nothingYet}</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
