import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getDict, getLocale } from "@/lib/i18n";
import { getUser, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { default: "KyrAnime — Аниме кыргыз тилинде", template: "%s · KyrAnime" },
  description: "Аниме кыргыз тилинде: кол менен жасалган дубляж. Аниме на кыргызском языке.",
};

export const viewport: Viewport = { themeColor: "#0a0a0a" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = getDict(locale);
  const user = isSupabaseConfigured() ? await getUser() : null;

  const bottomItems = [
    { href: "/", label: t.home, icon: "home" as const },
    { href: "/catalog", label: t.catalog, icon: "grid" as const },
    { href: "/search", label: t.search, icon: "search" as const },
    // Не вошёл: кнопка ведёт ко входу
    { href: user ? "/profile" : "/login", label: user ? t.profile : t.login, icon: "user" as const },
  ];

  return (
    <html lang={locale === "ky" ? "ky" : "ru"}>
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
        {/* pb-20: чтобы нижняя панель телефона не закрывала подвал */}
        <div className="pb-20 md:pb-0">
          <Footer />
        </div>
        <BottomNav items={bottomItems} />
      </body>
    </html>
  );
}
