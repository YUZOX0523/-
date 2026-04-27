import { CATEGORIES, QUESTIONS } from './questions';

// 仮想ベンチマーク（国内平均企業を想定）
const BENCHMARK_MEAN = 42;
const BENCHMARK_STD = 14;

export type CategoryScore = {
  categoryId: string;
  categoryName: string;
  score: number; // 0-100
  benchmark: number;
  color: string;
};

export type Issue = {
  categoryId: string;
  categoryName: string;
  severity: 'high' | 'medium';
  problem: string;
  actions: string[];
};

export type ScoringResult = {
  totalScore: number;
  deviationScore: number;
  rank: 'S' | 'A' | 'B' | 'C' | 'D';
  rankLabel: string;
  rankDescription: string;
  rankColor: string;
  topPercentile: number; // 上位X%の X の値 (例: 16 → 上位16%)
  categoryScores: CategoryScore[];
  issues: Issue[];
};

const RANK_CONFIG = {
  S: {
    label: 'S ランク',
    description: 'AI先進企業',
    color: '#d97706',
    minDeviation: 65,
  },
  A: {
    label: 'A ランク',
    description: 'AI活用推進企業',
    color: '#2563eb',
    minDeviation: 55,
  },
  B: {
    label: 'B ランク',
    description: 'AI活用発展途上企業',
    color: '#059669',
    minDeviation: 45,
  },
  C: {
    label: 'C ランク',
    description: 'AI活用初期段階企業',
    color: '#d97706',
    minDeviation: 35,
  },
  D: {
    label: 'D ランク',
    description: 'AI活用未着手企業',
    color: '#dc2626',
    minDeviation: 0,
  },
};

const ISSUES_MAP: Record<string, { problem: string; actions: string[] }> = {
  strategy: {
    problem:
      'AI活用の経営戦略・推進体制が未整備です。場当たり的なAI導入では効果が限定的になります。トップダウンのコミットメントと明確なビジョンが急務です。',
    actions: [
      'AI推進責任者（DX担当役員/CAIO）の任命と権限付与',
      '全社AI活用方針・3カ年ロードマップの策定',
      'AI推進プロジェクトチームの立ち上げと定例会設置',
      '経営層向けAI活用インパクト勉強会の実施',
    ],
  },
  practice: {
    problem:
      'AIツールの日常業務への統合が不十分です。導入コストに見合った活用率・定着率が実現できていません。具体的なユースケース展開が必要です。',
    actions: [
      '部門別・業務別AIツール活用ガイドブックの作成・配布',
      'AI活用成功事例の社内共有会と表彰制度の導入',
      'PoC（概念実証）プロジェクトの定期実施サイクル確立',
      '業務フローへのAI組み込み設計レビューの実施',
    ],
  },
  talent: {
    problem:
      'AI活用スキルの全社的な底上げが必要です。一部の人材への依存は組織リスクであり、全員参加型のAI活用を目指す必要があります。',
    actions: [
      'AIリテラシー研修プログラムの体系化・全社展開',
      'AI推進人材（社内AIチャンピオン）の育成・各部門配置',
      '社内AI活用コミュニティ（勉強会・Slackチャンネル等）の設置',
      '外部AI研修・資格取得支援制度の整備と奨励',
    ],
  },
  data: {
    problem:
      'データ基盤・AIセキュリティルールの整備が不十分です。安全かつ効果的なAI活用の前提条件が整っていない状態です。',
    actions: [
      'AIセキュリティガイドライン・社内利用規程の策定と全社周知',
      '業務データの棚卸し・デジタル化・整備プロジェクトの立ち上げ',
      'AIへの入力可否基準の明確化と社員向け教育の実施',
      'クラウド・SaaS活用推進方針の整備と活用促進',
    ],
  },
  culture: {
    problem:
      'AI活用を促進する組織文化の醸成が必要です。変化への抵抗・心理的障壁がAI活用の最大のボトルネックになっています。',
    actions: [
      '業務改善提案制度の導入・活性化とアイデアソンの定期開催',
      '心理的安全性を高めるマネジメントスタイル研修の実施',
      'AI活用実験プロジェクトへの参加奨励と小さな成功体験の積み重ね',
      '業界のAI活用動向レポートの定期的な社内共有',
    ],
  },
};

