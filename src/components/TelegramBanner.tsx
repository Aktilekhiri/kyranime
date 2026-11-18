import { getDict, getLocale } from "@/lib/i18n";
import { TELEGRAM_CHAT_URL, TELEGRAM_URL } from "@/lib/site";

/** Баннер со ссылками на Telegram-канал и чат сайта. */
export async function TelegramBanner({ className = "" }: { className?: string }) {
  const t = getDict(await getLocale());
  return (
    <div
      className={`flex flex-wrap items-center gap-4 rounded-2xl border border-[#2aabee]/40 bg-gradient-to-r from-[#2aabee]/20 via-ink-100 to-ink p-5 sm:gap-6 sm:p-6 ${className}`}
    >
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#2aabee]" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff">
          <path d="M21.9 4.3 18.6 20c-.2 1-.9 1.3-1.7.8l-4.8-3.6-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.9 8.9-8c.4-.3-.1-.5-.6-.2L6.4 13.7l-4.7-1.5c-1-.3-1-1 .2-1.5L20.3 3.5c.9-.3 1.6.2 1.6.8z" />
        </svg>
      </span>
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-lg font-bold leading-snug sm:text-xl">{t.tgTitle}</p>
        <p className="mt-1 text-sm text-snow-dim">{t.tgText}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost">
          {t.tgButton}
        </a>
        <a href={TELEGRAM_CHAT_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">
          {t.tgChatButton}
        </a>
      </div>
    </div>
  );
}
