"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { checkTelegramLogin, startTelegramLogin } from "@/app/actions";

type Labels = { button: string; waiting: string; failed: string; open: string; or: string };

/** Вход через бота: кнопка открывает Telegram, человек нажимает Start, страница сама замечает это и входит. */
export function TelegramLogin({ next, labels }: { next: string; labels: Labels }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "waiting" | "failed">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  async function begin() {
    const t = await startTelegramLogin();
    if (!t) return setState("failed");
    setUrl(t.url);
    setState("waiting");
    window.open(t.url, "_blank", "noopener");
    const startedAt = Date.now();
    timer.current = setInterval(async () => {
      if (Date.now() - startedAt > 9 * 60 * 1000) {
        if (timer.current) clearInterval(timer.current);
        return setState("failed");
      }
      const r = await checkTelegramLogin(t.url.split("start=login_")[1]);
      if (r === "pending") return;
      if (timer.current) clearInterval(timer.current);
      if (r === "ok") {
        router.push(next.startsWith("/") && !next.startsWith("//") ? next : "/");
        router.refresh();
      } else setState("failed");
    }, 2000);
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-snow-dim">{labels.or}</p>
      <button type="button" onClick={begin} disabled={state === "waiting"} className="btn-ghost w-full">
        ✈ {labels.button}
      </button>
      {state === "waiting" && url && (
        <p role="status" className="text-center text-sm text-snow-dim">
          {labels.waiting}{" "}
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-neon underline underline-offset-2">
            {labels.open}
          </a>
        </p>
      )}
      {state === "failed" && (
        <p role="alert" className="text-center text-sm text-snow-dim">
          {labels.failed}
        </p>
      )}
    </div>
  );
}
