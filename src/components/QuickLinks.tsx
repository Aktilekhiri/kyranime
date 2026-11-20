import Link from "next/link";
import type { Dict } from "@/lib/i18n";

export function QuickLinks({ t }: { t: Dict }) {
  const cls = "shrink-0 rounded-full border border-ink-300 px-4 py-2 text-sm font-medium text-snow-dim transition hover:border-neon hover:text-snow";
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      <Link href="/random" prefetch={false} className={cls}>🎲 {t.randomAnime}</Link>
      <Link href="/schedule" className={cls}>📅 {t.schedule}</Link>
      <Link href="/top" className={cls}>🏆 {t.top}</Link>
      <Link href="/users" className={cls}>👥 {t.users}</Link>
    </div>
  );
}
