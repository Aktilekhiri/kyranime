import Link from "next/link";
import { signOut } from "@/app/actions";
import { getDict, getLocale } from "@/lib/i18n";
import { getUser, isAdminEmail, isSupabaseConfigured } from "@/lib/supabase/server";
import { LangSwitch } from "./LangSwitch";

export async function Header() {
  const locale = await getLocale();
  const t = getDict(locale);
  const user = isSupabaseConfigured() ? await getUser() : null;

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          Kyr<span className="text-neon">Anime</span>
        </Link>

        <form action="/search" className="order-last w-full sm:order-none sm:ml-4 sm:w-auto sm:flex-1 sm:max-w-md">
          <label htmlFor="q" className="sr-only">
            {t.search}
          </label>
          <input id="q" name="q" type="search" placeholder={t.searchPlaceholder} className="input" />
        </form>

        <nav className="ml-auto flex items-center gap-2">
          <LangSwitch current={locale} />
          {user ? (
            <>
              {isAdminEmail(user.email) && (
                <Link href="/admin" className="btn-ghost">
                  {t.admin}
                </Link>
              )}
              <Link href="/profile" className="btn-ghost">
                {t.profile}
              </Link>
              <form action={signOut}>
                <button className="btn-ghost" type="submit">
                  {t.logout}
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn-primary">
              {t.login}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
