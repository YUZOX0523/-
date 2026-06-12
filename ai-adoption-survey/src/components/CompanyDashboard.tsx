import Image from "next/image";
import type { DashboardData } from "@/lib/dashboard-data";
import { NO1_ATTRIBUTION, type CategoryKey } from "@/lib/constants";
import {
  categoryInsight,
  overallInsight,
  recommendServices,
  toneOf,
} from "@/lib/insights";
import RadarCompare from "./RadarCompare";
import { SERIES_COLORS } from "@/lib/colors";
import Heatmap from "./Heatmap";
import DeptResponseChart from "./DeptResponseChart";

function Card({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-card sm:p-6 ${className}`}
    >
      {title && (
        <div className="mb-4">
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>
      )}
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
        <div className="flex flex-col items-center py-10 text-center">
          <Image src="/char-squirrel.png" alt="" width={120} height={172} />
          <p className="mt-4 font-bold text-gray-700">まだ回答がありません</p>
          <p className="mt-1 text-sm text-gray-500">
            サーベイURLを社内チャットやメールで展開しましょう。回答はリアルタイムに反映されます。
          </p>
        </div>
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

  const overall = overallInsight({
    totalDeviation: data.totalDeviation ?? 50,
    industryLabel: data.industryLabel,
    level: data.level ?? { level: 3, name: "業務活用" },
  });
  const overallCharacter =
    overall.tone === "lead" ? "/char-giraffe.png" : "/char-squirrel-pointer.png";

  const recommendations = recommendServices({
    categories: data.categories,
    totalDeviation: data.totalDeviation,
  });

  const expected = data.company.expected_respondents;
  const responseRate = expected ? Math.round((data.n / expected) * 100) : null;

  return (
    <div className="space-y-6">
      {/* 1. ヒーローセクション */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-950 via-navy-800 to-brand-800 p-6 text-white shadow-hero sm:p-10">
        {/* 装飾(ロゴモチーフの光彩) */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, #06b6d4, #6d28d9 70%, transparent)" }}
        />
        <div className="relative flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <Image src="/digirise-logo-white.png" alt="DigiRise" width={110} height={28} />
              <span className="text-xs font-medium tracking-wide text-white/60">
                AI活用レベル診断
              </span>
            </div>
            <p className="mt-5 text-sm font-medium text-white/70">総合AI活用偏差値</p>
            <div className="mt-1 flex items-baseline justify-center gap-3 sm:justify-start">
              <span className="bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-7xl font-black leading-none text-transparent sm:text-8xl">
                {data.totalDeviation != null ? data.totalDeviation.toFixed(1) : "—"}
              </span>
            </div>
            <p className="mt-4 text-sm text-white/80">
              全国の{data.industryLabel}・{data.sizeBandLabel}規模の企業の中で{" "}
              <strong className="text-lg text-white">
                上位{data.totalTopPercent ?? "—"}%
              </strong>
              {data.benchmarkN != null && (
                <span className="ml-2 text-xs text-white/50">
                  (ベンチマーク母数 n={data.benchmarkN}社
                  {data.benchmarkSource === "seed" ? "・初期参考値" : ""})
                </span>
              )}
            </p>
          </div>
          <div className="text-center">
            <div className="rounded-2xl border border-white/15 bg-white/10 px-10 py-6 backdrop-blur">
              <p className="text-xs text-white/60">AI活用レベル</p>
              <p className="mt-1 text-4xl font-black tracking-tight">
                Lv.{data.level?.level}
              </p>
              <p className="mt-0.5 text-lg font-bold text-cyan-200">
                {data.level?.name}
              </p>
              <p className="mt-2 text-xs text-white/60">
                総合スコア {Math.round(data.totalScore!)} / 100 ・ 回答 {data.n}名
              </p>
            </div>
          </div>
        </div>
        {data.level && (
          <p className="relative mt-6 border-t border-white/10 pt-4 text-center text-sm text-white/70 sm:text-left">
            {data.level.description}
          </p>
        )}
      </section>

      {/* 2. 総合所見(トーン別) */}
      <section
        className={`flex flex-col gap-5 rounded-2xl border p-5 shadow-card sm:flex-row sm:items-center sm:p-6 ${
          overall.tone === "crisis"
            ? "border-red-200 bg-gradient-to-br from-red-50 to-orange-50"
            : overall.tone === "push"
              ? "border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50"
              : "border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50"
        }`}
      >
        {!forPrint && (
          <div className="mx-auto w-24 flex-none sm:w-28">
            <Image
              src={overallCharacter}
              alt="デジライズ公式キャラクター"
              width={112}
              height={160}
              className="h-auto w-full"
            />
          </div>
        )}
        <div>
          <p
            className={`text-base font-black sm:text-lg ${
              overall.tone === "crisis"
                ? "text-red-700"
                : overall.tone === "push"
                  ? "text-amber-700"
                  : "text-cyan-700"
            }`}
          >
            {overall.headline}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">{overall.body}</p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 3. レーダーチャート */}
        <Card
          title="6カテゴリー比較"
          subtitle="自社(青)・全国平均(グレー)・同業種平均(オレンジ)の重ね描き"
        >
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

        {/* 4. 強み・弱みの詳細解説 */}
        <Card
          title="強み・弱みの詳細解説"
          subtitle="全国偏差値にもとづく自動分析コメント"
        >
          <div className="space-y-3">
            {strengths.map((c) => (
              <div key={c.key} className="rounded-xl border border-brand-100 bg-brand-50 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-black text-brand-800">
                    <span className="mr-1.5 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      強み
                    </span>
                    {c.label}
                  </p>
                  <p className="text-xs font-bold text-brand-700">
                    偏差値 {c.deviation?.toFixed(1)}
                  </p>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-gray-700">
                  {categoryInsight(c.key as CategoryKey, c.deviation ?? 50)}
                </p>
              </div>
            ))}
            {weaknesses.map((c) => {
              const crisis = toneOf(c.deviation ?? 50) === "crisis";
              return (
                <div
                  key={c.key}
                  className={`rounded-xl border p-4 ${
                    crisis ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`text-sm font-black ${crisis ? "text-red-800" : "text-amber-800"}`}>
                      <span
                        className={`mr-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${
                          crisis ? "bg-red-600" : "bg-amber-500"
                        }`}
                      >
                        {crisis ? "要注意" : "課題"}
                      </span>
                      {c.label}
                    </p>
                    <p className={`text-xs font-bold ${crisis ? "text-red-700" : "text-amber-700"}`}>
                      偏差値 {c.deviation?.toFixed(1)}
                    </p>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-gray-700">
                    {categoryInsight(c.key as CategoryKey, c.deviation ?? 50)}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* 5. 部署別ヒートマップ */}
      <Card
        title="部署別スコアヒートマップ"
        subtitle="強い部署・支援が必要な部署をひと目で把握"
      >
        <Heatmap
          departments={data.departments}
          minResponses={data.minResponsesPerDept}
          companyScores={data.categoryScores}
          companyTotal={data.totalScore}
        />
      </Card>

      {/* 6. 回答状況 */}
      <Card title="回答状況" subtitle="回答が少ない部署にはリマインドをおすすめします">
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
        {!forPrint ? (
          <DeptResponseChart
            data={data.departments.map((d) => ({ name: d.name, count: d.n }))}
          />
        ) : (
          <ul className="grid grid-cols-2 gap-1 text-sm">
            {data.departments.map((d) => (
              <li key={d.id} className="flex justify-between border-b border-gray-100 py-1">
                <span>{d.name}</span>
                <span className="tabular-nums">{d.n}名</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 7. 推奨アクション(デジライズサービス) */}
      <section className="rounded-3xl bg-gradient-to-br from-navy-950 to-navy-800 p-5 text-white shadow-hero sm:p-8">
        <div className="flex items-center gap-3">
          <Image src="/digirise-logo-white.png" alt="DigiRise" width={96} height={24} />
          <h2 className="text-lg font-bold">診断結果にもとづく推奨アクション</h2>
        </div>
        <p className="mt-1 text-sm text-white/60">
          貴社のスコアパターンから、いま投資対効果が最も高い打ち手を選定しました
        </p>
        <div
          className={`mt-5 grid grid-cols-1 gap-4 ${
            recommendations.length >= 3 ? "lg:grid-cols-3" : "sm:grid-cols-2"
          }`}
        >
          {recommendations.map(({ service, reason }, i) => (
            <div
              key={service.id}
              className="flex flex-col rounded-2xl bg-white p-5 text-gray-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold text-flame">
                    優先度 {i + 1}
                    {service.badge && (
                      <span className="ml-2 rounded bg-navy-900 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
                        {service.badge.replace(" ※", "")}
                      </span>
                    )}
                  </p>
                  <p className="mt-1.5 text-base font-black leading-snug">{service.name}</p>
                  <p className="mt-1 text-xs font-medium text-brand-700">{service.tagline}</p>
                </div>
                {!forPrint && (
                  <Image
                    src={service.image}
                    alt={service.imageAlt}
                    width={56}
                    height={96}
                    className="h-auto w-12 flex-none sm:w-14"
                  />
                )}
              </div>
              <p className="mt-3 rounded-lg bg-gray-50 p-2.5 text-xs leading-relaxed text-gray-600">
                <strong className="text-gray-800">貴社への推奨理由: </strong>
                {reason}
              </p>
              <ul className="mt-3 flex-1 space-y-1.5 text-xs text-gray-600">
                {service.bullets.map((b) => (
                  <li key={b} className="flex gap-1.5">
                    <span className="text-brand-600">✓</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              {!forPrint ? (
                <div className="mt-4 space-y-2">
                  <a
                    href={service.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-brand-700"
                  >
                    サービス詳細を見る
                  </a>
                  <a
                    href={consultationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-brand-600 px-4 py-2 text-center text-xs font-bold text-brand-700 hover:bg-brand-50"
                  >
                    無料相談を予約する
                  </a>
                </div>
              ) : (
                <p className="mt-3 break-all text-[10px] text-gray-400">{service.url}</p>
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-[10px] text-white/40">{NO1_ATTRIBUTION}</p>
      </section>

      {/* 現場の声(自由記述) */}
      {data.freeTexts.length > 0 && (
        <Card
          title={`現場の声 — AI活用の課題・困りごと(${data.freeTexts.length}件)`}
          subtitle="社員から寄せられた生の声。研修・施策テーマの宝庫です"
        >
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
