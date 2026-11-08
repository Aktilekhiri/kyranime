import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteEpisode, updateEpisode } from "@/app/actions";
import { AdminField } from "@/components/AdminField";
import { AspectField } from "@/components/AspectField";
import { createClient, getUser, isAdminEmail } from "@/lib/supabase/server";
import type { Episode, Title } from "@/lib/types";

export const metadata: Metadata = { title: "Редактирование серии" };
export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  url: "Ссылка на видео должна начинаться с https://",
  confirm: "Чтобы удалить серию, поставь галочку подтверждения.",
  save: "Не удалось сохранить. Возможно, серия с таким сезоном и номером уже есть.",
};

export default async function EditEpisodePage({
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

  const supabase = (await createClient())!;
  const { data } = await supabase.from("episodes").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const episode = data as Episode;
  const { data: titleRow } = await supabase.from("titles").select("*").eq("id", episode.title_id).maybeSingle();
  const title = titleRow as Title | null;
  const { data: dubRow } = episode.dub_id
    ? await supabase.from("dubs").select("studio_name").eq("id", episode.dub_id).maybeSingle()
    : { data: null };

  return (
    <div className="max-w-2xl space-y-8">
      <Link href={`/admin/title/${episode.title_id}`} className="text-sm text-snow-dim hover:text-snow">
        ← {title ? title.title_ru : "Назад"}
      </Link>
      <h1 className="text-2xl font-bold">
        Серия {episode.number}
        {episode.season > 1 && <span className="text-snow-dim"> · сезон {episode.season}</span>}
        {dubRow && <span className="text-snow-dim"> · {dubRow.studio_name}</span>}
      </h1>

      {error && (
        <p role="alert" className="card border-neon px-4 py-3 text-sm">
          {ERRORS[error] ?? ERRORS.save}
        </p>
      )}

      <form action={updateEpisode} className="card grid gap-4 p-5 sm:grid-cols-2">
        <input type="hidden" name="id" value={episode.id} />
        <AdminField label="Сезон" name="season" type="number" required defaultValue={episode.season} />
        <AdminField label="Номер серии" name="number" type="number" required defaultValue={episode.number} />
        <AdminField label="Название серии (кыргызча)" name="name_ky" defaultValue={episode.name_ky} />
        <AdminField label="Название серии (русский)" name="name_ru" defaultValue={episode.name_ru} />
        <div className="sm:col-span-2">
          <AdminField label="Ссылка на видео" name="hls_url" type="url" required defaultValue={episode.hls_url} />
        </div>
        <AdminField
          label="Длительность, минут"
          name="duration_min"
          type="number"
          defaultValue={episode.duration_sec ? Math.round(episode.duration_sec / 60) : null}
        />
        <AspectField defaultValue={episode.aspect} />
        <div className="flex items-end">
          <label className="flex cursor-pointer items-center gap-3 py-2.5 text-sm">
            <input type="checkbox" name="published" defaultChecked={episode.published} className="size-5 accent-neon" />
            Показывать на сайте
          </label>
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary">
            Сохранить
          </button>
        </div>
      </form>

      <form action={deleteEpisode} className="card space-y-3 p-5">
        <input type="hidden" name="id" value={episode.id} />
        <input type="hidden" name="title_id" value={episode.title_id} />
        <h2 className="font-bold">Удалить серию {episode.number}</h2>
        <p className="text-sm text-snow-dim">
          Серия пропадёт с сайта, вернуть её нельзя. Если не уверен, снять галочку «Показывать на сайте» выше безопаснее.
        </p>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" name="confirm" value="yes" className="size-5 accent-neon" />
          Да, удалить серию {episode.number}
        </label>
        <button type="submit" className="btn-ghost">
          Удалить серию
        </button>
      </form>
    </div>
  );
}
