import { getDict, getLocale } from "@/lib/i18n";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function Footer() {
  const t = getDict(await getLocale());
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "rights@kyranime.example";

  return (
    <footer className="border-t border-ink-200 py-8 text-sm text-snow-dim">
      <div className="mx-auto max-w-6xl space-y-3 px-4 sm:px-6">
        <p className="font-semibold text-snow">{t.forRightsholders}</p>
        <p className="max-w-3xl">
          {t.rightsText}{" "}
          <a className="text-neon underline underline-offset-2" href={`mailto:${contact}`}>
            {contact}
          </a>
        </p>
        <p>{t.footerNote}</p>
        {!isSupabaseConfigured() && <p className="text-snow-dim/70">{t.demoNotice}</p>}
      </div>
    </footer>
  );
}
