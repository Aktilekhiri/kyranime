"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { saveProgress } from "@/app/actions";
import { Player } from "@/components/Player";

type Labels = { prev: string; next: string; nextIn: string; watchNow: string; cancel: string; fullscreen: string };

type Props = {
  /** Ссылка плеера Bunny (iframe); если её нет, играем HLS напрямую */
  embedSrc: string | null;
  src: string;
  title: string;
  episodeId: string;
  startAt: number;
  canSave: boolean;
  aspect: string;
  prevHref: string | null;
  nextHref: string | null;
  /** Секунда, с которой идут титры: тогда отсчёт до следующей серии начнётся с неё, иначе в конце */
  outroSec: number | null;
  labels: Labels;
};

const COUNTDOWN = 10;

/** Плеер серии: стрелки «‹ ›» по краям, отсчёт 10 секунд до следующей серии (можно отменить), свой полноэкранный режим. */
export function EpisodeFrame({ embedSrc, src, title, episodeId, startAt, canSave, aspect, prevHref, nextHref, outroSec, labels }: Props) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const dismissed = useRef(false);
  const [count, setCount] = useState<number | null>(null);
  // Пока серия идёт, кнопки спрятаны; на паузе (нажали на видео) появляются
  const [playing, setPlaying] = useState(false);

  const start = () => {
    if (!nextHref || dismissed.current) return;
    setCount((c) => (c === null ? COUNTDOWN : c));
  };
  const lastSaved = useRef(0);
  const onPlayback = (seconds: number, duration: number) => {
    // Плеер Bunny сам прогресс не пишет: запоминаем место просмотра раз в 15 секунд
    if (embedSrc && canSave && seconds > 5 && Date.now() - lastSaved.current > 15000) {
      lastSaved.current = Date.now();
      void saveProgress(episodeId, seconds);
    }
    if (!nextHref || dismissed.current || !Number.isFinite(seconds)) return;
    if ((outroSec !== null && seconds >= outroSec) || (duration > 0 && seconds >= duration - 1)) start();
  };
  // Свежие обработчики для слушателя сообщений (он подписывается один раз)
  const handlers = useRef({ onPlayback, start });
  handlers.current = { onPlayback, start };

  // Открытая серия попадает в «Продолжить просмотр», даже если время ещё не известно
  useEffect(() => {
    if (embedSrc && canSave && startAt === 0) void saveProgress(episodeId, 0);
  }, [embedSrc, canSave, startAt, episodeId]);

  // Отсчёт
  useEffect(() => {
    if (count === null || !nextHref) return;
    if (count <= 0) {
      router.push(nextHref);
      return;
    }
    const id = setTimeout(() => setCount((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(id);
  }, [count, nextHref, router]);

  // Плеер Bunny сообщает время и конец серии через postMessage (протокол player.js)
  useEffect(() => {
    if (!embedSrc) return;
    let origin = "*";
    try {
      origin = new URL(embedSrc).origin;
    } catch {}
    const send = (value: string) =>
      frame.current?.contentWindow?.postMessage(
        JSON.stringify({ context: "player.js", version: "0.0.11", method: "addEventListener", value, listener: value }),
        origin,
      );
    const subscribe = () => {
      send("timeupdate");
      send("ended");
      send("play");
      send("pause");
    };
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      let data: unknown = e.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      const d = data as { context?: string; event?: string; value?: { seconds?: number; duration?: number } };
      if (!d || d.context !== "player.js") return;
      if (d.event === "ready") {
        subscribe();
        if (startAt > 5) {
          frame.current?.contentWindow?.postMessage(
            JSON.stringify({ context: "player.js", version: "0.0.11", method: "setCurrentTime", value: startAt }),
            origin,
          );
        }
      }
      else if (d.event === "timeupdate" && d.value) handlers.current.onPlayback(Number(d.value.seconds), Number(d.value.duration));
      else if (d.event === "play") setPlaying(true);
      else if (d.event === "pause") setPlaying(false);
      else if (d.event === "ended") {
        setPlaying(false);
        handlers.current.start();
      }
    };
    window.addEventListener("message", onMessage);
    const el = frame.current;
    el?.addEventListener("load", subscribe);
    return () => {
      window.removeEventListener("message", onMessage);
      el?.removeEventListener("load", subscribe);
    };
  }, [embedSrc, startAt]);

  function toggleFullscreen() {
    const el = wrap.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    void el.requestFullscreen?.().then(() => {
      try {
        void (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.("landscape")?.catch(() => {});
      } catch {}
    });
  }

  // Для плеера Bunny прячем кнопки во время просмотра; свой HLS-плеер не сообщает о паузе, там кнопки всегда видны
  const hidden = embedSrc && playing;
  const round = `absolute z-10 flex size-10 items-center justify-center rounded-full bg-black/55 text-2xl leading-none text-white transition-opacity hover:bg-black/80 ${
    hidden ? "pointer-events-none opacity-0" : "opacity-100"
  }`;

  return (
    <div
      ref={wrap}
      className="relative w-full overflow-hidden rounded-xl bg-black [&:fullscreen]:bg-black [&:fullscreen]:flex [&:fullscreen]:items-center [&:fullscreen]:rounded-none"
      style={embedSrc ? { aspectRatio: aspect } : undefined}
    >
      {embedSrc ? (
        <iframe
          ref={frame}
          src={embedSrc}
          title={title}
          loading="lazy"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 size-full border-0 bg-black"
          style={{ colorScheme: "dark" }}
        />
      ) : (
        <Player src={src} episodeId={episodeId} startAt={startAt} canSave={canSave} aspect={aspect} onTime={onPlayback} onEnded={start} />
      )}

      {prevHref && (
        <Link href={prevHref} aria-label={labels.prev} title={labels.prev} className={`${round} left-2 top-1/2 -translate-y-1/2`}>
          ‹
        </Link>
      )}
      {nextHref && (
        <Link href={nextHref} aria-label={labels.next} title={labels.next} className={`${round} right-2 top-1/2 -translate-y-1/2`}>
          ›
        </Link>
      )}
      <button type="button" onClick={toggleFullscreen} aria-label={labels.fullscreen} title={labels.fullscreen} className={`${round} right-2 top-2 text-lg`}>
        ⛶
      </button>

      {count !== null && count > 0 && nextHref && (
        <div role="status" className="absolute bottom-14 right-3 z-20 flex items-center gap-2 rounded-lg bg-black/85 p-2 pl-3 text-sm text-white">
          <span>{labels.nextIn.replace("{n}", String(count))}</span>
          <button type="button" onClick={() => setCount(0)} className="rounded-md bg-neon px-2.5 py-1 font-semibold text-ink">
            {labels.watchNow}
          </button>
          <button
            type="button"
            onClick={() => {
              dismissed.current = true;
              setCount(null);
            }}
            aria-label={labels.cancel}
            title={labels.cancel}
            className="flex size-7 items-center justify-center rounded-md bg-white/15 hover:bg-white/30"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
