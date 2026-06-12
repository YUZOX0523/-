import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

// 欧文・数字はInter(精緻な印象)、和文はNoto Sans JP。
// palt(プロポーショナルメトリクス)で日本語を詰め組みにし、上質な組版にする。
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI活用レベル診断 | 株式会社デジライズ",
  description:
    "社員5〜10分のサーベイで、企業・部署のAI活用レベルを全国ベンチマーク偏差値つきで無料診断。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJp.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
