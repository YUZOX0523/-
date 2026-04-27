import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { ScoringResult } from '@/lib/scoring';

const RadarChartComponent = dynamic(() => import('@/components/RadarChartComponent'), {
  ssr: false,
  loading: () => <div className="h-[340px] flex items-center justify-center text-gray-400 text-sm">チャート読み込み中...</div>,
});

type ResultsData = {
  company: { name: string; contactName: string | null; createdAt: string };
  responseCount: number;
  scoring: ScoringResult | null;
  respondents: Array<{
    name: string | null;
    department: string | null;
    role: string | null;
    date: string;
  }>;
};

async function fetchResults(token: string): Promise<ResultsData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
  const res = await fetch(`${baseUrl}/api/results/${token}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

const RANK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  S: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  A: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
  B: { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
  C: { bg: '#ffedd5', text: '#9a3412', border: '#f97316' },
  D: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
};

export default async function ResultsPage({ params }: { params: { token: string } }) {
  const data = await fetchResults(params.token);

  if (!data) {
    notFound();
  }

  const { company, responseCount, scoring, respondents } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-violet-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
              <span className="text-blue-800 font-black text-xs">AI</span>
            </div>
            <span className="text-blue-200 text-sm font-medium">AI活用組織診断 by デジライズ</span>
          </div>
          <h1 className="text-3xl font-bold mb-1">{company.name}</h1>
          <div className="flex items-center gap-4 text-blue-200 text-sm">
            <span>診断実施: {new Date(company.createdAt).toLocaleDateString('ja-JP')}</span>
            <span>|</span>
            <span>回答者数: {responseCount}名</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {responseCount === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-700 mb-2">まだ回答がありません</h2>
            <p className="text-gray-500 text-sm">
              社員が回答を送信すると、こちらに診断結果が表示されます。
            </p>
          </div>
        ) : scoring ? (
          <>
            {/* Score overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Main score */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <p className="text-sm font-medium text-gray-500 mb-4">総合AI活用スコア</p>
                <div className="flex items-end gap-4 mb-4">
                  <div>
                    <div className="text-6xl font-black text-gray-900 leading-none">
                      {scoring.deviationScore}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">偏差値</div>
                  </div>
                  <div className="pb-1">
                    <div
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-xl font-black text-2xl border-2"
                      style={{
                        backgroundColor: RANK_COLORS[scoring.rank]?.bg,
                        color: RANK_COLORS[scoring.rank]?.text,
                        borderColor: RANK_COLORS[scoring.rank]?.border,
                      }}
                    >
                      {scoring.rank}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <p className="font-semibold text-gray-800">{scoring.rankDescription}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    国内企業の上位 <strong className="text-blue-700">{scoring.topPercentile}%</strong> に位置しています
                  </p>
                </div>

                {/* Score bar */}
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>D</span>
                    <span>C</span>
                    <span>B</span>
                    <span>A</span>
                    <span>S</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, ((scoring.deviationScore - 20) / 60) * 100))}%`,
                        backgroundColor: RANK_COLORS[scoring.rank]?.border,
                      }}
                    />
                  </div>
                  <div className="text-center text-xs text-gray-400 mt-1">
                    得点: {scoring.totalScore} / 100
                  </div>
                </div>
              </div>

              {/* Radar chart */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <p className="text-sm font-medium text-gray-500 mb-2">カテゴリ別スコア</p>
                <RadarChartComponent categoryScores={scoring.categoryScores} />
              </div>
            </div>

            {/* Category breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-bold text-gray-800 mb-5">カテゴリ別詳細</h2>
              <div className="space-y-4">
                {scoring.categoryScores
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((cs) => {
                    const vsAvg = cs.score - cs.benchmark;
                    return (
                      <div key={cs.categoryId}>
                        <div className="flex items-center gap-3 mb-1.5">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cs.color }}
                          />
                          <span className="text-sm font-medium text-gray-700 flex-1">
                            {cs.categoryName}
                          </span>
                          <span className="text-sm font-bold text-gray-900">{cs.score}点</span>
                          <span
                            className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                              vsAvg >= 0
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {vsAvg >= 0 ? '+' : ''}{vsAvg}
                          </span>
                        </div>
                        <div className="ml-5 h-2 bg-gray-100 rounded-full overflow-hidden relative">
                          {/* Benchmark marker */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10"
                            style={{ left: `${cs.benchmark}%` }}
                          />
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${cs.score}%`,
                              backgroundColor: cs.color,
                              opacity: 0.8,
                            }}
                          />
                        </div>
                        <div className="ml-5 flex justify-between text-xs text-gray-400 mt-0.5">
                          <span>0</span>
                          <span className="text-gray-300">│ 平均{cs.benchmark}</span>
                          <span>100</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Issues & Actions */}
            {scoring.issues.length > 0 && (
              <div>
                <h2 className="text-base font-bold text-gray-800 mb-4">
                  優先課題と打ち手
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    スコアが低いカテゴリを優先度順に表示
                  </span>
                </h2>
                <div className="space-y-4">
                  {scoring.issues.map((issue, idx) => (
                    <div
                      key={issue.categoryId}
                      className={`rounded-2xl border-2 p-6 ${
                        issue.severity === 'high'
                          ? 'border-red-200 bg-red-50'
                          : 'border-orange-200 bg-orange-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            issue.severity === 'high'
                              ? 'bg-red-600 text-white'
                              : 'bg-orange-500 text-white'
                          }`}
                        >
                          {issue.severity === 'high' ? '要改善' : '改善推奨'}
                        </span>
                        <span className="font-bold text-gray-800">{issue.categoryName}</span>
                        <span className="ml-auto text-xs text-gray-500">優先度 {idx + 1}</span>
                      </div>

                      <div className="bg-white rounded-xl p-4 mb-4">
                        <p className="text-xs font-semibold text-gray-500 mb-1">課題</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{issue.problem}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">推奨される打ち手</p>
                        <ul className="space-y-2">
                          {issue.actions.map((action, ai) => (
                            <li key={ai} className="flex items-start gap-2">
                              <span
                                className={`shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center mt-0.5 ${
                                  issue.severity === 'high'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-orange-500 text-white'
                                }`}
                              >
                                {ai + 1}
                              </span>
                              <span className="text-sm text-gray-700">{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scoring.issues.length === 0 && (
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 text-center">
                <p className="text-green-700 font-semibold">
                  全カテゴリで良好なスコアです！
                </p>
                <p className="text-green-600 text-sm mt-1">
                  さらなるAI活用の高度化に向けて、継続的な取り組みを推奨します。
                </p>
              </div>
            )}

            {/* Respondents list */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-base font-bold text-gray-800 mb-4">
                回答者一覧
                <span className="ml-2 text-sm font-normal text-gray-400">{responseCount}名</span>
              </h2>
              <div className="space-y-2">
                {respondents.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-xs font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-800">
                        {r.name || '匿名'}
                      </span>
                      {(r.department || r.role) && (
                        <span className="text-xs text-gray-400 ml-2">
                          {[r.department, r.role].filter(Boolean).join(' / ')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(r.date).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white py-6">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-800 rounded-md flex items-center justify-center">
              <span className="text-white font-black text-xs">AI</span>
            </div>
            <span className="text-sm font-semibold text-gray-700">AI活用組織診断</span>
          </div>
          <p className="text-xs text-gray-400">
            Powered by デジライズ株式会社 | AI活用支援・研修・コンサルティング
          </p>
        </div>
      </footer>
    </div>
  );
}
