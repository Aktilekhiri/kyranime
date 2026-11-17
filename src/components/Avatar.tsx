/* eslint-disable @next/next/no-img-element */
/** Аватарка: картинка, а если её нет, круг с первой буквой ника. */
export function Avatar({ url, name, size = 32 }: { url?: string | null; name: string; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.45) };
  if (url) {
    return <img src={url} alt="" width={size} height={size} loading="lazy" style={style} className="shrink-0 rounded-full object-cover" />;
  }
  return (
    <span style={style} className="flex shrink-0 items-center justify-center rounded-full bg-snow font-black text-ink" aria-hidden="true">
      {(name || "?").charAt(0).toUpperCase()}
    </span>
  );
}
