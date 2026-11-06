import { headers } from "next/headers";
import { setTheme } from "@/app/actions";
import { getDict, getLocale } from "@/lib/i18n";
import { getTheme, THEMES, type Theme } from "@/lib/theme";

// Цвета кружков не зависят от текущей темы: показывают, какая тема будет
const SWATCH: Record<Theme, string> = {
  dark: "linear-gradient(135deg, #0a0a0a 55%, #22ff88 55%)",
  light: "linear-gradient(135deg, #ffffff 55%, #0052ff 55%)",
  blue: "linear-gradient(135deg, #08143c 55%, #ffd60a 55%)",
};

/** Переключатель темы: серверные формы, cookie + возврат на ту же страницу (без мигания). */
export async function ThemeSwitch({ className = "" }: { className?: string }) {
  const [current, locale, h] = await Promise.all([getTheme(), getLocale(), headers()]);
  const t = getDict(locale);
  const returnTo = h.get("x-pathname") ?? "/";
  const names: Record<Theme, string> = { dark: t.themeDark, light: t.themeLight, blue: t.themeBlue };

  return (
    <div role="group" aria-label={t.theme} className={`items-center gap-1.5 ${className}`}>
      {THEMES.map((theme) => (
        <form key={theme} action={setTheme.bind(null, theme, returnTo)}>
          <button
            type="submit"
            title={names[theme]}
            aria-label={names[theme]}
            aria-pressed={current === theme}
            style={{ background: SWATCH[theme] }}
            className={`size-8 rounded-full border-2 transition ${
              current === theme ? "border-neon" : "border-ink-300 hover:border-snow"
            }`}
          />
        </form>
      ))}
    </div>
  );
}
