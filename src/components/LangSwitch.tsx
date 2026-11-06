import { headers } from "next/headers";
import { setLocale } from "@/app/actions";
import type { Locale } from "@/lib/i18n";

// Переключатель языка: серверная форма, кладёт cookie и возвращает на ту же страницу.
export async function LangSwitch({ current }: { current: Locale }) {
  const h = await headers();
  const returnTo = h.get("x-pathname") ?? "/";

  return (
    <div className="flex overflow-hidden rounded-lg border border-ink-300 text-xs font-semibold">
      {(["ky", "ru"] as const).map((l) => (
        <form key={l} action={setLocale.bind(null, l, returnTo)}>
          <button
            type="submit"
            aria-pressed={current === l}
            className={`px-3 py-2 uppercase transition ${
              current === l ? "bg-snow text-ink" : "text-snow-dim hover:text-snow"
            }`}
          >
            {l === "ky" ? "KG" : "RU"}
          </button>
        </form>
      ))}
    </div>
  );
}
