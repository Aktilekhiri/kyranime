import { NextResponse } from "next/server";
import { createClient, getUser, isAdminEmail } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Диагностика для админа: открой /api/diag, чтобы увидеть, что отвечает база по комментариям. */
export async function GET() {
  const user = await getUser();
  if (!user || !isAdminEmail(user.email)) return NextResponse.json({ error: "admin only" }, { status: 403 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "no supabase" });

  const brief = (r: { data: unknown; error: { message: string; code?: string; hint?: string; details?: string } | null }) => ({
    count: Array.isArray(r.data) ? r.data.length : null,
    error: r.error ? { message: r.error.message, code: r.error.code, hint: r.error.hint, details: r.error.details } : null,
  });

  const plain = await supabase.from("comments").select("id, title_id, season, number, body").limit(50);
  const withProfile = await supabase.from("comments").select("id, profiles(username)").limit(50);
  const withReactions = await supabase.from("comments").select("id, comment_reactions(user_id, emoji)").limit(50);
  const full = await supabase
    .from("comments")
    .select("id, user_id, body, created_at, parent_id, reply_to_id, profiles(username), comment_reactions(user_id, emoji)")
    .limit(50);
  const reviews = await supabase.from("reviews").select("id").limit(50);

  return NextResponse.json({
    me: { id: user.id },
    plain: { ...brief(plain), sample: (plain.data ?? []).slice(0, 3) },
    withProfile: brief(withProfile),
    withReactions: brief(withReactions),
    full: brief(full),
    reviews: brief(reviews),
  });
}
