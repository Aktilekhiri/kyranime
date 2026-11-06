import { cookies } from "next/headers";

export type Locale = "ky" | "ru";

export const LOCALES: Locale[] = ["ky", "ru"];
export const DEFAULT_LOCALE: Locale = "ky";

const dict = {
  ky: {
    brand: "KyrAnime",
    tagline: "Аниме кыргыз тилинде",
    heroTitle: "Сүйүктүү аниме — кыргыз тилинде",
    heroText: "Кол менен жасалган кыргызча дубляж. Бекер көрүңүз.",
    watch: "Көрүү",
    catalog: "Каталог",
    search: "Издөө",
    searchPlaceholder: "Аниме издөө...",
    searchEmpty: "Эч нерсе табылган жок",
    popular: "Жаңы кошулгандар",
    episodes: "Сериялар",
    episode: "серия",
    season: "Сезон",
    reviews: "Пикирлер",
    writeReview: "Пикир жазуу",
    rating: "Баа",
    send: "Жөнөтүү",
    reviewPlaceholder: "Эмне ойлойсуз?",
    loginToReview: "Пикир жазуу үчүн кириңиз",
    noReviews: "Азырынча пикирлер жок. Биринчи болуңуз!",
    login: "Кирүү",
    register: "Катталуу",
    logout: "Чыгуу",
    email: "Электрондук почта",
    password: "Сыр сөз",
    profile: "Профиль",
    favorites: "Тандалмалар",
    continueWatching: "Улантуу",
    addFavorite: "Тандалмага кошуу",
    removeFavorite: "Тандалмадан алуу",
    nothingYet: "Азырынча бош",
    admin: "Башкаруу",
    status_ongoing: "Чыгып жатат",
    status_completed: "Аяктады",
    dubbedBy: "Дубляж",
    nextEpisode: "Кийинки серия",
    prevEpisode: "Мурунку серия",
    backToTitle: "Анимеге кайтуу",
    forRightsholders: "Укук ээлери үчүн",
    rightsText:
      "Бул — күйөрмандардын кол менен жасаган кыргызча дубляжы. Аниме оригиналынын укугу тиешелүү студияларга таандык. Эгер сиз укук ээси болсоңуз жана материалды алып салуу керек болсо, бизге жазыңыз:",
    footerNote: "Күйөрмандар тарабынан, күйөрмандар үчүн. Коммерциялык максат жок.",
    demoNotice: "Демо режим: Supabase туташтырылган жок.",
    langName: "Кыргызча",
  },
  ru: {
    brand: "KyrAnime",
    tagline: "Аниме на кыргызском",
    heroTitle: "Любимое аниме на кыргызском языке",
    heroText: "Озвучка, сделанная вручную. Смотрите бесплатно.",
    watch: "Смотреть",
    catalog: "Каталог",
    search: "Поиск",
    searchPlaceholder: "Найти аниме...",
    searchEmpty: "Ничего не найдено",
    popular: "Недавно добавленные",
    episodes: "Серии",
    episode: "серия",
    season: "Сезон",
    reviews: "Отзывы",
    writeReview: "Написать отзыв",
    rating: "Оценка",
    send: "Отправить",
    reviewPlaceholder: "Что вы думаете?",
    loginToReview: "Войдите, чтобы оставить отзыв",
    noReviews: "Пока нет отзывов. Будьте первым!",
    login: "Войти",
    register: "Регистрация",
    logout: "Выйти",
    email: "Электронная почта",
    password: "Пароль",
    profile: "Профиль",
    favorites: "Избранное",
    continueWatching: "Продолжить просмотр",
    addFavorite: "В избранное",
    removeFavorite: "Убрать из избранного",
    nothingYet: "Пока пусто",
    admin: "Админка",
    status_ongoing: "Выходит",
    status_completed: "Завершено",
    dubbedBy: "Озвучка",
    nextEpisode: "Следующая серия",
    prevEpisode: "Предыдущая серия",
    backToTitle: "К тайтлу",
    forRightsholders: "Для правообладателей",
    rightsText:
      "Это фанатская озвучка на кыргызском языке, сделанная вручную. Права на оригинальное аниме принадлежат соответствующим студиям. Если вы правообладатель и хотите убрать материал, напишите нам:",
    footerNote: "Сделано фанатами для фанатов. Без коммерческой цели.",
    demoNotice: "Демо-режим: Supabase не подключён.",
    langName: "Русский",
  },
} as const;

export type DictKey = keyof (typeof dict)["ky"];
export type Dict = Record<DictKey, string>;

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get("locale")?.value;
  return value === "ru" || value === "ky" ? value : DEFAULT_LOCALE;
}

export function getDict(locale: Locale): Dict {
  return dict[locale];
}

/** Выбор поля на нужном языке: pick(title, "title", locale) → title_ky / title_ru */
export function pick<T extends Record<string, unknown>>(
  row: T,
  base: string,
  locale: Locale,
): string {
  const primary = row[`${base}_${locale}`];
  const fallback = row[`${base}_${locale === "ky" ? "ru" : "ky"}`];
  return String(primary ?? fallback ?? "");
}
