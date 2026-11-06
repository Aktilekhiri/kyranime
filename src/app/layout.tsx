import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: { default: "KyrAnime — Аниме кыргыз тилинде", template: "%s · KyrAnime" },
  description: "Аниме кыргыз тилинде: кол менен жасалган дубляж. Аниме на кыргызском языке.",
};

export const viewport: Viewport = { themeColor: "#0a0a0a" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale === "ky" ? "ky" : "ru"}>
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
