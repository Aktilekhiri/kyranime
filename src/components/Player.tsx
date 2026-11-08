"use client";

import Hls from "hls.js";
import { useEffect, useRef } from "react";
import { saveProgress } from "@/app/actions";

type Props = {
  src: string;
  episodeId: string;
  startAt: number;
  nextHref: string | null;
  canSave: boolean;
  aspect?: string;
};

export function Player({ src, episodeId, startAt, nextHref, canSave, aspect = "16/9" }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  // Подключаем HLS (Safari играет m3u8 сам, остальным нужен hls.js)
  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    let hls: Hls | null = null;
    const seekToStart = () => {
      if (startAt > 5) video.currentTime = startAt;
    };

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", seekToStart, { once: true });
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, seekToStart);
    } else {
      video.src = src;
    }

    return () => hls?.destroy();
  }, [src, startAt]);

  // Сохраняем прогресс раз в 15 секунд и при паузе
  useEffect(() => {
    const video = ref.current;
    if (!video || !canSave) return;

    let last = 0;
    const save = () => {
      if (video.currentTime > 5) void saveProgress(episodeId, video.currentTime);
    };
    const onTime = () => {
      if (Date.now() - last > 15000) {
        last = Date.now();
        save();
      }
    };
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("pause", save);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("pause", save);
    };
  }, [episodeId, canSave]);

  return (
    <video
      ref={ref}
      controls
      playsInline
      preload="metadata"
      className="w-full rounded-xl bg-black"
      style={{ aspectRatio: aspect }}
      onEnded={() => {
        if (nextHref) window.location.href = nextHref;
      }}
    />
  );
}
