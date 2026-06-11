import { CATEGORIES } from "@/lib/constants";
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

export default function Heatmap({
  departments,
  minResponses,
}: {
  departments: DepartmentResult[];
  minResponses: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-1 text-sm">
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
          </tr>
        </thead>
        <tbody>
          {departments.map((d) => (
            <tr key={d.id}>
              <th scope="row" className="px-2 py-2 text-left font-medium">
                {d.name}
              </th>
              <td className="px-2 py-2 text-right tabular-nums text-gray-500">
                {d.n}名
              </td>
              {d.sufficient && d.category_scores ? (
                <>
                  {CATEGORIES.map((c) => {
                    const score = d.category_scores?.[c.key] ?? 0;
                    return (
                      <td
                        key={c.key}
                        className="rounded px-2 py-2 text-center font-bold tabular-nums"
                        style={cellStyle(score)}
                      >
                        {Math.round(score)}
                      </td>
                    );
                  })}
                  <td
                    className="rounded px-2 py-2 text-center font-black tabular-nums"
                    style={cellStyle(d.total_score ?? 0)}
                  >
                    {Math.round(d.total_score ?? 0)}
                  </td>
                </>
              ) : (
                <td
                  colSpan={CATEGORIES.length + 1}
                  className="rounded bg-gray-50 px-2 py-2 text-center text-xs text-gray-400"
                >
                  回答数不足({minResponses}名以上で表示されます)
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-gray-400">
        ※ 個人の回答が特定されないよう、回答{minResponses}名未満の部署はスコアを表示しません
      </p>
    </div>
  );
}
