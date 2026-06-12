import { notFound } from "next/navigation";
import Link from "next/link";
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

  // カテゴリーごとの全国平均比較コメント(最大の強み1つ)
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
  const comment =
    best.diff >= 0
      ? `あなたの「${best.label}」は全国平均を上回っています。`
      : `全体的に伸びしろがあります。まずは「${withDiff[withDiff.length - 1].label}」から取り組んでみましょう。`;

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <p className="text-center text-sm font-bold text-brand-600">
        診断が完了しました
      </p>
      <h1 className="mt-1 text-center text-2xl font-black">
        あなたのAI活用レベル
      </h1>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-gradient-to-b from-brand-50 to-white p-8 text-center">
        <div className="text-6xl font-black text-brand-700">
          {Math.round(totalScore)}
          <span className="ml-1 text-2xl font-bold text-gray-400">/100</span>
        </div>
        <div className="mt-3 inline-block rounded-full bg-brand-600 px-4 py-1.5 text-sm font-bold text-white">
          Lv.{level.level} {level.name}
        </div>
        <p className="mt-3 text-sm text-gray-600">{level.description}</p>
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

      <section className="mt-10 rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
        <p>
          会社全体・部署ごとの詳細な診断結果は、人事・推進ご担当者に共有されています。
        </p>
        <a
          href={process.env.NEXT_PUBLIC_CONSULTATION_URL ?? "https://digirise.ai/contact/"}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-brand-600 underline"
        >
          株式会社デジライズのAI研修・支援サービスを見る →
        </a>
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
