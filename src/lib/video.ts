// Ссылки Bunny Stream вида:
//   https://player.mediadelivery.net/play/<библиотека>/<id видео>   (Direct Play)
//   https://iframe.mediadelivery.net/embed/<библиотека>/<id видео>  (Embed)
// Это веб-страницы плеера, а не HLS-поток, поэтому показываем их через iframe.
const BUNNY_RE =
  /^https:\/\/(?:player|iframe)\.mediadelivery\.net\/(?:play|embed)\/(\d+)\/([0-9a-f-]{36})(?:[/?#].*)?$/i;

/** Возвращает безопасный адрес embed-плеера, если ссылка от Bunny, иначе null. */
export function bunnyEmbedUrl(url: string): string | null {
  const m = BUNNY_RE.exec(url.trim());
  if (!m) return null;
  // Собираем адрес сами из проверенных id, а не берём чужую строку целиком
  return `https://player.mediadelivery.net/embed/${m[1]}/${m[2]}?autoplay=false&preload=true&responsive=true`;
}
