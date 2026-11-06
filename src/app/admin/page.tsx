import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { addEpisode, addTitle } from "@/app/actions";
import { listTitles } from "@/lib/data";
import { getUser, isAdminEmail } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Админка" };
export const dynamic = "force-dynamic";

function Field({
  label,
  name,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input id={name} name={name} type={type} required={required} placeholder={placeholder} className="input" />
    </div>
  );
}

export default async function AdminPage() {
  const user = await getUser();
  if (!user || !isAdminEmail(user.email)) redirect("/");

  const titles = await listTitles();

  return (
    <div className="space-y-12">
      <h1 className="text-2xl font-bold">Админка</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Новый тайтл</h2>
        <form action={addTitle} className="card grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Slug (латиницей, для адреса)" name="slug" required placeholder="one-piece" />
          <Field label="Название (кыргызча)" name="title_ky" required />
          <Field label="Название (русский)" name="title_ru" required />
          <Field label="Оригинальное название" name="title_orig" />
          <Field label="Год" name="year" type="number" />
          <Field label="Жанры (через запятую)" name="genres" placeholder="Экшен, Драма" />
          <Field label="Ссылка на постер" name="poster_url" type="url" />
          <Field label="Команда озвучки" name="dubbed_by" />
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

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Новая серия</h2>
        <form action={addEpisode} className="card grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <label htmlFor="title_id" className="label">
              Тайтл
            </label>
            <select id="title_id" name="title_id" required className="input">
              {titles.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title_ru} / {t.title_ky}
                </option>
              ))}
            </select>
          </div>
          <Field label="Ссылка на HLS (master.m3u8)" name="hls_url" type="url" required placeholder="https://.../master.m3u8" />
          <Field label="Сезон" name="season" type="number" placeholder="1" />
          <Field label="Номер серии" name="number" type="number" required />
          <Field label="Название серии (кыргызча)" name="name_ky" />
          <Field label="Название серии (русский)" name="name_ru" />
          <Field label="Длительность, минут" name="duration_min" type="number" placeholder="24" />
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
