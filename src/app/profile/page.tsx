import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { AnimeCard } from "@/components/AnimeCard";
import { listContinueWatching, listFavorites } from "@/lib/data";
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
  const { data: profile } = await supabase!.from("profiles").select("username").eq("id", user.id).maybeSingle();

  const [favorites, resume] = await Promise.all([listFavorites(user.id), listContinueWatching(user.id)]);

  return (
    <div className="space-y-10">
      <header className="flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-snow text-2xl font-black text-ink">
          {(profile?.username ?? user.email ?? "?").charAt(0).toUpperCase()}
        </div>
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

      <section>
        <h2 className="mb-4 text-xl font-bold">{t.continueWatching}</h2>
        {resume.length === 0 ? (
          <p className="text-sm text-snow-dim">{t.nothingYet}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {resume.map(({ title, episode }) => (
              <Link
                key={episode.id}
                href={`/watch/${title.slug}/${episode.season}-${episode.number}`}
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
