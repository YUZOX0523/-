import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getDb, initSchema } from '@/lib/db';
import { aggregateAnswers, calculateScoring } from '@/lib/scoring';
import type { ScoringResult } from '@/lib/scoring';
import { DigiRiseLogoMark } from '@/components/DigiRiseLogo';

const RadarChartComponent = dynamic(() => import('@/components/RadarChartComponent'), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] flex items-center justify-center text-gray-400 text-sm">
      チャート読み込み中...
    </div>
  ),
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
  try {
    await initSchema();
    const sql = getDb();
    const companyRows = await sql`
      SELECT id, name, contact_name, created_at::text as created_at
      FROM companies WHERE results_token = ${token}
    `;
    if (companyRows.length === 0) return null;
    const company = companyRows[0] as {
      id: number; name: string; contact_name: string | null; created_at: string;
    };

    const rows = await sql`
      SELECT answers, respondent_name, respondent_department, respondent_role, created_at::text as created_at
      FROM survey_responses WHERE company_id = ${company.id} ORDER BY created_at DESC
    ` as Array<{
      answers: string; respondent_name: string | null;
      respondent_department: string | null; respondent_role: string | null; created_at: string;
    }>;

    const responseCount = rows.length;
    const scoring = responseCount > 0
      ? calculateScoring(aggregateAnswers(rows.map(r => JSON.parse(r.answers) as Record<number, number>)))
      : null;

    return {
      company: { name: company.name, contactName: company.contact_name, createdAt: company.created_at },
      responseCount,
      scoring,
      respondents: rows.map(r => ({
        name: r.respondent_name,
        department: r.respondent_department,
        role: r.respondent_role,
        date: r.created_at,
      })),
    };
  } catch {
    return null;
  }
}

const RANK_STYLES: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  S: { bg: '#FFF7ED', text: '#92400E', border: '#F59E0B', glow: '#F59E0B' },
  A: { bg: '#EEF2FF', text: '#3730A3', border: '#6366F1', glow: '#6366F1' },
  B: { bg: '#ECFDF5', text: '#065F46', border: '#10B981', glow: '#10B981' },
  C: { bg: '#FFF7ED', text: '#9A3412', border: '#F97316', glow: '#F97316' },
  D: { bg: '#FEF2F2', text: '#991B1B', border: '#EF4444', glow: '#EF4444' },
};

