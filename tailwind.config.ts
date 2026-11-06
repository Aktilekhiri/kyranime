import type { Config } from "tailwindcss";

// Палитра 60/30/10:
//  60%  чёрный  — фон (ink)
//  30%  белый   — текст, светлые поверхности (snow)
//  10%  зелёный — только акцент: кнопки, активные элементы, рейтинг (neon)
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0a0a0a", 50: "#141414", 100: "#1c1c1c", 200: "#262626", 300: "#363636" },
        snow: { DEFAULT: "#f5f5f5", dim: "#a3a3a3" },
        neon: { DEFAULT: "#22ff88", dark: "#12d46b" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
