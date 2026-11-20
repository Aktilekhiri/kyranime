import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { countCommentsByUsers, listUsers } from "@/lib/data";
import { getDict, getLocale } from "@/lib/i18n";
import { rankLabel } from "@/lib/ranks";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDict(await getLocale()).users, robots: { index: false, follow: false } };
}
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const t = getDict(await getLocale());
  const users = await listUsers();
  const counts = await countCommentsByUsers(users.map((u) => u.id));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {t.users} <span className="text-base font-normal text-snow-dim">({users.length})</span>
      </h1>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((u) => (
          <li key={u.id}>
            <Link href={`/u/${encodeURIComponent(u.username)}`} className="card flex items-center gap-3 p-3 hover:border-neon">
              <Avatar url={u.avatar_url} name={u.username} size={44} />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{u.username}</span>
                <span className="block text-xs text-snow-dim">
                  {rankLabel(counts[u.id] ?? 0, t)} · {counts[u.id] ?? 0}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
