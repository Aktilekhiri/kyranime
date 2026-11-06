import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateTitle } from "@/app/actions";
import { AdminField } from "@/components/AdminField";
import { PosterUploader } from "@/components/PosterUploader";
import { ReleaseDaysField } from "@/components/ReleaseDaysField";
import { createClient, getUser, isAdminEmail } from "@/lib/supabase/server";
import type { Episode, Title } from "@/lib/types";

export const metadata: Metadata = { title: "Редактирование тайтла" };
export const dynamic = "force-dynamic";

export default async function EditTitlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/");

  const supabase = await createClient();
  const { data } = await supabase!.from("titles").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const title = data as Title;

  // Админ видит все серии, в том числе скрытые (политика RLS)
  const { data: epRows } = await supabase!
    .from("episodes")
    .select("*")
    .eq("title_id", id)
    .order("season")
    .order("number");
  const episodes = (epRows ?? []) as Episode[];

  return (
    <div className="space-y-8">
      <Link href="/admin" className="text-sm text-snow-dim hover:text-snow">
        ← Админка
      </Link>
      <h1 className="text-2xl font-bold">
        {title.title_ru} <span className="text-snow-dim">/ {title.title_ky}</span>
      </h1>

      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <section aria-label="Постер">
          <PosterUploader titleId={title.id} currentUrl={title.poster_url} />
        </section>

        <form action={updateTitle} className="card grid gap-4 p-5 sm:grid-cols-2">
          <input type="hidden" name="id" value={title.id} />
          <AdminField label="Название (кыргызча)" name="title_ky" required defaultValue={title.title_ky} />
          <AdminField label="Название (русский)" name="title_ru" required defaultValue={title.title_ru} />
          <AdminField label="Оригинальное название" name="title_orig" defaultValue={title.title_orig} />
          <AdminField label="Год" name="year" type="number" defaultValue={title.year} />
          <AdminField label="Жанры (через запятую)" name="genres" defaultValue={title.genres.join(", ")} />
          <AdminField label="Команда озвучки" name="dubbed_by" defaultValue={title.dubbed_by} />
          <div className="sm:col-span-2">
            <AdminField
              label="Ссылка на постер (заполняется сама после загрузки)"
              name="poster_url"
              type="url"
              defaultValue={title.poster_url}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="description_ky" className="label">
              Описание (кыргызча)
            </label>
            <textarea
              id="description_ky"
              name="description_ky"
              rows={3}
              defaultValue={title.description_ky ?? ""}
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="description_ru" className="label">
              Описание (русский)
            </label>
            <textarea
              id="description_ru"
              name="description_ru"
              rows={3}
              defaultValue={title.description_ru ?? ""}
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <ReleaseDaysField defaultDays={title.release_days ?? []} />
          </div>
          <div>
            <label htmlFor="status" className="label">
              Статус
            </label>
            <select id="status" name="status" defaultValue={title.status} className="input">
              <option value="ongoing">Выходит</option>
              <option value="completed">Завершено</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary">
              Сохранить
            </button>
          </div>
        </form>
      </div>

      <section className="max-w-2xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Серии ({episodes.length})</h2>
          <Link href="/admin#new-episode" className="btn-primary">
            + Новая серия
          </Link>
        </div>
        {episodes.length === 0 ? (
          <p className="text-sm text-snow-dim">Серий пока нет.</p>
        ) : (
          <ul className="space-y-2">
            {episodes.map((ep) => (
              <li key={ep.id}>
                <Link
                  href={`/admin/episode/${ep.id}`}
                  className="card flex items-center justify-between gap-3 px-4 py-3 transition hover:border-neon"
                >
                  <span className="min-w-0">
                    <span className="font-semibold">
                      {ep.season > 1 && `С${ep.season} · `}Серия {ep.number}
                    </span>
                    {(ep.name_ky || ep.name_ru) && (
                      <span className="block truncate text-sm text-snow-dim">{ep.name_ky || ep.name_ru}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-snow-dim">
                    {ep.published ? "" : "Скрыта · "}Изменить →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
