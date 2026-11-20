"use client";

import { useState, type ReactNode } from "react";

function Spoiler({ children, label }: { children: string; label: string }) {
  const [open, setOpen] = useState(false);
  return open ? (
    <span className="rounded bg-ink-200 px-1">{children}</span>
  ) : (
    <button type="button" onClick={() => setOpen(true)} title={label} aria-label={label} className="rounded bg-snow-dim/60 px-1 text-transparent select-none">
      {children}
    </button>
  );
}

/** Текст комментария: ||так|| прячет спойлер до нажатия. */
export function CommentBody({ text, label }: { text: string; label: string }) {
  const parts: ReactNode[] = [];
  const re = /\|\|([^|]+?)\|\|/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<Spoiler key={i++} label={label}>{m[1]}</Spoiler>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
