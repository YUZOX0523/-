import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // DigiRiseロゴ準拠のブランドカラー
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        // 資料の濃紺(信頼感のあるダークセクション用)
        navy: {
          700: "#26336e",
          800: "#1c2659",
          900: "#141c45",
          950: "#0e1433",
        },
        // ロゴの紫・シアン・レッドオレンジ
        violet2: "#6d28d9",
        cyan2: "#06b6d4",
        flame: "#ea4a1f",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "var(--font-noto-sans-jp)",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px rgba(16,24,64,0.06), 0 8px 24px rgba(16,24,64,0.08)",
        hero: "0 12px 40px rgba(20,28,69,0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
