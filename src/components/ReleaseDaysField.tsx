const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** Выбор дней недели, когда выходят новые серии (значения 1–7, 1 = понедельник). */
export function ReleaseDaysField({ defaultDays = [] }: { defaultDays?: number[] }) {
  return (
    <fieldset>
      <legend className="label">Дни выхода серий</legend>
      <div className="flex flex-wrap gap-2">
        {DAYS.map((label, i) => {
          const value = i + 1;
          const id = `release-day-${value}`;
          return (
            <div key={value}>
              <input
                id={id}
                type="checkbox"
                name="release_days"
                value={value}
                defaultChecked={defaultDays.includes(value)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className="flex min-w-12 cursor-pointer items-center justify-center rounded-lg border border-ink-300 px-3 py-2.5 text-sm font-medium transition peer-checked:border-neon peer-checked:bg-neon peer-checked:text-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-neon"
              >
                {label}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
