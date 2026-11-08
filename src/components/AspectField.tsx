import { ASPECTS, safeAspect } from "@/lib/social";

/** Формат кадра серии: если у видео сверху и снизу чёрные полосы, выбери 2:1. */
export function AspectField({ defaultValue }: { defaultValue?: string | null }) {
  return (
    <div>
      <label htmlFor="aspect" className="label">
        Формат кадра
      </label>
      <select id="aspect" name="aspect" defaultValue={safeAspect(defaultValue)} className="input">
        {ASPECTS.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>
    </div>
  );
}
