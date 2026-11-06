import type { Episode, Title } from "./types";

// Демо-данные, пока Supabase не подключён. Постеры не используются:
// карточки рисуют градиент, настоящие обложки ты добавишь через админку.
const NOW = "2026-11-06T00:00:00Z";

function t(
  slug: string,
  ky: string,
  ru: string,
  orig: string,
  year: number,
  genres: string[],
  status: Title["status"] = "ongoing",
): Title {
  return {
    id: `demo-${slug}`,
    slug,
    title_ky: ky,
    title_ru: ru,
    title_orig: orig,
    description_ky: "Сүрөттөмө админкадан кошулат.",
    description_ru: "Описание добавляется через админку.",
    poster_url: null,
    banner_url: null,
    year,
    genres,
    release_days: [],
    status,
    dubbed_by: null,
    created_at: NOW,
  };
}

export const DEMO_TITLES: Title[] = [
  t("one-piece", "Ван Пис", "Ван-Пис", "ONE PIECE", 1999, ["Приключения", "Экшен"]),
  t("naruto", "Наруто", "Наруто", "NARUTO", 2002, ["Экшен", "Фэнтези"], "completed"),
  t("attack-on-titan", "Титандарга чабуул", "Атака титанов", "Shingeki no Kyojin", 2013, ["Экшен", "Драма"], "completed"),
  t("death-note", "Өлүм дептери", "Тетрадь смерти", "DEATH NOTE", 2006, ["Триллер", "Детектив"], "completed"),
  t("blue-lock", "Көк түрмө", "Синяя тюрьма", "BLUE LOCK", 2022, ["Спорт", "Драма"]),
  t("oshi-no-ko", "Жылдыз бала", "Звёздное дитя", "Oshi no Ko", 2023, ["Драма", "Мистика"]),
];

// Публичный тестовый HLS-поток, только чтобы проверить плеер.
const TEST_STREAM = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

export const DEMO_EPISODES: Episode[] = DEMO_TITLES.flatMap((title) =>
  [1, 2, 3].map((n) => ({
    id: `demo-${title.slug}-${n}`,
    title_id: title.id,
    season: 1,
    number: n,
    name_ky: null,
    name_ru: null,
    hls_url: TEST_STREAM,
    thumbnail_url: null,
    duration_sec: 1440,
    published: true,
  })),
);
