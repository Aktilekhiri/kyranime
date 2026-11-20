"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { startTelegramLink } from "@/app/actions";

/** Привязка Telegram к текущему аккаунту: открывает бота и сама обновляет страницу, когда привязка прошла. */
export function TelegramLinkButton({ label, hint }: { label: string; hint: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  async function begin() {
    setBusy(true);
    const t = await startTelegramLink();
    if ("error" in t) {
      setError(t.error);
      return setBusy(false);
    }
    window.open(t.url, "_blank", "noopener");
    let n = 0;
    timer.current = setInterval(() => {
      router.refresh();
      if (++n > 60 && timer.current) {
        clearInterval(timer.current);
        setBusy(false);
      }
    }, 3000);
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={begin} disabled={busy} className="btn-primary">
        ✈ {label}
      </button>
      <p className="text-sm text-snow-dim">{error ?? hint}</p>
    </div>
  );
}
