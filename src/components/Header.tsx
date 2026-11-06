import Link from "next/link";
import { signOut } from "@/app/actions";
import { getDict, getLocale } from "@/lib/i18n";
import { getUser, isAdminEmail, isSupabaseConfigured } from "@/lib/supabase/server";
import { LangSwitch } from "./LangSwitch";
import { NavLinks } from "./NavLinks";

export async function Header() {
  const locale = await getLocale();
  const t = getDict(locale);
  const user = isSupabaseConfigured() ? await getUser() : null;

  const links = [
    { href: "/", label: t.home },
    { href: "/catalog", label: t.catalog },
    ...(user ? [{ href: "/profile", label: t.profile }] : []),
    ...(user && isAdminEmail(user.email) ? [{ href: "/admin", label: t.admin }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/" className="text-xl font-extrabold tracking-tight">
          Kyr<span className="text-neon">Anime</span>
        </Link>

        <NavLinks items={links} />

        <form
          action="/search"
          className="order-last w-full md:order-none md:ml-2 md:w-auto md:max-w-xs md:flex-1"
        >
          <label htmlFor="q" className="sr-only">
            {t.search}
          </label>
          <input id="q" name="q" type="search" placeholder={t.searchPlaceholder} className="input" />
        </form>

        <div className="ml-auto flex items-center gap-2">
          <LangSwitch current={locale} />
          {user ? (
            <form action={signOut} className="hidden md:block">
              <button className="btn-ghost" type="submit">
                {t.logout}
              </button>
            </form>
          ) : (
            <Link href="/login" className="btn-primary">
              {t.login}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
