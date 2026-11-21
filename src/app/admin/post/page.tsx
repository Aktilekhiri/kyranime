import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChannelPostForm } from "@/components/ChannelPostForm";
import { createClient, getUser, isAdminEmail } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Пост в канал" };
export const dynamic = "force-dynamic";

export default async function AdminPostPage() {
  const user = await getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/");
  const supabase = (await createClient())!;
  const { data } = await supabase
    .from("titles")
    .select("id, title_ky, title_ru, poster_url, description_ky")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link href="/admin" className="text-sm text-snow-dim hover:text-snow">← Админка</Link>
      <h1 className="text-2xl font-bold">Пост в канал</h1>
      <ChannelPostForm titles={data ?? []} />
    </div>
  );
}
