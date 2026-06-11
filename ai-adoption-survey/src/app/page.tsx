import Link from "next/link";
import { CATEGORIES } from "@/lib/constants";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="text-lg font-bold text-brand-700">AI活用レベル診断</div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-gray-600 hover:text-brand-700">
              担当者ログイン
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
            >
              無料で診断を始める
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:py-24">
        <p className="mb-3 text-sm font-bold tracking-wide text-brand-600">
          株式会社デジライズ提供 / 法人向け無償診断ツール
        </p>
        <h1 className="text-3xl font-black leading-tight sm:text-5xl">
          自社のAI活用レベル、
          <br className="sm:hidden" />
          <span className="text-brand-600">全国偏差値</span>で見えていますか?
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-gray-600">
          社員が5〜10分のオンラインサーベイに答えるだけ。企業全体・部署ごとのAI活用レベルをスコアリングし、全国ベンチマークに対する偏差値とともに、一目瞭然のダッシュボードで可視化します。
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="w-full rounded-xl bg-brand-600 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-brand-200 hover:bg-brand-700 sm:w-auto"
          >
            無料で診断を始める(3分で発行)
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          回答者の個人情報(氏名・メールアドレス)は一切取得しません
        </p>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-2xl font-bold">6つの視点で組織を診断</h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((c, i) => (
              <div key={c.key} className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="text-sm font-bold text-brand-600">0{i + 1}</div>
                <div className="mt-1 font-bold">{c.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-2xl font-bold">導入はかんたん3ステップ</h2>
          <ol className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              ["登録", "会社情報と部署リストを入力すると、専用サーベイURLが即時発行されます。"],
              ["展開", "URLを社内チャットやメールで共有するだけ。社員はスマホから匿名で回答できます。"],
              ["診断", "回答はリアルタイムに集計。偏差値・部署別ヒートマップをダッシュボードで確認。"],
            ].map(([title, desc], i) => (
              <li key={title} className="rounded-xl border border-gray-200 p-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 font-bold text-white">
                  {i + 1}
                </div>
                <div className="mt-3 font-bold">{title}</div>
                <p className="mt-1 text-sm text-gray-600">{desc}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 text-center">
            <Link
              href="/register"
              className="inline-block rounded-xl bg-brand-600 px-8 py-4 text-lg font-bold text-white hover:bg-brand-700"
            >
              無料で診断を始める
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-500">
        <div className="space-x-4">
          <Link href="/privacy" className="hover:text-brand-700">
            プライバシーポリシー
          </Link>
          <a
            href="https://digirise.ai/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-700"
          >
            株式会社デジライズ
          </a>
        </div>
        <p className="mt-2">© 株式会社デジライズ</p>
      </footer>
    </main>
  );
}
