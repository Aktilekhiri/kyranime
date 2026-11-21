"use client";

import Script from "next/script";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Капча Cloudflare Turnstile. Сама вставляет токен в форму (поле cf-turnstile-response). Без ключа не показывается. */
export function Turnstile() {
  if (!SITE_KEY) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
      <div className="cf-turnstile" data-sitekey={SITE_KEY} data-theme="dark" />
    </>
  );
}

/** Сбросить капчу после попытки: токен одноразовый. */
export function resetTurnstile() {
  (window as unknown as { turnstile?: { reset: () => void } }).turnstile?.reset();
}
