import Image from "next/image";
import Link from "next/link";
import LpDashboardMockup from "@/components/LpDashboardMockup";
import {
  CATEGORIES,
  CATEGORY_DESCRIPTIONS,
  NO1_ATTRIBUTION,
  SERVICES,
} from "@/lib/constants";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Image src="/digirise-logo.png" alt="DigiRise" width={120} height={40} priority />
            <span className="hidden border-l border-gray-200 pl-3 text-sm font-bold text-navy-900 sm:inline">
              AI活用レベル診断
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-gray-600 hover:text-brand-700">
              担当者ログイン
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-brand-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-brand-700"
            >
              無料で診断する
            </Link>
          </nav>
        </div>
      </header>

      {/* ヒーロー */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-800 to-brand-800 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #06b6d4, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #6d28d9, transparent 70%)" }}
        />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 sm:py-20 lg:grid-cols-[1fr_minmax(0,500px)]">
          <div className="text-center lg:text-left">
            <p className="inline-block rounded-full border border-cyan-300/40 bg-cyan-400/10 px-4 py-1.5 text-xs font-bold text-cyan-200">
              法人向けAIリスキリング 導入社数No.1 のデジライズが提供 ※
            </p>
            <h1 className="mt-6 text-3xl font-extrabold leading-[1.25] tracking-tight sm:text-5xl">
              自社のAI活用レベル、
              <br />
              <span className="bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
                全国偏差値
              </span>
              で見えていますか?
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base lg:mx-0">
              社員が5〜10分の匿名サーベイに答えるだけ。企業全体・部署ごとのAI活用レベルをスコアリングし、全国ベンチマークに対する偏差値とともに、一目瞭然のダッシュボードで可視化します。
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start sm:justify-center">
              <Link
                href="/register"
                className="w-full rounded-xl bg-gradient-to-r from-brand-500 to-violet2 px-8 py-4 text-center text-lg font-bold tracking-wide text-white shadow-hero hover:opacity-90 sm:w-auto"
              >
                無料で診断を始める
              </Link>
              <p className="text-xs text-white/50">
                登録から3分でサーベイURL発行
                <br />
                回答者の個人情報は一切取得しません
              </p>
            </div>
          </div>

          {/* 成果物イメージ(ダッシュボードのモック) */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <p className="mb-3 text-center text-xs font-bold tracking-widest text-cyan-200">
              ▼ 診断完了後に手に入るダッシュボード(イメージ)
            </p>
            <LpDashboardMockup />
            <div className="pointer-events-none absolute -bottom-8 -left-10 hidden lg:block">
              <Image
                src="/char-squirrel.png"
                alt="デジライズ公式キャラクター(リス)"
                width={96}
                height={137}
                className="drop-shadow-2xl"
                priority
              />
            </div>
            <div className="pointer-events-none absolute -bottom-8 -right-8 hidden lg:block">
              <Image
                src="/char-giraffe.png"
                alt="デジライズ公式キャラクター(キリン)"
                width={88}
                height={159}
                className="drop-shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* 診断で分かること */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <p className="text-center text-xs font-bold tracking-widest text-brand-600">
          WHAT YOU GET
        </p>
        <h2 className="mt-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          6つの視点 × 全国ベンチマークで組織を診断
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c, i) => (
            <div
              key={c.key}
              className="group rounded-2xl border border-gray-100 bg-white p-6 shadow-card transition hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet2 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="font-bold tracking-tight">{c.label}</p>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                {CATEGORY_DESCRIPTIONS[c.key]}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 rounded-2xl bg-gradient-to-br from-brand-50 to-cyan-50 p-6 text-center sm:grid-cols-3">
          {[
            ["総合偏差値", "全国・同業種・同規模と比較した立ち位置が数字でわかる"],
            ["部署別ヒートマップ", "強い部署・支援が必要な部署がひと目でわかる"],
            ["推奨アクション", "スコアに応じた具体的な次の一手を自動提案"],
          ].map(([t, d]) => (
            <div key={t}>
              <p className="font-bold text-brand-800">{t}</p>
              <p className="mt-1 text-xs text-gray-600">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3ステップ */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-center text-xs font-bold tracking-widest text-brand-600">
            HOW IT WORKS
          </p>
          <h2 className="mt-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
            導入はかんたん3ステップ
          </h2>
          <ol className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              ["登録", "会社情報と部署リストを入力すると、専用サーベイURLが即時発行されます。"],
              ["展開", "URLを社内チャットやメールで共有するだけ。社員はスマホから匿名で回答できます。"],
              ["診断", "回答はリアルタイムに集計。偏差値・部署別ヒートマップをダッシュボードで確認。"],
            ].map(([title, desc], i) => (
              <li key={title} className="relative rounded-2xl bg-white p-6 shadow-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet2 text-lg font-bold text-white">
                  {i + 1}
                </div>
                <div className="mt-3 text-lg font-bold tracking-tight">{title}</div>
                <p className="mt-1 text-sm text-gray-600">{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 診断のその先(サービス) */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <p className="text-center text-xs font-bold tracking-widest text-brand-600">
          AFTER THE CHECK-UP
        </p>
        <h2 className="mt-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          診断のその先まで、デジライズが伴走します
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-gray-500">
          診断結果の弱点カテゴリーに応じて、最適な打ち手をご提案。学ぶ(リスキリング)から創る(AI開発・内製化)まで一気通貫で支援します。
        </p>
        <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {Object.values(SERVICES).map((s) => (
            <a
              key={s.id}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col rounded-2xl border border-gray-100 bg-white p-7 shadow-card transition hover:-translate-y-0.5 hover:border-brand-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  {s.badge && (
                    <p className="text-[11px] font-bold tracking-wide text-flame">
                      {s.badge.replace(" ※", "")}
                    </p>
                  )}
                  <p className="mt-1.5 text-lg font-bold leading-snug tracking-tight">
                    {s.name}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-brand-700">{s.tagline}</p>
                </div>
                <Image src={s.image} alt={s.imageAlt} width={52} height={91} className="h-auto w-12 flex-none sm:w-13" />
              </div>
              <p className="mt-4 flex-1 border-t border-gray-100 pt-4 text-[13px] leading-[1.9] text-gray-600">
                {s.description}
              </p>
              <p className="mt-4 text-sm font-bold text-brand-600 group-hover:underline">
                詳しく見る →
              </p>
            </a>
          ))}
        </div>
        <p className="mt-4 text-center text-[10px] text-gray-400">{NO1_ATTRIBUTION}</p>
        <div className="mt-12 text-center">
          <Link
            href="/register"
            className="inline-block rounded-xl bg-gradient-to-r from-brand-500 to-violet2 px-10 py-4 text-lg font-bold tracking-wide text-white shadow-hero hover:opacity-90"
          >
            まずは無料で現在地を知る
          </Link>
        </div>
      </section>

      <footer className="bg-navy-950 py-10 text-white/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center text-sm">
          <Image src="/digirise-logo-white.png" alt="DigiRise" width={130} height={33} />
          <p className="text-xs">
            株式会社デジライズ(DigiRise, Inc.) ｜ 東京都港区海岸1-7-1 東京ポートシティ竹芝 10F
            <br />
            ミッション「AIを、組織に実装する」
          </p>
          <div className="space-x-4 text-xs">
            <Link href="/privacy" className="hover:text-white">
              プライバシーポリシー
            </Link>
            <a href="https://digirise.ai/" target="_blank" rel="noopener noreferrer" className="hover:text-white">
              コーポレートサイト
            </a>
          </div>
          <p className="text-xs text-white/40">© DigiRise, Inc. All Rights Reserved.</p>
        </div>
      </footer>
    </main>
  );
}
