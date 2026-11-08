import Link from "next/link";
import { addComment, deleteComment, toggleReaction } from "@/app/actions";
import type { Dict } from "@/lib/i18n";
import { REACTIONS } from "@/lib/social";
import type { Comment } from "@/lib/types";

type Props = {
  heading: string;
  comments: Comment[];
  titleId: string;
  slug: string;
  /** Для комментариев к серии; без них комментарий относится ко всему тайтлу */
  episode?: { season: number; number: number };
  viewerId: string | null;
  isAdmin: boolean;
  t: Dict;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", { timeZone: "Asia/Bishkek" });
}

const SUMMARY = "cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden";

export function Comments({ heading, comments, titleId, slug, episode, viewerId, isAdmin, t }: Props) {
  const byId = new Map(comments.map((c) => [c.id, c]));
  const roots = comments.filter((c) => !c.parent_id || !byId.has(c.parent_id));
  const repliesOf = (id: string) =>
    comments.filter((c) => c.parent_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at));

  function renderComment(c: Comment, isReply: boolean) {
    const target = isReply && c.reply_to_id && c.reply_to_id !== c.parent_id ? byId.get(c.reply_to_id) : null;
    return (
      <li key={c.id} className={isReply ? "border-l-2 border-ink-300 pl-3" : "card p-4"}>
        <div className="flex items-center justify-between gap-3">
          <span className="font-semibold">{c.username}</span>
          <span className="text-xs text-snow-dim">{formatDate(c.created_at)}</span>
        </div>
        {target && (
          <p className="mt-1 line-clamp-1 border-l-2 border-neon pl-2 text-xs text-snow-dim">
            ↩ {target.username}: {target.body}
          </p>
        )}
        <p className="mt-2 whitespace-pre-line break-words text-sm text-snow/90">{c.body}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {c.reactions.map((r) =>
            viewerId ? (
              <form key={r.emoji} action={toggleReaction}>
                <input type="hidden" name="comment_id" value={c.id} />
                <input type="hidden" name="emoji" value={r.emoji} />
                <input type="hidden" name="slug" value={slug} />
                <button
                  type="submit"
                  aria-pressed={r.mine}
                  className={`rounded-full border px-2.5 py-1 text-sm transition ${
                    r.mine ? "border-neon bg-neon/15" : "border-ink-300 hover:border-snow"
                  }`}
                >
                  {r.emoji} <span className="text-xs">{r.count}</span>
                </button>
              </form>
            ) : (
              <span key={r.emoji} className="rounded-full border border-ink-300 px-2.5 py-1 text-sm">
                {r.emoji} <span className="text-xs">{r.count}</span>
              </span>
            ),
          )}

          {viewerId && (
            <details className="relative">
              <summary
                aria-label={t.addReaction}
                title={t.addReaction}
                className={`${SUMMARY} rounded-full border border-ink-300 px-2.5 py-1 text-sm text-snow-dim hover:border-snow`}
              >
                ☺ +
              </summary>
              <div className="absolute left-0 z-10 mt-2 flex gap-1 rounded-xl border border-ink-300 bg-ink p-1.5 shadow-lg">
                {REACTIONS.map((emoji) => (
                  <form key={emoji} action={toggleReaction}>
                    <input type="hidden" name="comment_id" value={c.id} />
                    <input type="hidden" name="emoji" value={emoji} />
                    <input type="hidden" name="slug" value={slug} />
                    <button type="submit" className="rounded-lg px-2 py-1.5 text-xl hover:bg-ink-100">
                      {emoji}
                    </button>
                  </form>
                ))}
              </div>
            </details>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-start gap-x-4 gap-y-2">
          {viewerId && (
            <details className="w-full">
              <summary className={`${SUMMARY} text-xs text-snow-dim underline hover:text-snow`}>{t.reply}</summary>
              <form action={addComment} className="mt-2 space-y-2">
                <input type="hidden" name="title_id" value={titleId} />
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="reply_to_id" value={c.id} />
                <label htmlFor={`reply-${c.id}`} className="sr-only">
                  {t.reply}
                </label>
                <textarea
                  id={`reply-${c.id}`}
                  name="body"
                  rows={2}
                  required
                  maxLength={2000}
                  placeholder={`↩ ${c.username}`}
                  className="input"
                />
                <button type="submit" className="btn-primary">
                  {t.send}
                </button>
              </form>
            </details>
          )}
          {(isAdmin || c.user_id === viewerId) && (
            <form action={deleteComment}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="slug" value={slug} />
              <button type="submit" className="text-xs text-snow-dim underline hover:text-snow">
                {t.delete}
              </button>
            </form>
          )}
        </div>

        {!isReply && repliesOf(c.id).length > 0 && (
          <ul className="mt-3 space-y-3">{repliesOf(c.id).map((r) => renderComment(r, true))}</ul>
        )}
      </li>
    );
  }

  const fieldId = `comment-${episode ? "ep" : "title"}`;

  return (
    <section className="max-w-2xl space-y-4">
      <h2 className="text-xl font-bold">
        {heading} <span className="text-base font-normal text-snow-dim">({comments.length})</span>
      </h2>

      {viewerId ? (
        <form action={addComment} className="card space-y-3 p-4">
          <input type="hidden" name="title_id" value={titleId} />
          <input type="hidden" name="slug" value={slug} />
          {episode && (
            <>
              <input type="hidden" name="season" value={episode.season} />
              <input type="hidden" name="number" value={episode.number} />
            </>
          )}
          <label htmlFor={fieldId} className="label">
            {t.writeReview}
          </label>
          <textarea
            id={fieldId}
            name="body"
            rows={3}
            required
            maxLength={2000}
            placeholder={t.reviewPlaceholder}
            className="input"
          />
          <button type="submit" className="btn-primary">
            {t.send}
          </button>
        </form>
      ) : (
        <p className="card p-4 text-sm text-snow-dim">
          <Link href="/login" className="text-neon underline underline-offset-2">
            {t.loginToReview}
          </Link>
        </p>
      )}

      {roots.length === 0 ? (
        <p className="text-sm text-snow-dim">{t.noReviews}</p>
      ) : (
        <ul className="space-y-3">{roots.map((c) => renderComment(c, false))}</ul>
      )}
    </section>
  );
}
