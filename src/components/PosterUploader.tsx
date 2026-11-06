"use client";

import { useRef, useState, useTransition } from "react";
import { uploadPoster } from "@/app/actions";

const MAX_W = 800;
const MAX_H = 1200;

/** Уменьшает фото с телефона до разумного размера (JPEG ~0.2–0.5 МБ). */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_W / bitmap.width, MAX_H / bitmap.height);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.85),
  );
}

export function PosterUploader({ titleId, currentUrl }: { titleId: string; currentUrl: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage(null);

    start(async () => {
      try {
        const blob = await shrink(file);
        setPreview(URL.createObjectURL(blob));
        const fd = new FormData();
        fd.set("title_id", titleId);
        fd.set("poster", blob, "poster.jpg");
        const res = await uploadPoster(fd);
        setMessage(res.ok ? { ok: true, text: "Постер сохранён" } : { ok: false, text: res.error ?? "Ошибка" });
      } catch {
        setMessage({ ok: false, text: "Не удалось обработать картинку" });
      } finally {
        if (input.current) input.current.value = "";
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-[2/3] w-40 overflow-hidden rounded-xl border border-ink-200 bg-ink-100">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center px-3 text-center text-xs text-snow-dim">
            Нет постера
          </div>
        )}
      </div>

      <input ref={input} type="file" accept="image/*" onChange={onPick} className="sr-only" id="poster-file" />
      <label
        htmlFor="poster-file"
        className={`btn-primary mx-auto flex w-fit cursor-pointer ${pending ? "pointer-events-none opacity-50" : ""}`}
      >
        {pending ? "Загружаю..." : "Загрузить постер"}
      </label>

      {message && (
        <p role="status" className={`text-center text-sm ${message.ok ? "text-neon" : "text-snow-dim"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
