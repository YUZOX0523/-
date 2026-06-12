import { topPercent } from "@/lib/scoring";

/**
 * 全国分布の中での自社の立ち位置を示すゲージ。
 * 左=下位、中央=全国平均、右=上位。良い時も悪い時も直感的に伝わる。
 */
export default function PositionGauge({ deviation }: { deviation: number }) {
  const pct = topPercent(deviation); // 上位◯%
  const pos = Math.max(3, Math.min(97, 100 - pct)); // バー上の位置(右=上位)

  return (
    <div className="mt-5 max-w-md">
      <div className="relative pt-7">
        {/* 自社マーカー */}
        <div
          className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${pos}%` }}
        >
          <span className="whitespace-nowrap rounded-md bg-white px-2 py-0.5 text-[11px] font-black text-navy-900 shadow">
            貴社
          </span>
          <span
            className="h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-white"
            aria-hidden
          />
        </div>
        {/* 分布バー */}
        <div className="relative h-3 rounded-full bg-gradient-to-r from-orange-400/80 via-white/30 to-cyan-300/90">
          {/* 全国平均線 */}
          <span
            className="absolute left-1/2 top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-white/70"
            aria-hidden
          />
          {/* 自社位置ドット */}
          <span
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-navy-900 bg-white shadow"
            style={{ left: `${pos}%` }}
            aria-hidden
          />
        </div>
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-white/50">
        <span>◀ 下位グループ</span>
        <span>全国平均</span>
        <span>上位グループ ▶</span>
      </div>
      <p className="mt-2 text-sm font-bold text-white/90">
        全国を100社の列に並べると、貴社は
        <span className={pct <= 50 ? "text-cyan-300" : "text-orange-300"}>
          先頭から{pct}番目
        </span>
        の位置です
      </p>
    </div>
  );
}
