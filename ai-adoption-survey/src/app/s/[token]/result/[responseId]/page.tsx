import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORIES } from "@/lib/constants";
import {
  deviationValue,
  levelForScore,
  pickBenchmark,
  type Benchmark,
} from "@/lib/scoring";
import RadarCompare from "@/components/RadarCompare";
import { SERIES_COLORS } from "@/lib/colors";

export const dynamic = "force-dynamic";

type Props = { params: { token: string; responseId: string } };

async function getData(token: string, responseId: string) {
  const supabase = createAdminClient();
  const { data: link } = await supabase
    .from("survey_links")
    .select("company_id")
    .eq("token", token)
    .single();
  if (!link) return null;

  const { data: response } = await supabase
    .from("responses")
    .select("id, company_id, category_scores, total_score")
    .eq("id", responseId)
    .eq("company_id", link.company_id)
    .single();
  if (!response) return null;

  const [{ data: benchmarks }, { data: config }] = await Promise.all([
    supabase
      .from("benchmarks")
      .select("category, industry, size_band, mean, sd, n, source")
      .eq("industry", "all")
      .eq("size_band", "all"),
    supabase.from("scoring_config").select("level_thresholds").eq("id", 1).single(),
  ]);
  return {
    response,
    benchmarks: (benchmarks ?? []) as Benchmark[],
    thresholds: (config?.level_thresholds as number[]) ?? undefined,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getData(params.token, params.responseId);
  if (!data) return {};
  const level = levelForScore(Number(data.response.total_score), data.thresholds);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const og = `${appUrl}/api/og?score=${Math.round(
    Number(data.response.total_score)
  )}&level=${level.level}&name=${encodeURIComponent(level.name)}`;
  return {
    title: "あなたのAI活用レベル診断結果",
    openGraph: { images: [og] },
    twitter: { card: "summary_large_image", images: [og] },
  };
}

export default async function PersonalResultPage({ params }: Props) {
  const data = await getData(params.token, params.responseId);
  if (!data) notFound();

  const totalScore = Number(data.response.total_score);
  const scores = data.response.category_scores as Record<string, number>;
  const level = levelForScore(totalScore, data.thresholds);

  const radarData = CATEGORIES.map((c) => {
    const bm = pickBenchmark(data.benchmarks, c.key, "all", "all");
    return {
      label: c.short,
      self: scores[c.key] ?? 0,
      national: bm ? Math.round(Number(bm.mean) * 10) / 10 : 55,
    };
  });

  // カテゴリーごとの全国平均比較
  const withDiff = CATEGORIES.map((c) => {
    const bm = pickBenchmark(data.benchmarks, c.key, "all", "all");
    const mean = bm ? Number(bm.mean) : 55;
    const sd = bm ? Number(bm.sd) : 15;
    return {
      label: c.label,
      score: scores[c.key] ?? 0,
      diff: (scores[c.key] ?? 0) - mean,
      deviation: deviationValue(scores[c.key] ?? 0, mean, sd),
    };
  }).sort((a, b) => b.diff - a.diff);
  const best = withDiff[0];
  const worst = withDiff[withDiff.length - 1];

  // 総合の立ち位置に応じてトーンを変える(甘やかさない)
  const totalBm = pickBenchmark(data.benchmarks, "total", "all", "all");
  const totalDev = deviationValue(
    totalScore,
    totalBm ? Number(totalBm.mean) : 55,
    totalBm ? Number(totalBm.sd) : 15
  );
  const comment =
    totalDev < 45
      ? `総合スコアは全国平均を下回っています。生成AIを使いこなす人との生産性差は毎月開いていきます — まずは「${worst.label}」から、週1回の業務活用を始めてみましょう。`
      : totalDev < 55
        ? `全国平均圏です。「${best.label}」は健闘していますが、上位層は既に日常業務の自動化まで進んでいます。「${worst.label}」を伸ばせば一段上が見えてきます。`
        : `全国上位圏です。「${best.label}」はあなたの強力な武器 — 次は周囲への共有や、より高度な活用(自動化・開発)に挑戦するステージです。`;

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div className="flex justify-center">
        <Image src="/digirise-logo.png" alt="DigiRise" width={110} height={37} />
      </div>
      <p className="mt-4 text-center text-sm font-bold text-brand-600">
        診断が完了しました
      </p>
      <h1 className="mt-1 text-center text-2xl font-black">
        あなたのAI活用レベル
      </h1>

      <div className="relative mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-navy-950 via-navy-800 to-brand-800 p-8 text-center text-white shadow-hero">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #06b6d4, #6d28d9 70%, transparent)" }}
        />
        <div className="relative">
          <div className="bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-7xl font-black text-transparent">
            {Math.round(totalScore)}
            <span className="ml-1 text-2xl font-bold text-white/40">/100</span>
          </div>
          <div className="mt-3 inline-block rounded-full border border-white/20 bg-white/10 px-5 py-1.5 text-sm font-bold backdrop-blur">
            Lv.{level.level} {level.name}
          </div>
          <p className="mt-3 text-sm text-white/70">{level.description}</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold">6カテゴリーの内訳</h2>
        <div className="mt-2 rounded-2xl border border-gray-200 p-2">
          <RadarCompare
            data={radarData}
            series={[
              { key: "self", name: "あなた", color: SERIES_COLORS.self, fillOpacity: 0.25 },
              { key: "national", name: "全国平均", color: SERIES_COLORS.national },
            ]}
          />
        </div>
        <p className="mt-3 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
          {comment}
        </p>
      </section>

      <section className="mt-10 flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-6 text-sm text-gray-600">
        <Image
          src="/char-squirrel.png"
          alt="デジライズ公式キャラクター(リス)"
          width={72}
          height={103}
          className="h-auto w-16 flex-none"
        />
        <div>
          <p>
            会社全体・部署ごとの詳細な診断結果は、人事・推進ご担当者に共有されています。
          </p>
          <a
            href={process.env.NEXT_PUBLIC_CONSULTATION_URL ?? "https://digirise.ai/contact/"}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block font-bold text-brand-600 underline"
          >
            株式会社デジライズのAI研修・支援サービスを見る →
          </a>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-gray-400">
        <Link href="/privacy" className="underline">
          プライバシーポリシー
        </Link>
        {" "}/ 回答は匿名で統計処理されます
      </p>
    </main>
  );
}
