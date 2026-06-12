import type { DashboardData } from "@/lib/dashboard-data";
import { SERVICE_RECOMMENDATIONS, type CategoryKey } from "@/lib/constants";
import RadarCompare from "./RadarCompare";
import { SERIES_COLORS } from "@/lib/colors";
import Heatmap from "./Heatmap";
import DeptResponseChart from "./DeptResponseChart";

function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 ${className}`}>
      {title && <h2 className="mb-4 text-lg font-bold">{title}</h2>}
      {children}
    </section>
  );
}

export default function CompanyDashboard({
  data,
  consultationUrl,
  forPrint = false,
}: {
  data: DashboardData;
  consultationUrl: string;
  forPrint?: boolean;
}) {
  const hasData = data.n > 0 && data.totalScore != null;

  if (!hasData) {
    return (
      <Card>
        <p className="py-10 text-center text-gray-500">
          まだ回答がありません。サーベイURLを社内に展開しましょう。
        </p>
      </Card>
    );
  }

  const radarData = data.categories.map((c) => ({
    label: c.short,
    self: c.score ?? 0,
    national: c.nationalMean ?? 0,
    industry: c.industryMean ?? 0,
  }));

  const ranked = data.categories
    .filter((c) => c.deviation != null)
    .sort((a, b) => (b.deviation ?? 0) - (a.deviation ?? 0));
  const strengths = ranked.slice(0, 2);
  const weaknesses = ranked.slice(-2).reverse();

  // 弱点カテゴリー → 推奨サービス(重複サービスはまとめる)
  const recommendations = Array.from(
    new Map(
      weaknesses.map((w) => {
        const rec = SERVICE_RECOMMENDATIONS[w.key as CategoryKey];
        return [rec.service, { ...rec, trigger: w }];
      })
    ).values()
  );

  const expected = data.company.expected_respondents;
  const responseRate = expected ? Math.round((data.n / expected) * 100) : null;

  return (
    <div className="space-y-6">
      {/* 1. ヒーローセクション */}
      <section className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-500 p-6 text-white sm:p-10">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-brand-100">総合AI活用偏差値</p>
            <div className="mt-1 flex items-baseline justify-center gap-2 sm:justify-start">
              <span className="text-7xl font-black leading-none sm:text-8xl">
                {data.totalDeviation != null ? data.totalDeviation.toFixed(1) : "—"}
              </span>
            </div>
            <p className="mt-3 text-sm text-brand-100">
              全国の{data.industryLabel}・{data.sizeBandLabel}規模の企業の中で
              <strong className="text-white">
                上位{data.totalTopPercent ?? "—"}%
              </strong>
              {data.benchmarkN != null && (
                <span className="ml-2 text-xs">
                  (ベンチマーク母数 n={data.benchmarkN}社
                  {data.benchmarkSource === "seed" ? "・初期参考値" : ""})
                </span>
              )}
            </p>
          </div>
          <div className="text-center">
            <div className="rounded-2xl bg-white/15 px-8 py-5 backdrop-blur">
              <p className="text-xs text-brand-100">AI活用レベル</p>
              <p className="mt-1 text-3xl font-black">
                Lv.{data.level?.level} {data.level?.name}
              </p>
              <p className="mt-1 text-xs text-brand-100">
                総合スコア {Math.round(data.totalScore!)} / 100
              </p>
            </div>
          </div>
        </div>
        {data.level && (
          <p className="mt-5 border-t border-white/20 pt-4 text-center text-sm text-brand-50 sm:text-left">
            {data.level.description}
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 2. レーダーチャート */}
        <Card title="6カテゴリー比較(自社 vs 全国 vs 同業種)">
          <RadarCompare
            data={radarData}
            height={340}
            series={[
              { key: "self", name: "自社", color: SERIES_COLORS.self, fillOpacity: 0.25 },
              { key: "national", name: "全国平均", color: SERIES_COLORS.national },
              { key: "industry", name: `同業種(${data.industryLabel})平均`, color: SERIES_COLORS.industry },
            ]}
          />
        </Card>

        {/* 5. 強み・弱みサマリー */}
        <Card title="強み・弱みサマリー">
          <div className="space-y-3">
            {strengths.map((c) => (
              <div key={c.key} className="rounded-xl border border-brand-100 bg-brand-50 p-4">
                <p className="text-xs font-bold text-brand-600">強み</p>
                <p className="mt-1 text-sm">
                  <strong>「{c.label}」</strong>が全国偏差値{" "}
                  <strong className="text-brand-700">{c.deviation?.toFixed(1)}</strong>
                  。{(c.deviation ?? 50) >= 55
                    ? "全国水準を明確に上回る強みです。社内の成功パターンとして他領域へ横展開しましょう。"
                    : "相対的に最も健闘している領域です。ここを起点に底上げを図りましょう。"}
                </p>
              </div>
            ))}
            {weaknesses.map((c) => (
              <div key={c.key} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-bold text-amber-700">課題</p>
                <p className="mt-1 text-sm">
                  <strong>「{c.label}」</strong>が全国偏差値{" "}
                  <strong className="text-amber-700">{c.deviation?.toFixed(1)}</strong>
                  。{(c.deviation ?? 50) < 45
                    ? "全国水準を下回っており、優先的なテコ入れが必要です。"
                    : "改善余地が残る領域です。次の一手で差がつきます。"}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* 3. 部署別ヒートマップ */}
      <Card title="部署別スコアヒートマップ">
        <Heatmap departments={data.departments} minResponses={data.minResponsesPerDept} />
      </Card>

      {/* 4. 回答状況 */}
      <Card title="回答状況">
        <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p>
            <span className="text-3xl font-black text-brand-700">{data.n}</span>
            <span className="text-sm text-gray-500">
              {" "}/ {expected ?? "—"} 名(配布想定)
            </span>
          </p>
          {responseRate != null && (
            <p className="text-sm font-bold text-gray-700">回答率 {responseRate}%</p>
          )}
        </div>
        {!forPrint && (
          <DeptResponseChart
            data={data.departments.map((d) => ({ name: d.name, count: d.n }))}
          />
        )}
        {forPrint && (
          <ul className="grid grid-cols-2 gap-1 text-sm">
            {data.departments.map((d) => (
              <li key={d.id} className="flex justify-between border-b border-gray-100 py-1">
                <span>{d.name}</span>
                <span className="tabular-nums">{d.n}名</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-gray-400">
          回答が少ない部署にはリマインドの送付をおすすめします
        </p>
      </Card>

      {/* 6. 推奨アクション */}
      <Card title="診断結果にもとづく推奨アクション">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {recommendations.map((rec) => (
            <div key={rec.service} className="flex flex-col rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-bold text-amber-600">
                「{rec.trigger.label}」(偏差値 {rec.trigger.deviation?.toFixed(1)})の改善に
              </p>
              <p className="mt-1 text-base font-bold">{rec.service}</p>
              <p className="mt-2 flex-1 text-sm text-gray-600">{rec.pitch}</p>
              {!forPrint && (
                <a
                  href={consultationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-brand-700"
                >
                  無料相談を予約する
                </a>
              )}
            </div>
          ))}
        </div>
        {forPrint && (
          <p className="mt-4 text-sm text-gray-600">
            無料相談のご予約: {consultationUrl}
          </p>
        )}
      </Card>

      {/* 現場の声(自由記述) */}
      {data.freeTexts.length > 0 && (
        <Card title={`現場の声 — AI活用の課題・困りごと(${data.freeTexts.length}件)`}>
          <ul className="space-y-3">
            {data.freeTexts.slice(0, forPrint ? 10 : 50).map((ft, i) => (
              <li key={i} className="rounded-xl bg-gray-50 p-4 text-sm">
                <p className="text-gray-800">{ft.text}</p>
                <p className="mt-1 text-xs text-gray-400">{ft.department}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
