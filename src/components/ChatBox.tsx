"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteChatMessage, fetchChat, sendChat } from "@/app/actions";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { ChatMessage } from "@/lib/types";

type Labels = {
  placeholder: string;
  send: string;
  empty: string;
  login: string;
  delete: string;
  wait: string;
  error: string;
};

type Props = {
  room: string;
  initial: ChatMessage[];
  viewerId: string | null;
  isAdmin: boolean;
  labels: Labels;
  /** Высота списка сообщений (классы Tailwind) */
  heightClass?: string;
};

const MAX_MESSAGES = 200;

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bishkek" });
}

/** Чат: новые сообщения приходят всем сразу (Supabase Realtime). Если связь не подключилась, чат обновляется раз в 15 секунд. */
export function ChatBox({ room, initial, viewerId, isAdmin, labels, heightClass = "h-80" }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [live, setLive] = useState(false);
  const [text, setText] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  const merge = (incoming: ChatMessage[]) =>
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      for (const m of incoming) byId.set(m.id, m);
      return [...byId.values()]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .slice(-MAX_MESSAGES);
    });

  // Новые сообщения в реальном времени
  useEffect(() => {
    const supabase = createBrowserSupabase();
    if (!supabase) return;
    const channel = supabase
      .channel(`chat:${room}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room=eq.${room}` },
        (payload) => merge([payload.new as ChatMessage]),
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, (payload) => {
        const id = (payload.old as { id?: string }).id;
        if (id) setMessages((prev) => prev.filter((m) => m.id !== id));
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [room]);

  // Запасной вариант: если realtime не работает, подгружаем сообщения раз в 15 секунд
  useEffect(() => {
    if (live) return;
    const timer = setInterval(() => {
      void fetchChat(room).then((fresh) => setMessages(fresh));
    }, 15000);
    return () => clearInterval(timer);
  }, [live, room]);

  // Прокрутка вниз при новых сообщениях
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || pending) return;
    setNote(null);
    startTransition(async () => {
      const res = await sendChat(room, value);
      if (res.ok) {
        setText("");
        merge([res.message]);
      } else if (res.error === "wait") {
        setNote(labels.wait);
      } else if (res.error === "login") {
        window.location.href = "/login";
      } else if (res.error !== "empty") {
        setNote(labels.error);
      }
    });
  }

  function remove(id: string) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    void deleteChatMessage(id);
  }

  return (
    <div className="card overflow-hidden">
      <div ref={listRef} className={`${heightClass} space-y-3 overflow-y-auto p-4`} aria-live="polite">
        {messages.length === 0 ? (
          <p className="text-sm text-snow-dim">{labels.empty}</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="text-sm">
              <div className="flex items-baseline gap-2">
                <span className={`font-semibold ${m.user_id === viewerId ? "text-neon" : ""}`}>{m.username}</span>
                <span className="text-xs text-snow-dim">{time(m.created_at)}</span>
                {(isAdmin || m.user_id === viewerId) && (
                  <button
                    type="button"
                    onClick={() => remove(m.id)}
                    className="ml-auto text-xs text-snow-dim underline hover:text-snow"
                  >
                    {labels.delete}
                  </button>
                )}
              </div>
              <p className="whitespace-pre-line break-words text-snow/90">{m.body}</p>
            </div>
          ))
        )}
      </div>

      {viewerId ? (
        <form onSubmit={submit} className="flex gap-2 border-t border-ink-200 p-3">
          <label htmlFor={`chat-${room}`} className="sr-only">
            {labels.placeholder}
          </label>
          <input
            id={`chat-${room}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            autoComplete="off"
            placeholder={labels.placeholder}
            className="input min-w-0 flex-1"
          />
          <button type="submit" disabled={pending || !text.trim()} className="btn-primary shrink-0 disabled:opacity-50">
            {labels.send}
          </button>
        </form>
      ) : (
        <p className="border-t border-ink-200 p-3 text-sm text-snow-dim">
          <Link href="/login" className="text-neon underline underline-offset-2">
            {labels.login}
          </Link>
        </p>
      )}
      {note && (
        <p role="status" className="border-t border-ink-200 px-4 py-2 text-xs text-snow-dim">
          {note}
        </p>
      )}
    </div>
  );
}
