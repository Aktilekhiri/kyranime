"use client";

import { useEffect, useState } from "react";

/** Баннер с текстом ошибки действия (комментарий, оценка и т.д.). Исчезает сам. */
export function FlashError({ message }: { message: string }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(false);
    if (!message) return;
    try {
      document.cookie = "flash=; path=/; max-age=0";
    } catch {}
    const id = setTimeout(() => setHidden(true), 15000);
    return () => clearTimeout(id);
  }, [message]);

  if (!message || hidden) return null;
  return (
    <div role="alert" className="fixed inset-x-3 top-3 z-50 mx-auto max-w-xl rounded-xl border border-red-500/60 bg-ink-100 p-3 text-sm text-snow shadow-lg">
      <div className="flex items-start gap-3">
        <p className="flex-1 break-words">{message}</p>
        <button type="button" onClick={() => setHidden(true)} aria-label="Закрыть" className="shrink-0 px-1 text-snow-dim">
          ✕
        </button>
      </div>
    </div>
  );
}
