import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Клиент с полным доступом (service role). Только на сервере: ключ SUPABASE_SERVICE_ROLE_KEY хранится в Vercel и никогда не попадает в браузер. */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function telegramAuthConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.TELEGRAM_WEBHOOK_SECRET);
}
