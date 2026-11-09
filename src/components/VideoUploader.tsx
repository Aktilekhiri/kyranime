"use client";

import { useRef, useState } from "react";
import { createBunnyUpload } from "@/app/actions";
import { nearestAspect } from "@/lib/social";

type Meta = { duration: number; width: number; height: number };

/** Читает длительность и размер кадра прямо из выбранного файла. */
function readMeta(file: File): Promise<Meta | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    const done = (meta: Meta | null) => {
      URL.revokeObjectURL(url);
      resolve(meta);
    };
    video.onloadedmetadata = () => done({ duration: video.duration, width: video.videoWidth, height: video.videoHeight });
    video.onerror = () => done(null);
    video.src = url;
  });
}

/**
 * Загрузка видео с телефона или компьютера прямо в Bunny (возобновляемая: после обрыва связи продолжится).
 * После загрузки сама заполняет ссылку, длительность и формат кадра в форме.
 */
export function VideoUploader() {
  const root = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  async function pick(f: File | null) {
    setFile(f);
    setMeta(f ? await readMeta(f) : null);
    setState("idle");
    setProgress(0);
    setMessage("");
  }

  function fillForm(playUrl: string) {
    const form = root.current?.closest("form");
    if (!form) return;
    const url = form.querySelector<HTMLInputElement>('input[name="hls_url"]');
    if (url) url.value = playUrl;
    const minutes = form.querySelector<HTMLInputElement>('input[name="duration_min"]');
    if (minutes && !minutes.value && meta?.duration) minutes.value = String(Math.max(1, Math.round(meta.duration / 60)));
    const aspect = form.querySelector<HTMLSelectElement>('select[name="aspect"]');
    if (aspect && meta) aspect.value = nearestAspect(meta.width, meta.height);
  }

  async function start() {
    if (!file) return;
    setState("uploading");
    setProgress(0);
    setMessage("");

    const auth = await createBunnyUpload(file.name);
    if (!auth.ok) {
      setState("error");
      setMessage(
        auth.error === "config"
          ? "В Vercel не настроены BUNNY_API_KEY и BUNNY_LIBRARY_ID."
          : auth.error === "forbidden"
            ? "Войди как админ."
            : "Bunny не принял запрос. Проверь ключ и номер библиотеки.",
      );
      return;
    }

    const tus = await import("tus-js-client");
    const upload = new tus.Upload(file, {
      endpoint: "https://video.bunnycdn.com/tusupload",
      retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
      headers: {
        AuthorizationSignature: auth.signature,
        AuthorizationExpire: String(auth.expirationTime),
        VideoId: auth.videoId,
        LibraryId: auth.libraryId,
      },
      metadata: { filetype: file.type || "video/mp4", title: file.name },
      onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
      onSuccess: () => {
        fillForm(auth.playUrl);
        setProgress(100);
        setState("done");
        setMessage("Готово. Ссылка, длительность и формат кадра заполнены. Видео ещё обрабатывается в Bunny, ссылка заработает через несколько минут. Теперь нажми «Добавить серию» или «Сохранить».");
      },
      onError: () => {
        setState("error");
        setMessage("Загрузка прервалась. Нажми «Загрузить» ещё раз.");
      },
      onShouldRetry: (err) => {
        const status = err.originalResponse?.getStatus() ?? 0;
        return !(status >= 400 && status < 500 && status !== 409 && status !== 423);
      },
    });
    upload.start();
  }

  const mb = file ? (file.size / 1024 / 1024).toFixed(0) : "0";

  return (
    <div ref={root} className="space-y-3 rounded-xl border border-dashed border-ink-300 p-4">
      <p className="text-sm font-semibold">Загрузить видео с телефона</p>
      <input
        type="file"
        accept="video/*,.mkv,.mp4,.mov,.webm,.avi,application/octet-stream"
        disabled={state === "uploading"}
        onChange={(e) => void pick(e.target.files?.[0] ?? null)}
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-neon file:px-4 file:py-2 file:font-semibold file:text-ink"
      />
      {file && (
        <p className="text-xs text-snow-dim">
          {file.name} · {mb} МБ
          {meta?.duration ? ` · ${Math.round(meta.duration / 60)} мин` : ""}
          {meta?.width ? ` · ${meta.width}×${meta.height}` : ""}
        </p>
      )}
      {file && state !== "done" && (
        <button type="button" onClick={() => void start()} disabled={state === "uploading"} className="btn-primary disabled:opacity-50">
          {state === "uploading" ? `Загружается ${progress}%` : "Загрузить в Bunny"}
        </button>
      )}
      {state === "uploading" && (
        <>
          <div className="h-2 overflow-hidden rounded-full bg-ink-200" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-neon transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-snow-dim">Не закрывай эту страницу, пока идёт загрузка. Если пропадёт интернет, она продолжится сама.</p>
        </>
      )}
      {message && (
        <p role="status" className={`text-sm ${state === "error" ? "text-snow" : "text-neon"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