export function calculateCategoryScores(answers: Record<number, number>): CategoryScore[] {
  return CATEGORIES.map((category) => {
    const qs = QUESTIONS.filter((q) => q.category === category.id);
    const scores = qs.map((q) => answers[q.id] ?? 0);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return {
      categoryId: category.id,
      categoryName: category.name,
      score: Math.round((avg / 5) * 100),
      benchmark: category.benchmark,
      color: category.color,
    };
  });
}

export function calculateTotalScore(answers: Record<number, number>): number {
  const scores = QUESTIONS.map((q) => answers[q.id] ?? 0);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round((avg / 5) * 100);
}

export function calculateDeviationScore(totalScore: number): number {
  const raw = ((totalScore - BENCHMARK_MEAN) / BENCHMARK_STD) * 10 + 50;
  return Math.round(Math.min(80, Math.max(20, raw)));
}

// 偏差値 → 上位X%(小さいほど優秀) の変換テーブル
function deviationToTopPercentile(deviation: number): number {
  const table: [number, number][] = [
    [75, 1], [70, 2], [65, 7], [60, 16], [55, 31],
    [50, 50], [45, 69], [40, 84], [35, 93], [30, 98],
  ];
  for (const [dev, top] of table) {
    if (deviation >= dev) return top;
  }
  return 99;
}

export function calculateRank(deviationScore: number): {
  rank: 'S' | 'A' | 'B' | 'C' | 'D';
  label: string;
  description: string;
  color: string;
} {
  let rank: 'S' | 'A' | 'B' | 'C' | 'D' = 'D';
  if (deviationScore >= 65) rank = 'S';
  else if (deviationScore >= 55) rank = 'A';
  else if (deviationScore >= 45) rank = 'B';
  else if (deviationScore >= 35) rank = 'C';

  const config = RANK_CONFIG[rank];
  return { rank, label: config.label, description: config.description, color: config.color };
}

export function identifyIssues(categoryScores: CategoryScore[]): Issue[] {
  const issues: Issue[] = [];
  const sorted = [...categoryScores].sort((a, b) => a.score - b.score);

  for (const cs of sorted) {
    if (cs.score >= 60) continue;
    const severity = cs.score < 40 ? 'high' : 'medium';
    const data = ISSUES_MAP[cs.categoryId];
    if (data) {
      issues.push({
        categoryId: cs.categoryId,
        categoryName: cs.categoryName,
        severity,
        problem: data.problem,
        actions: data.actions,
      });
    }
  }

  return issues;
}

export function calculateScoring(answers: Record<number, number>): ScoringResult {
  const categoryScores = calculateCategoryScores(answers);
  const totalScore = calculateTotalScore(answers);
  const deviationScore = calculateDeviationScore(totalScore);
  const { rank, label, description, color } = calculateRank(deviationScore);
  const topPercentile = deviationToTopPercentile(deviationScore);
  const issues = identifyIssues(categoryScores);

  return {
    totalScore,
    deviationScore,
    rank,
    rankLabel: label,
    rankDescription: description,
    rankColor: color,
    topPercentile,
    categoryScores,
    issues,
  };
}

export function aggregateAnswers(responsesList: Record<number, number>[]): Record<number, number> {
  if (responsesList.length === 0) return {};
  const result: Record<number, number> = {};
  QUESTIONS.forEach((q) => {
    const vals = responsesList.map((r) => r[q.id] ?? 0).filter((v) => v > 0);
    if (vals.length > 0) {
      result[q.id] = vals.reduce((a, b) => a + b, 0) / vals.length;
    }
  });
  return result;
}
