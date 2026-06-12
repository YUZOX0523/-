import { LEVELS } from "@/lib/constants";

/**
 * 5段階レベルラダー(デジライズ「企業での生成AI導入必勝法」×組織成熟度の融合版)。
 * 現在地をハイライトし、「多くの企業はレベル1・2で停滞」の構図を見せる。
 */
export default function LevelLadder({ current }: { current: number }) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-1.5">
        {LEVELS.map((l) => {
          const active = l.level === current;
          const stagnation = l.level <= 2;
          return (
            <div
              key={l.level}
              className={`relative rounded-xl border p-2.5 pt-3 text-center sm:p-3 ${
                active
                  ? "border-transparent bg-gradient-to-b from-brand-600 to-violet2 text-white shadow-md"
                  : stagnation
                    ? "border-dashed border-orange-300 bg-orange-50/60"
                    : "border-gray-200 bg-white"
              }`}
            >
              {active && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-flame px-2 py-0.5 text-[9px] font-bold text-white shadow">
                  現在地
                </span>
              )}
              <p className={`text-[10px] font-bold ${active ? "text-white/70" : "text-gray-400"}`}>
                Lv.{l.level}
              </p>
              <p
                className={`mt-0.5 text-[11px] font-bold leading-tight sm:text-xs ${
                  active ? "text-white" : "text-gray-700"
                }`}
              >
                {l.name}
              </p>
              <p
                className={`mt-1 hidden text-[9px] leading-tight sm:block ${
                  active ? "text-white/70" : "text-gray-400"
                }`}
              >
                {l.tools}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 grid grid-cols-5 gap-1.5 text-center text-[9px] font-bold sm:text-[10px]">
        <p className="col-span-2 rounded-md bg-orange-100 py-1.5 text-flame">
          ← 多くの企業がここで停滞
        </p>
        <p className="col-span-2 rounded-md bg-brand-100 py-1.5 text-brand-700">
          停滞圏を抜けた少数派 → 自動化へ
        </p>
        <p className="rounded-md bg-violet-100 py-1.5 text-violet2">
          AI開発で価値創出
        </p>
      </div>
    </div>
  );
}
