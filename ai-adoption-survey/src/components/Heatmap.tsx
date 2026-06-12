import { CATEGORIES } from "@/lib/constants";
import { levelForScore } from "@/lib/scoring";
import type { DepartmentResult } from "@/lib/dashboard-data";

/** スコア(0-100)を青の濃淡にマッピング(色覚多様性に配慮し単色グラデーション) */
function cellStyle(score: number) {
  const t = Math.max(0, Math.min(1, score / 100));
  const alpha = 0.08 + t * 0.85;
  return {
    backgroundColor: `rgba(0, 114, 178, ${alpha.toFixed(2)})`,
    color: t > 0.55 ? "#ffffff" : "#1f2937",
  };
}

function ScoreCell({ score, bold = false }: { score: number; bold?: boolean }) {
  return (
    <td
      className={`rounded px-2 py-2.5 text-center tabular-nums ${bold ? "font-black" : "font-bold"}`}
      style={cellStyle(score)}
    >
      {Math.round(score)}
    </td>
  );
}

function LevelBadge({ score, thresholds }: { score: number; thresholds?: number[] }) {
  const l = levelForScore(score, thresholds);
  return (
    <td className="whitespace-nowrap rounded bg-navy-950 px-2 py-2.5 text-center">
      <span className="text-[11px] font-black text-cyan-200">Lv.{l.level}</span>
    </td>
  );
}

export default function Heatmap({
  departments,
  minResponses,
  companyScores,
  companyTotal,
  thresholds,
}: {
  departments: DepartmentResult[];
  minResponses: number;
  companyScores?: Record<string, number>;
  companyTotal?: number | null;
  thresholds?: number[];
}) {
  // 表示できる部署の中で総合スコアの最高・最低を特定
  const scored = departments.filter((d) => d.sufficient && d.total_score != null);
  const best = scored.length >= 2
    ? scored.reduce((a, b) => ((a.total_score ?? 0) >= (b.total_score ?? 0) ? a : b))
    : null;
  const worst = scored.length >= 2
    ? scored.reduce((a, b) => ((a.total_score ?? 0) <= (b.total_score ?? 0) ? a : b))
    : null;

  return (
    <div>
      {/* 見方の説明 */}
      <div className="mb-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
        <p className="font-bold text-gray-800">📖 この表の見方</p>
        <p className="mt-1">
          <strong>縦が部署、横が診断カテゴリー</strong>です。マスの数字は0〜100のスコアで、
          <strong>色が濃いほど高スコア</strong>。色の薄い行は支援が必要な部署、薄い列は全社共通の課題カテゴリーです。
        </p>
        {best && worst && best.id !== worst.id && (
          <p className="mt-2">
            👉 貴社では <strong className="text-brand-700">{best.name}</strong>(総合
            {Math.round(best.total_score!)})が最も進んでおり、
            <strong className="text-flame">{worst.name}</strong>(総合
            {Math.round(worst.total_score!)})との差は
            {Math.round((best.total_score ?? 0) - (worst.total_score ?? 0))}
            ポイント。{best.name}のやり方を{worst.name}へ横展開するのが近道です。
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th scope="col" className="px-2 py-1 text-left font-medium text-gray-500">
                部署
              </th>
              <th scope="col" className="px-2 py-1 text-right font-medium text-gray-500">
                回答
              </th>
              {CATEGORIES.map((c) => (
                <th key={c.key} scope="col" className="px-2 py-1 text-center font-medium text-gray-500">
                  {c.short}
                </th>
              ))}
              <th scope="col" className="px-2 py-1 text-center font-bold text-gray-700">
                総合
              </th>
              <th scope="col" className="px-2 py-1 text-center font-bold text-gray-700">
                Lv
              </th>
            </tr>
          </thead>
          <tbody>
            {/* 全社平均行(比較の基準) */}
            {companyScores && companyTotal != null && (
              <tr>
                <th scope="row" className="px-2 py-2.5 text-left font-black">
                  全社平均
                </th>
                <td className="px-2 py-2.5 text-right tabular-nums text-gray-400">—</td>
                {CATEGORIES.map((c) => (
                  <ScoreCell key={c.key} score={companyScores[c.key] ?? 0} bold />
                ))}
                <ScoreCell score={companyTotal} bold />
                <LevelBadge score={companyTotal} thresholds={thresholds} />
              </tr>
            )}
            {departments.map((d) => (
              <tr key={d.id}>
                <th scope="row" className="px-2 py-2.5 text-left font-medium">
                  {d.name}
                  {best && d.id === best.id && (
                    <span className="ml-1.5 rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                      社内トップ
                    </span>
                  )}
                  {worst && d.id === worst.id && (
                    <span className="ml-1.5 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-flame">
                      要テコ入れ
                    </span>
                  )}
                </th>
                <td className="px-2 py-2.5 text-right tabular-nums text-gray-500">
                  {d.n}名
                </td>
                {d.sufficient && d.category_scores ? (
                  <>
                    {CATEGORIES.map((c) => (
                      <ScoreCell key={c.key} score={d.category_scores?.[c.key] ?? 0} />
                    ))}
                    <ScoreCell score={d.total_score ?? 0} bold />
                    <LevelBadge score={d.total_score ?? 0} thresholds={thresholds} />
                  </>
                ) : (
                  <td
                    colSpan={CATEGORIES.length + 2}
                    className="rounded bg-gray-50 px-2 py-2.5 text-center text-xs text-gray-400"
                  >
                    回答数不足({minResponses}名以上で表示されます)
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* カラースケール凡例 */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span>低い 0</span>
        <div
          className="h-3 w-40 rounded-full"
          style={{
            background:
              "linear-gradient(to right, rgba(0,114,178,0.08), rgba(0,114,178,0.93))",
          }}
        />
        <span>100 高い</span>
        <span className="ml-auto">
          ※ 個人の回答が特定されないよう、回答{minResponses}名未満の部署はスコアを表示しません
        </span>
      </div>
    </div>
  );
}
