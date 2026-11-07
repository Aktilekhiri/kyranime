import { cookies } from "next/headers";

export type Locale = "ky" | "ru";

export const LOCALES: Locale[] = ["ky", "ru"];
export const DEFAULT_LOCALE: Locale = "ky";

const dict = {
  ky: {
    brand: "KyrAnime",
    tagline: "Аниме кыргыз тилинде",
    heroTitle: "Сүйүктүү анимелер - кыргыз тилинде",
    heroText: "Кыргызча дубляж. Бекер көрүңүз",
    watch: "Көрүү",
    home: "Башкы бет",
    allGenres: "Бардыгы",
    catalogCount: "аниме",
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
    password: "Сырсөз",
    profile: "Профиль",
    favorites: "Тандалмалар",
    continueWatching: "Көрүүнү улантуу",
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
    minutesShort: "мүн",
    theme: "Тема",
    themeDark: "Караңгы",
    themeLight: "Жарык",
    themeBlue: "Көк",
    releaseDays: "Жаңы серия чыгат",
    errPasswordShort: "Сырсөз кеминде 8 белгиден турушу керек",
    errCredentials: "Электрондук почта же сырсөз туура эмес",
    errNotConfirmed: "Алгач почтаңызды ырастаңыз: сизге кат жөнөтүлдү",
    errExists: "Бул почта менен мурда катталган. Кирүү баскычын колдонуңуз",
    errGeneric: "Ката кетти. Кайра аракет кылыңыз",
    checkEmail: "Почтаңызга ырастоо каты жөнөтүлдү. Катты ачып, шилтемени басыңыз",
  },
  ru: {
    brand: "KyrAnime",
    tagline: "Аниме на кыргызском",
    heroTitle: "Любимое аниме на кыргызском языке",
    heroText: "Кыргызская озвучка. Смотрите бесплатно",
    watch: "Смотреть",
    home: "Главная",
    allGenres: "Все",
    catalogCount: "тайтлов",
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
    minutesShort: "мин",
    theme: "Тема",
    themeDark: "Тёмная",
    themeLight: "Светлая",
    themeBlue: "Синяя",
    releaseDays: "Новые серии выходят",
    errPasswordShort: "Пароль должен содержать не менее 8 символов",
    errCredentials: "Неверная почта или пароль",
    errNotConfirmed: "Сначала подтвердите почту: мы отправили вам письмо",
    errExists: "Эта почта уже зарегистрирована. Попробуйте войти",
    errGeneric: "Что-то пошло не так. Попробуйте ещё раз",
    checkEmail: "Мы отправили письмо для подтверждения. Откройте его и перейдите по ссылке",
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

/** Дни недели для расписания выхода серий: индекс 0 = понедельник … 6 = воскресенье. */
export const WEEKDAYS: Record<Locale, string[]> = {
  ky: ["Дүйшөмбү", "Шейшемби", "Шаршемби", "Бейшемби", "Жума", "Ишемби", "Жекшемби"],
  ru: ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"],
};

/** Список дней выхода (числа 1–7, где 1 = понедельник) → «Жума, Жекшемби». */
export function formatReleaseDays(days: number[] | null | undefined, locale: Locale): string {
  return [...new Set(days ?? [])]
    .filter((d) => d >= 1 && d <= 7)
    .sort((a, b) => a - b)
    .map((d) => WEEKDAYS[locale][d - 1])
    .join(", ");
}
