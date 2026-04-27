import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI活用組織診断 | デジライズ',
  description: '貴社のAI活用レベルを診断し、具体的な課題と打ち手をご提供します',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
