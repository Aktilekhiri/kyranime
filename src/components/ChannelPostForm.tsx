"use client";

import { useActionState, useState } from "react";
import { sendChannelPost, type PostState } from "@/app/actions";

type T = { id: string; title_ky: string; title_ru: string; poster_url: string | null; description_ky: string | null };

/** Пост в канал с двойным подтверждением: сначала предпросмотр, потом «Да, отправить». */
export function ChannelPostForm({ titles }: { titles: T[] }) {
  const [state, action, pending] = useActionState<PostState, FormData>(async (prev, fd) => sendChannelPost(prev, fd), undefined);
  const [kind, setKind] = useState<"title" | "episode" | "custom">("title");
  const [titleId, setTitleId] = useState(titles[0]?.id ?? "");
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const title = titles.find((t) => t.id === titleId);
  const reset = () => setConfirm(false);

  const poster = kind === "custom" ? image : title?.poster_url;
  const preview =
    kind === "custom"
      ? text
      : kind === "title"
        ? `✨ Сайтка жаңы аниме кошулду!\n\n${title?.title_ky ?? ""}\n\n${(title?.description_ky ?? "").slice(0, 300)}`
        : `🆕 Жаңы серия!\n\n${title?.title_ky ?? ""}`;

  return (
    <form action={action} onChange={reset} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      <div role="tablist" className="flex gap-1">
        {([["title", "Новое аниме"], ["episode", "Серия"], ["custom", "Своё сообщение"]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => { setKind(k); reset(); }}
            className={`border-b-2 px-3 py-2 font-semibold ${kind === k ? "border-neon text-snow" : "border-transparent text-snow-dim"}`}>
            {label}
          </button>
        ))}
      </div>

      {kind !== "custom" ? (
        <div className="space-y-3">
          <select name="title_id" value={titleId} onChange={(e) => setTitleId(e.target.value)} className="input">
            {titles.map((t) => <option key={t.id} value={t.id}>{t.title_ru}</option>)}
          </select>
          {kind === "episode" && (
            <div className="flex gap-3">
              <input name="season" type="number" min={1} defaultValue={1} className="input" aria-label="Сезон" placeholder="Сезон" />
              <input name="number" type="number" min={1} required className="input" aria-label="Номер серии" placeholder="Номер серии" />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <textarea name="text" value={text} onChange={(e) => setText(e.target.value)} rows={6} className="input" placeholder="Текст сообщения" />
          <input name="image" value={image} onChange={(e) => setImage(e.target.value)} type="url" className="input" placeholder="Ссылка на картинку (https://…), по желанию" />
          <div className="flex gap-3">
            <input name="button_text" className="input" placeholder="Текст кнопки" />
            <input name="button_url" type="url" className="input" placeholder="Ссылка кнопки (https://…)" />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-ink-200 bg-ink-100 p-4">
        <p className="mb-2 text-xs text-snow-dim">Предпросмотр (точный вид покажет Telegram)</p>
        {poster && /^https:\/\//.test(poster) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt="" className="mb-3 max-h-64 rounded-lg" />
        )}
        <p className="whitespace-pre-wrap text-sm">{preview}</p>
      </div>

      {state?.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-neon">{state.ok}</p>}

      {confirm ? (
        <div className="flex gap-3">
          <button type="submit" disabled={pending} className="btn-primary">{pending ? "Отправляю…" : "Да, отправить в канал"}</button>
          <button type="button" onClick={reset} className="btn-ghost">Отмена</button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirm(true)} className="btn-ghost">Отправить в канал…</button>
      )}
    </form>
  );
}
