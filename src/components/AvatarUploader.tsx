"use client";

import { useRef, useState, useTransition } from "react";
import { removeAvatar, uploadAvatar } from "@/app/actions";
import { Avatar } from "@/components/Avatar";

const SIZE = 256;

/** Вырезает квадрат из центра фото и сжимает до 256×256 JPEG (~20–40 КБ). */
async function squareJpeg(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/jpeg", 0.85));
}

export function AvatarUploader({
  url,
  name,
  labels,
}: {
  url: string | null;
  name: string;
  labels: { change: string; remove: string };
}) {
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState<string | null>(url);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    start(async () => {
      try {
        const blob = await squareJpeg(file);
        const fd = new FormData();
        fd.set("avatar", blob, "avatar.jpg");
        const res = await uploadAvatar(fd);
        if (res.ok && res.url) setCurrent(res.url);
        else setError(res.error ?? "Ошибка");
      } catch {
        setError("Не удалось обработать картинку");
      } finally {
        if (input.current) input.current.value = "";
      }
    });
  }

  function onRemove() {
    setError(null);
    start(async () => {
      await removeAvatar(new FormData());
      setCurrent(null);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Avatar url={current} name={name} size={64} />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => input.current?.click()} disabled={pending} className="btn-ghost disabled:opacity-50">
            {labels.change}
          </button>
          {current && (
            <button type="button" onClick={onRemove} disabled={pending} className="btn-ghost disabled:opacity-50">
              {labels.remove}
            </button>
          )}
        </div>
      </div>
      <input ref={input} type="file" accept="image/*" onChange={onPick} className="sr-only" tabIndex={-1} />
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
