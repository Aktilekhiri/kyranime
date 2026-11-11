import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { addDub, deleteDub, setTitleHidden, updateDub, updateTitle } from "@/app/actions";
import { AdminField } from "@/components/AdminField";
import { PosterUploader } from "@/components/PosterUploader";
import { ReleaseDaysField } from "@/components/ReleaseDaysField";
import { createClient, getUser, isAdminEmail } from "@/lib/supabase/server";
import type { Dub, Episode, Title } from "@/lib/types";

export const metadata: Metadata = { title: "Редактирование тайтла" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  dub: "Укажи название студии. Ссылка, если есть, должна начинаться с https://",
  dubsave: "Не удалось сохранить озвучку. Выполнил ли ты SQL из файла supabase/dubs.sql?",
  dubconfirm: "Чтобы удалить озвучку, поставь галочку подтверждения.",
};

export default async function EditTitlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
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
  const { data: dubRows } = await supabase!
    .from("dubs")
    .select("*")
    .eq("title_id", id)
    .order("sort")
    .order("created_at");
  const dubs = (dubRows ?? []) as Dub[];

  return (
    <div className="space-y-8">
      <Link href="/admin" className="text-sm text-snow-dim hover:text-snow">
        ← Админка
      </Link>
      <h1 className="text-2xl font-bold">
        {title.title_ru} <span className="text-snow-dim">/ {title.title_ky}</span>
      </h1>

      {error && (
        <p role="alert" className="card border-neon px-4 py-3 text-sm">
          {ERRORS[error] ?? "Не удалось сохранить."}
        </p>
      )}

      <form action={setTitleHidden} className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <input type="hidden" name="id" value={title.id} />
        <input type="hidden" name="hidden" value={title.hidden ? "0" : "1"} />
        <p className="text-sm">
          {title.hidden ? "Тайтл скрыт: на сайте его видишь только ты." : "Тайтл виден всем на сайте."}
        </p>
        <button type="submit" className={title.hidden ? "btn-primary" : "btn-ghost"}>
          {title.hidden ? "Показать на сайте" : "Скрыть с сайта"}
        </button>
      </form>

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

      <section className="max-w-2xl space-y-4">
        <h2 className="text-xl font-bold">Озвучки ({dubs.length})</h2>
        <p className="text-sm text-snow-dim">
          У каждой озвучки свой список серий. Зритель выбирает озвучку на странице тайтла. Порядок: меньшее число выше,
          при равенстве выше та, что добавлена раньше.
        </p>

        {dubs.map((d) => (
          <div key={d.id} className="card space-y-3 p-4">
            <form action={updateDub} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={d.id} />
              <input type="hidden" name="title_id" value={title.id} />
              <AdminField label="Студия" name="studio_name" required defaultValue={d.studio_name} />
              <AdminField label="Ссылка (TikTok / Telegram)" name="studio_url" type="url" defaultValue={d.studio_url} />
              <AdminField label="Порядок" name="sort" type="number" defaultValue={d.sort} />
              <label className="flex cursor-pointer items-center gap-3 self-end py-2.5 text-sm">
                <input type="checkbox" name="published" defaultChecked={d.published} className="size-5 accent-neon" />
                Показывать на сайте
              </label>
              <div className="sm:col-span-2">
                <button type="submit" className="btn-primary">
                  Сохранить озвучку
                </button>
              </div>
            </form>

            <div>
              <p className="mb-2 text-sm font-semibold">
                Серии: {episodes.filter((e) => e.dub_id === d.id).length}
              </p>
              <ul className="space-y-2">
                {episodes
                  .filter((e) => e.dub_id === d.id)
                  .map((ep) => (
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
              <Link href="/admin#new-episode" className="btn-ghost mt-3">
                + Новая серия
              </Link>
            </div>

            <form action={deleteDub} className="flex flex-wrap items-center gap-3 border-t border-ink-200 pt-3">
              <input type="hidden" name="id" value={d.id} />
              <input type="hidden" name="title_id" value={title.id} />
              <label className="flex cursor-pointer items-center gap-2 text-sm text-snow-dim">
                <input type="checkbox" name="confirm" value="yes" className="size-5 accent-neon" />
                Удалить озвучку «{d.studio_name}» вместе со всеми её сериями
              </label>
              <button type="submit" className="btn-ghost">
                Удалить озвучку
              </button>
            </form>
          </div>
        ))}

        {episodes.some((e) => !e.dub_id) && (
          <p className="card border-neon px-4 py-3 text-sm">
            Есть серии без озвучки ({episodes.filter((e) => !e.dub_id).length}). Выполни SQL из supabase/dubs.sql, он
            привяжет их к озвучке.
          </p>
        )}

        <form action={addDub} className="card grid gap-3 p-4 sm:grid-cols-2">
          <input type="hidden" name="title_id" value={title.id} />
          <h3 className="font-bold sm:col-span-2">Новая озвучка</h3>
          <AdminField label="Студия" name="studio_name" required placeholder="AniZel TV" />
          <AdminField label="Ссылка (TikTok / Telegram)" name="studio_url" type="url" placeholder="https://" />
          <AdminField label="Порядок" name="sort" type="number" placeholder="0" />
          <div className="flex items-end">
            <button type="submit" className="btn-primary">
              Добавить озвучку
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
