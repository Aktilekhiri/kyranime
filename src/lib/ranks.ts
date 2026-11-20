import type { Dict } from "@/lib/i18n";

/** Звание по числу комментариев: растёт само, выдавать ничего не нужно. */
export function rankLabel(commentCount: number, t: Dict): string {
  if (commentCount >= 100) return t.rank4;
  if (commentCount >= 30) return t.rank3;
  if (commentCount >= 5) return t.rank2;
  return t.rank1;
}

/** Сколько дней до ближайшего выхода серии (0 = сегодня). days: 1 = понедельник … 7 = воскресенье, время Бишкека. */
export function daysUntilRelease(days: number[] | null | undefined, now = new Date()): number | null {
  const valid = (days ?? []).filter((d) => d >= 1 && d <= 7);
  if (valid.length === 0) return null;
  const short = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bishkek", weekday: "short" }).format(now);
  const today = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(short) + 1;
  if (today === 0) return null;
  return Math.min(...valid.map((d) => (d - today + 7) % 7));
}
