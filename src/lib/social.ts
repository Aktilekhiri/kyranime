import type { Dict } from "./i18n";

/** Реакции как в Telegram */
export const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"] as const;

/** Форматы кадра: чтобы у видео не было лишних чёрных полос */
export const ASPECTS = [
  { value: "16/9", label: "16:9 (обычное)" },
  { value: "2/1", label: "2:1 (если сверху и снизу чёрные полосы)" },
  { value: "21/9", label: "21:9 (широкое)" },
  { value: "4/3", label: "4:3 (старые серии)" },
] as const;

export function safeAspect(value: string | null | undefined): string {
  return ASPECTS.some((a) => a.value === value) ? (value as string) : "16/9";
}

/** Комната чата: общий, тайтл или серия */
export const CHAT_ROOM_RE = /^(global|title:[0-9a-f-]{36}|ep:[0-9a-f-]{36}:\d+-\d+)$/;

/** Подписи для чата на нужном языке */
export function chatLabels(t: Dict) {
  return {
    placeholder: t.chatPlaceholder,
    send: t.send,
    empty: t.chatEmpty,
    login: t.chatLogin,
    delete: t.delete,
    wait: t.chatWait,
    older: t.chatOlder,
    error: t.chatError,
  };
}
