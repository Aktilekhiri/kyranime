import { cookies } from "next/headers";

export type Theme = "dark" | "light" | "blue";

export const THEMES: Theme[] = ["dark", "light", "blue"];
export const DEFAULT_THEME: Theme = "dark";

export async function getTheme(): Promise<Theme> {
  const store = await cookies();
  const value = store.get("theme")?.value;
  return THEMES.includes(value as Theme) ? (value as Theme) : DEFAULT_THEME;
}
