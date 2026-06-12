import type { SupabaseClient } from "@supabase/supabase-js";
import { CATEGORIES, INDUSTRY_LABELS, SIZE_BAND_LABELS } from "./constants";
import {
  deviationValue,
  levelForScore,
  pickBenchmark,
  topPercent,
  type Benchmark,
} from "./scoring";

export type Company = {
  id: string;
  name: string;
  industry: string;
  employee_size_band: string;
  expected_respondents: number | null;
};

export type DepartmentResult = {
  id: string;
  name: string;
  n: number;
  sufficient: boolean;
  total_score: number | null;
  category_scores: Record<string, number> | null;
};

export type DashboardData = {
  company: Company;
  industryLabel: string;
  sizeBandLabel: string;
  n: number;
  totalScore: number | null;
  categoryScores: Record<string, number>;
  departments: DepartmentResult[];
  freeTexts: { department: string; text: string; created_at: string }[];
  minResponsesPerDept: number;
  levelThresholds: number[];
  level: { level: number; name: string; description: string } | null;
  totalDeviation: number | null;
  totalTopPercent: number | null;
  benchmarkN: number | null;
  benchmarkSource: "seed" | "actual" | null;
  categories: {
    key: string;
    label: string;
    short: string;
    score: number | null;
    deviation: number | null;
    nationalMean: number | null;
    industryMean: number | null;
  }[];
};

/**
 * ダッシュボード表示用データを組み立てる。
 * supabaseはログインユーザーのクライアント(RLS適用)または管理用クライアント。
 * 回答の集計はSECURITY DEFINERのRPC(get_company_dashboard)経由。
 */
export async function buildDashboardData(
  supabase: SupabaseClient,
  company: Company
): Promise<DashboardData> {
  const [{ data: agg, error: aggError }, { data: benchmarksRaw }, { data: config }] =
    await Promise.all([
      supabase.rpc("get_company_dashboard", { p_company_id: company.id }),
      supabase
        .from("benchmarks")
        .select("category, industry, size_band, mean, sd, n, source"),
      supabase.from("scoring_config").select("*").eq("id", 1).single(),
    ]);
  if (aggError) throw aggError;

  const benchmarks = (benchmarksRaw ?? []) as Benchmark[];
  const thresholds = (config?.level_thresholds as number[]) ?? undefined;

  const n: number = agg?.n ?? 0;
  const totalScore: number | null =
    agg?.total_score != null ? Number(agg.total_score) : null;
  const categoryScores: Record<string, number> = agg?.category_scores ?? {};

  const totalBm = pickBenchmark(
    benchmarks,
    "total",
    company.industry,
    company.employee_size_band
  );
  const totalDeviation =
    totalScore != null && totalBm
      ? deviationValue(totalScore, Number(totalBm.mean), Number(totalBm.sd))
      : null;

  const categories = CATEGORIES.map((c) => {
    const score = categoryScores[c.key] ?? null;
    const bm = pickBenchmark(benchmarks, c.key, company.industry, company.employee_size_band);
    const national = pickBenchmark(benchmarks, c.key, "all", "all");
    const industryBm =
      benchmarks.find(
        (b) => b.category === c.key && b.industry === company.industry && b.size_band === "all"
      ) ?? national;
    return {
      key: c.key,
      label: c.label,
      short: c.short,
      score,
      deviation:
        score != null && bm
          ? deviationValue(score, Number(bm.mean), Number(bm.sd))
          : null,
      nationalMean: national ? Math.round(Number(national.mean) * 10) / 10 : null,
      industryMean: industryBm ? Math.round(Number(industryBm.mean) * 10) / 10 : null,
    };
  });

  return {
    company,
    industryLabel: INDUSTRY_LABELS[company.industry] ?? company.industry,
    sizeBandLabel: SIZE_BAND_LABELS[company.employee_size_band] ?? company.employee_size_band,
    n,
    totalScore,
    categoryScores,
    departments: (agg?.departments ?? []) as DepartmentResult[],
    freeTexts: agg?.free_texts ?? [],
    minResponsesPerDept: agg?.min_responses_per_dept ?? 3,
    levelThresholds: thresholds ?? [30, 55, 75, 90],
    level: totalScore != null ? levelForScore(totalScore, thresholds) : null,
    totalDeviation,
    totalTopPercent: totalDeviation != null ? topPercent(totalDeviation) : null,
    benchmarkN: totalBm ? totalBm.n : null,
    benchmarkSource: totalBm ? totalBm.source : null,
    categories,
  };
}
