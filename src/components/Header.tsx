import Link from "next/link";
import { signOut } from "@/app/actions";
import { getDict, getLocale } from "@/lib/i18n";
import { getViewer, isAdminEmail, isSupabaseConfigured } from "@/lib/supabase/server";
import { LangSwitch } from "./LangSwitch";
import { NavLinks } from "./NavLinks";
import { ThemeSwitch } from "./ThemeSwitch";

export async function Header() {
  const locale = await getLocale();
  const t = getDict(locale);
  const user = isSupabaseConfigured() ? await getViewer() : null;

  const links = [
    { href: "/", label: t.home },
    { href: "/catalog", label: t.catalog },
    { href: "/chat", label: t.chat },
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

        <div className="order-last flex w-full items-center gap-3 md:order-none md:ml-2 md:w-auto md:max-w-xs md:flex-1">
          <form action="/search" className="min-w-0 flex-1">
            <label htmlFor="q" className="sr-only">
              {t.search}
            </label>
            <input id="q" name="q" type="search" placeholder={t.searchPlaceholder} className="input" />
          </form>
          {/* На телефоне кружки тем рядом с поиском, на ПК справа в шапке */}
          <ThemeSwitch className="flex md:hidden" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitch className="hidden md:flex" />
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
