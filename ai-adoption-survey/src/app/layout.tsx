import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
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
    <html lang="ja" className={notoSansJp.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
