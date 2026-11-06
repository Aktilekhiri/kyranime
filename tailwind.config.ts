import type { Config } from "tailwindcss";

// Цвета берутся из CSS-переменных (см. globals.css), поэтому одна и та же вёрстка
// работает в трёх темах. Пропорции 60/30/10 в каждой теме:
//   ink   — фон и поверхности (60%)
//   snow  — текст и контрастные блоки (30%)
//   neon  — акцент: кнопки, активные элементы, рейтинг (10%)
// Названия остались от первой (тёмной) темы: в светлой ink = белый, snow = чёрный.
const withAlpha = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: withAlpha("ink"),
          50: withAlpha("ink-50"),
          100: withAlpha("ink-100"),
          200: withAlpha("ink-200"),
          300: withAlpha("ink-300"),
        },
        snow: { DEFAULT: withAlpha("snow"), dim: withAlpha("snow-dim") },
        neon: { DEFAULT: withAlpha("neon"), dark: withAlpha("neon-dark") },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
