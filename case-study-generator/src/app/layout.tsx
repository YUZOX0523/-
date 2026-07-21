import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "導入事例 原稿ジェネレーター | DigiRise社内ツール",
  description:
    "法人リスキリングの最終報告MTG資料(PDF)から、導入事例の原稿(チェック用Markdown+WordPress入稿用)を自動生成する社内ツール",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
