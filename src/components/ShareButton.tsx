"use client";

import { useState } from "react";

export function ShareButton({ title, label, copied }: { title: string; label: string; copied: string }) {
  const [done, setDone] = useState(false);
  async function share() {
    const url = window.location.href.split("#")[0];
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch {
      return; // человек закрыл окно «Поделиться»
    }
    try {
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {}
  }
  return (
    <button type="button" onClick={share} className="btn-ghost">
      {done ? `✓ ${copied}` : `↗ ${label}`}
    </button>
  );
}