export default async function ResultsPage({ params }: { params: { token: string } }) {
  const data = await fetchResults(params.token);
  if (!data) notFound();

  const { company, responseCount, scoring, respondents } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg, #0A0520 0%, #160835 50%, #0A1A40 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-2.5 mb-5">
            <DigiRiseLogoMark size={28} />
            <span className="text-sm font-semibold" style={{ color: '#00D4FF' }}>
              AI活用組織診断 by DigiRise
            </span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2 leading-tight">{company.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: '#9CA3AF' }}>
            <span>診断実施: {new Date(company.createdAt).toLocaleDateString('ja-JP')}</span>
            <span>|</span>
            <span
              className="font-semibold px-3 py-0.5 rounded-full text-xs"
              style={{ background: '#7B3FFF30', color: '#C4B5FD' }}
            >
              回答者数: {responseCount}名
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {responseCount === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: '#F8F7FF' }}
            >
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-700 mb-2">まだ回答がありません</h2>
            <p className="text-gray-400 text-sm">社員が回答を送信すると、こちらに診断結果が表示されます。</p>
          </div>
        ) : scoring ? (
          <>
            {/* Score overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              {/* Main score card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">総合AI活用スコア</p>

                <div className="flex items-start gap-5 mb-5">
                  {/* Deviation score circle */}
                  <div className="relative">
                    <svg width="100" height="100" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#F3F4F6" strokeWidth="10" />
                      <circle
                        cx="50" cy="50" r="42"
                        fill="none"
                        stroke="url(#scoreGrad)"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 42}`}
                        strokeDashoffset={`${2 * Math.PI * 42 * (1 - Math.min(100, Math.max(0, scoring.deviationScore - 20)) / 60)}`}
                        transform="rotate(-90 50 50)"
                      />
                      <defs>
                        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#7B3FFF" />
                          <stop offset="100%" stopColor="#00D4FF" />
                        </linearGradient>
                      </defs>
                      <text x="50" y="46" textAnchor="middle" className="font-black" style={{ fontSize: 22, fontWeight: 900, fill: '#111827' }}>
                        {scoring.deviationScore}
                      </text>
                      <text x="50" y="62" textAnchor="middle" style={{ fontSize: 9, fill: '#9CA3AF' }}>偏差値</text>
                    </svg>
                  </div>

                  <div className="flex-1 pt-1">
                    {/* Rank badge */}
                    <div
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-black text-3xl mb-3"
                      style={{
                        background: RANK_STYLES[scoring.rank]?.bg,
                        color: RANK_STYLES[scoring.rank]?.text,
                        borderColor: RANK_STYLES[scoring.rank]?.border,
                      }}
                    >
                      {scoring.rank}
                    </div>
                    <p className="font-bold text-gray-800 text-sm">{scoring.rankDescription}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      国内企業の上位{' '}
                      <strong style={{ color: '#7B3FFF' }}>{scoring.topPercentile}%</strong>
                    </p>
                  </div>
                </div>

                <div
                  className="rounded-xl px-4 py-3 text-center"
                  style={{ background: 'linear-gradient(135deg, #7B3FFF08, #00D4FF08)', border: '1px solid #7B3FFF15' }}
                >
                  <p className="text-xs text-gray-500">
                    総得点 <strong className="text-gray-800 text-base">{scoring.totalScore}</strong> / 100点
                  </p>
                </div>
              </div>

              {/* Radar chart */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">カテゴリ別スコア</p>
                <RadarChartComponent categoryScores={scoring.categoryScores} />
              </div>
            </div>

            {/* Category breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-sm font-bold text-gray-800 mb-5 uppercase tracking-wide">カテゴリ別詳細</h2>
              <div className="space-y-5">
                {scoring.categoryScores
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((cs) => {
                    const vsAvg = cs.score - cs.benchmark;
                    return (
                      <div key={cs.categoryId}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: cs.color }} />
                          <span className="text-sm font-semibold text-gray-700 flex-1">{cs.categoryName}</span>
                          <span className="text-lg font-black text-gray-900">{cs.score}</span>
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={
                              vsAvg >= 0
                                ? { background: '#EEF2FF', color: '#4338CA' }
                                : { background: '#FEF2F2', color: '#B91C1C' }
                            }
                          >
                            {vsAvg >= 0 ? '+' : ''}{vsAvg}
                          </span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                          <div
                            className="absolute top-0 bottom-0 w-0.5 z-10"
                            style={{ left: `${cs.benchmark}%`, background: '#9CA3AF' }}
                          />
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${cs.score}%`, background: cs.color, opacity: 0.85 }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-300 mt-0.5 px-0.5">
                          <span>0</span>
                          <span className="text-gray-400">平均 {cs.benchmark}</span>
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
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">優先課題と打ち手</h2>
                  <span className="text-xs text-gray-400 font-normal">スコアが低いカテゴリを優先度順に表示</span>
                </div>
                <div className="space-y-4">
                  {scoring.issues.map((issue, idx) => (
                    <div
                      key={issue.categoryId}
                      className="rounded-2xl border-2 p-6"
                      style={
                        issue.severity === 'high'
                          ? { borderColor: '#FCA5A5', background: '#FFF5F5' }
                          : { borderColor: '#FCD34D', background: '#FFFBEB' }
                      }
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <span
                          className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
                          style={{ background: issue.severity === 'high' ? '#EF4444' : '#F59E0B' }}
                        >
                          {issue.severity === 'high' ? '要改善' : '改善推奨'}
                        </span>
                        <span className="font-bold text-gray-800">{issue.categoryName}</span>
                        <span className="ml-auto text-xs text-gray-400 font-medium">優先度 {idx + 1}</span>
                      </div>

                      <div className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
                        <p className="text-xs font-bold text-gray-400 mb-1.5">課題</p>
                        <p className="text-sm text-gray-700 leading-relaxed">{issue.problem}</p>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-gray-500 mb-2.5">推奨される打ち手</p>
                        <ul className="space-y-2">
                          {issue.actions.map((action, ai) => (
                            <li key={ai} className="flex items-start gap-2.5">
                              <span
                                className="shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white mt-0.5"
                                style={{ background: issue.severity === 'high' ? '#EF4444' : '#F59E0B' }}
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
              <div
                className="rounded-2xl border-2 p-6 text-center"
                style={{ borderColor: '#6EE7B7', background: '#F0FDF4' }}
              >
                <p className="text-green-700 font-bold">全カテゴリで良好なスコアです！</p>
                <p className="text-green-600 text-sm mt-1">さらなる高度化に向けて継続的な取り組みを推奨します。</p>
              </div>
            )}

            {/* Respondents */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">
                回答者一覧
                <span className="ml-2 text-xs font-normal text-gray-400 normal-case">{responseCount}名</span>
              </h2>
              <div className="space-y-1">
                {respondents.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #7B3FFF, #00D4FF)' }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-gray-800">{r.name || '匿名'}</span>
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

      <footer
        className="mt-12 py-6 border-t border-gray-200"
        style={{ background: 'linear-gradient(135deg, #0A0520, #160835)' }}
      >
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <DigiRiseLogoMark size={24} />
            <span className="text-sm font-bold text-white">AI活用組織診断</span>
          </div>
          <p className="text-xs" style={{ color: '#6B7280' }}>
            Powered by DigiRise株式会社 | AI活用支援・研修・コンサルティング
          </p>
        </div>
      </footer>
    </div>
  );
}
