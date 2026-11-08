import type { Metadata } from "next";
import { ChatBox } from "@/components/ChatBox";
import { listChat } from "@/lib/data";
import { getDict, getLocale } from "@/lib/i18n";
import { chatLabels } from "@/lib/social";
import { getViewer, isAdminEmail } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Чат" };
export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const locale = await getLocale();
  const t = getDict(locale);
  const user = await getViewer();
  const messages = await listChat("global");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">{t.chatGlobal}</h1>
      <ChatBox
        room="global"
        initial={messages}
        viewerId={user?.id ?? null}
        isAdmin={isAdminEmail(user?.email)}
        labels={chatLabels(t)}
        heightClass="h-[60vh] min-h-72"
      />
    </div>
  );
}
