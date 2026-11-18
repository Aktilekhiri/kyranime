/** Основной адрес сайта (без слэша в конце). Задаётся в Vercel: NEXT_PUBLIC_SITE_URL */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://kyranime.com").replace(/\/+$/, "").replace(/^(?!https?:\/\/)/, "https://");

/** Telegram-канал и чат сайта */
export const TELEGRAM_URL = "https://t.me/kyranime";
