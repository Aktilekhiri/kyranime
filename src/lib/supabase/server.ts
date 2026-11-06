import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Клиент для серверных компонентов и server actions. Возвращает null в демо-режиме. */
export async function createClient() {
  if (!isSupabaseConfigured()) return null;
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            // вызвано из серверного компонента: куки обновит middleware
          }
        },
      },
    },
  );
}

// cache(): в рамках одного запроса пользователь запрашивается у Supabase только раз
export const getUser = cache(async () => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
});

export type Viewer = { id: string; email: string | null };

// Для показа интерфейса (шапка, избранное, прогресс). getClaims проверяет подпись токена
// на месте, без сетевого запроса к Supabase. Для изменения данных и админки остаётся getUser().
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

export function isAdminEmail(email: string | undefined | null): boolean {
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(admin && email && email.toLowerCase() === admin);
}
