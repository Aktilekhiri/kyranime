import Link from "next/link";
import { addComment, deleteComment } from "@/app/actions";
import type { Dict } from "@/lib/i18n";
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

export function Comments({ heading, comments, titleId, slug, episode, viewerId, isAdmin, t }: Props) {
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
          <label htmlFor={`comment-${episode ? "ep" : "title"}`} className="label">
            {t.writeReview}
          </label>
          <textarea
            id={`comment-${episode ? "ep" : "title"}`}
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

      {comments.length === 0 ? (
        <p className="text-sm text-snow-dim">{t.noReviews}</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{c.username}</span>
                <span className="text-xs text-snow-dim">{formatDate(c.created_at)}</span>
              </div>
              <p className="mt-2 whitespace-pre-line break-words text-sm text-snow/90">{c.body}</p>
              {(isAdmin || c.user_id === viewerId) && (
                <form action={deleteComment} className="mt-2">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <button type="submit" className="text-xs text-snow-dim underline hover:text-snow">
                    {t.delete}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
