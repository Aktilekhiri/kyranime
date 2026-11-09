import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { addEpisode, addTitle } from "@/app/actions";
import { AdminField } from "@/components/AdminField";
import { AspectField } from "@/components/AspectField";
import { ReleaseDaysField } from "@/components/ReleaseDaysField";
import { VideoUploader } from "@/components/VideoUploader";
import { listTitles } from "@/lib/data";
import { createClient, getUser, isAdminEmail } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Админка" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  title: "Тайтл не добавлен: такой slug уже есть или поле заполнено неверно.",
  episode: "Серия не добавлена: серия с таким сезоном и номером уже есть или поле заполнено неверно.",
  url: "Ссылка на видео должна начинаться с https://",
  nodub: "Выбери озвучку. Если её нет, открой тайтл и добавь озвучку.",
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/");

  const titles = await listTitles();
  const supabase = (await createClient())!;
  const { data: dubRows } = await supabase
    .from("dubs")
    .select("id, studio_name, titles(title_ru, title_ky)")
    .order("created_at");
  const dubOptions = (dubRows ?? []).map((d) => {
    const t = d.titles as unknown as { title_ru: string; title_ky: string } | { title_ru: string; title_ky: string }[] | null;
    const title = Array.isArray(t) ? t[0] : t;
    return { id: d.id as string, label: `${title?.title_ru ?? "?"} · ${d.studio_name}` };
  });

  return (
    <div className="space-y-12">
      <h1 className="text-2xl font-bold">Админка</h1>

      {error && (
        <p role="alert" className="card border-neon px-4 py-3 text-sm">
          {ERRORS[error] ?? "Не удалось сохранить."}
        </p>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Тайтлы</h2>
        {titles.length === 0 ? (
          <p className="text-sm text-snow-dim">Пока пусто. Добавь первый тайтл ниже.</p>
        ) : (
          <ul className="space-y-2">
            {titles.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/admin/title/${t.id}`}
                  className="card flex items-center justify-between gap-3 px-4 py-3 transition hover:border-neon"
                >
                  <span className="font-semibold">
                    {t.title_ru} <span className="font-normal text-snow-dim">/ {t.title_ky}</span>
                  </span>
                  <span className="shrink-0 text-xs text-snow-dim">
                    {t.poster_url ? "Постер есть" : "Нет постера"} · Изменить →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Новый тайтл</h2>
        <form action={addTitle} className="card grid gap-4 p-5 sm:grid-cols-2">
          <AdminField label="Slug (латиницей, для адреса)" name="slug" required placeholder="one-piece" />
          <AdminField label="Название (кыргызча)" name="title_ky" required />
          <AdminField label="Название (русский)" name="title_ru" required />
          <AdminField label="Оригинальное название" name="title_orig" />
          <AdminField label="Год" name="year" type="number" />
          <AdminField label="Жанры (через запятую)" name="genres" placeholder="Экшен, Драма" />
          <AdminField label="Ссылка на постер" name="poster_url" type="url" />
          <AdminField label="Команда озвучки" name="dubbed_by" />
          <div className="sm:col-span-2">
            <label htmlFor="description_ky" className="label">
              Описание (кыргызча)
            </label>
            <textarea id="description_ky" name="description_ky" rows={3} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="description_ru" className="label">
              Описание (русский)
            </label>
            <textarea id="description_ru" name="description_ru" rows={3} className="input" />
          </div>
          <div className="sm:col-span-2">
            <ReleaseDaysField />
          </div>
          <div>
            <label htmlFor="status" className="label">
              Статус
            </label>
            <select id="status" name="status" className="input">
              <option value="ongoing">Выходит</option>
              <option value="completed">Завершено</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary">
              Добавить тайтл
            </button>
          </div>
        </form>
      </section>

      <section id="new-episode" className="scroll-mt-24 space-y-4">
        <h2 className="text-xl font-bold">Новая серия</h2>
        <form action={addEpisode} className="card grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <label htmlFor="dub_id" className="label">
              Тайтл и озвучка
            </label>
            <select id="dub_id" name="dub_id" required className="input">
              {dubOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
            {dubOptions.length === 0 && (
              <p className="mt-2 text-xs text-snow-dim">
                Озвучек пока нет. Открой тайтл и добавь озвучку (и выполни SQL из supabase/dubs.sql).
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <VideoUploader />
          </div>
          <AdminField label="Ссылка на видео (Bunny или .m3u8)" name="hls_url" type="url" required placeholder="https://.../master.m3u8" />
          <AdminField label="Сезон" name="season" type="number" placeholder="1" />
          <AdminField label="Номер серии" name="number" type="number" required />
          <AdminField label="Название серии (кыргызча)" name="name_ky" />
          <AdminField label="Название серии (русский)" name="name_ru" />
          <AdminField label="Длительность, минут" name="duration_min" type="number" placeholder="24" />
          <AspectField />
          <div className="flex items-end">
            <button type="submit" className="btn-primary">
              Добавить серию
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
