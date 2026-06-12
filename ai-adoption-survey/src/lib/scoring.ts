import { CATEGORIES, CategoryKey, LEVELS } from "./constants";

export type Question = {
  id: string;
  category: CategoryKey;
  text: string;
  scale_type: "agreement" | "frequency";
  is_reversed: boolean;
  sort_order: number;
  version: number;
};

export type CategoryScores = Record<string, number>;

const DEFAULT_WEIGHTS: Record<string, number> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, 1])
);
// レベル換算は厳格運用: スコア50(平均的回答)でもLv.2止まり。Lv.3以上は優秀組織のみ
const DEFAULT_THRESHOLDS = [30, 55, 75, 90];

/** 回答(1〜5)からカテゴリースコア(0〜100)と総合スコアを計算する */
export function computeScores(
  questions: Question[],
  answers: Record<string, number>,
  weights: Record<string, number> = DEFAULT_WEIGHTS
): { categoryScores: CategoryScores; totalScore: number } {
  const byCategory: Record<string, number[]> = {};
  for (const q of questions) {
    const raw = answers[q.id];
    if (raw == null || raw < 1 || raw > 5) {
      throw new Error(`回答が不足しています: ${q.id}`);
    }
    const value = q.is_reversed ? 6 - raw : raw;
    (byCategory[q.category] ??= []).push(value);
  }

  const categoryScores: CategoryScores = {};
  for (const [cat, values] of Object.entries(byCategory)) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    categoryScores[cat] = Math.round(((avg - 1) / 4) * 1000) / 10;
  }

  let weightSum = 0;
  let total = 0;
  for (const [cat, score] of Object.entries(categoryScores)) {
    const w = weights[cat] ?? 1;
    total += score * w;
    weightSum += w;
  }
  return {
    categoryScores,
    totalScore: Math.round((total / weightSum) * 10) / 10,
  };
}

/** 偏差値 = 50 + 10 × (score − mean) / sd */
export function deviationValue(score: number, mean: number, sd: number): number {
  if (!sd || sd <= 0) return 50;
  return Math.round((50 + (10 * (score - mean)) / sd) * 10) / 10;
}

/** 偏差値から「上位◯◯%」(正規分布近似) */
export function topPercent(deviation: number): number {
  const z = (deviation - 50) / 10;
  const p = 1 - normalCdf(z);
  return Math.max(1, Math.min(99, Math.round(p * 100)));
}

/**
 * 順位の表示ラベル。「上位59%」のような分かりにくい表現を避け、
 * 中央値より上は「上位◯%」、下は「下位◯%」で表す。
 */
export function rankLabel(deviation: number): {
  text: string;
  positive: boolean;
} {
  const pct = topPercent(deviation);
  return pct <= 50
    ? { text: `上位${pct}%`, positive: true }
    : { text: `下位${100 - pct}%`, positive: false };
}

function normalCdf(z: number): number {
  // Abramowitz & Stegun 近似
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p =
    d *
    t *
    (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
}

export function levelForScore(
  totalScore: number,
  thresholds: number[] = DEFAULT_THRESHOLDS
): (typeof LEVELS)[number] {
  let idx = 0;
  for (const t of thresholds) {
    if (totalScore >= t) idx++;
  }
  return LEVELS[Math.min(idx, LEVELS.length - 1)];
}

export type Benchmark = {
  category: string;
  industry: string;
  size_band: string;
  mean: number;
  sd: number;
  n: number;
  source: "seed" | "actual";
};

/** 「業種×規模 → 業種 → 規模 → 全国」の順でベンチマークをフォールバック検索 */
export function pickBenchmark(
  benchmarks: Benchmark[],
  category: string,
  industry: string,
  sizeBand: string
): Benchmark | undefined {
  const candidates = benchmarks.filter((b) => b.category === category);
  return (
    candidates.find((b) => b.industry === industry && b.size_band === sizeBand) ??
    candidates.find((b) => b.industry === industry && b.size_band === "all") ??
    candidates.find((b) => b.industry === "all" && b.size_band === sizeBand) ??
    candidates.find((b) => b.industry === "all" && b.size_band === "all")
  );
}
