/**
 * LP用: ダッシュボード成果物のイメージモック。
 * 実画像ではなくUIで再現しているため、高解像度でも鮮明に表示される。
 */

const CELL_COLORS = (score: number) => {
  const t = Math.max(0, Math.min(1, score / 100));
  const alpha = 0.1 + t * 0.85;
  return {
    backgroundColor: `rgba(0, 114, 178, ${alpha.toFixed(2)})`,
    color: t > 0.55 ? "#fff" : "#1f2937",
  };
};

function MiniRadar() {
  const cx = 60, cy = 56, r = 44;
  const angle = (i: number) => (-90 + i * 60) * (Math.PI / 180);
  const pt = (i: number, v: number) =>
    `${(cx + Math.cos(angle(i)) * r * v).toFixed(1)},${(cy + Math.sin(angle(i)) * r * v).toFixed(1)}`;
  const ring = (v: number) => [0, 1, 2, 3, 4, 5].map((i) => pt(i, v)).join(" ");
  const self = [0.82, 0.68, 0.72, 0.55, 0.74, 0.62];
  const national = [0.55, 0.55, 0.55, 0.55, 0.55, 0.55];
  return (
    <svg viewBox="0 0 120 112" className="h-auto w-full" aria-hidden>
      {[0.33, 0.66, 1].map((v) => (
        <polygon key={v} points={ring(v)} fill="none" stroke="#e5e7eb" strokeWidth="1" />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line
          key={i}
          x1={cx} y1={cy}
          x2={pt(i, 1).split(",")[0]} y2={pt(i, 1).split(",")[1]}
          stroke="#e5e7eb" strokeWidth="1"
        />
      ))}
      <polygon
        points={national.map((v, i) => pt(i, v)).join(" ")}
        fill="rgba(153,153,153,0.12)" stroke="#999" strokeWidth="1.5"
      />
      <polygon
        points={self.map((v, i) => pt(i, v)).join(" ")}
        fill="rgba(0,114,178,0.22)" stroke="#0072B2" strokeWidth="2"
      />
    </svg>
  );
}

export default function LpDashboardMockup() {
  const rows: [string, number, number, number, number][] = [
    ["開発部", 78, 74, 70, 75],
    ["営業部", 64, 58, 61, 61],
    ["経理部", 41, 35, 44, 39],
  ];
  return (
    <div className="relative">
      {/* ブラウザ風フレーム */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-hero">
        <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
          <span className="ml-3 flex-1 truncate rounded-md bg-white px-3 py-1 text-[9px] text-gray-400">
            ai-shindan.digirise.ai/dashboard
          </span>
        </div>
        <div className="space-y-2.5 p-3">
          {/* ヒーロー(偏差値) */}
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-br from-navy-950 via-navy-800 to-brand-800 px-4 py-3.5 text-white">
            <div>
              <p className="text-[8px] text-white/60">総合AI活用偏差値</p>
              <p className="bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-3xl font-black leading-none text-transparent">
                62.8
              </p>
              <p className="mt-1 text-[8px] text-white/70">
                全国のIT・通信業の中で <strong className="text-white">上位10%</strong>
                <span className="text-white/40">(n=128社)</span>
              </p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-center">
              <p className="text-[7px] text-white/60">AI活用レベル</p>
              <p className="text-sm font-black">Lv.4</p>
              <p className="text-[8px] font-bold text-cyan-200">組織展開</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {/* レーダー */}
            <div className="rounded-xl border border-gray-100 p-2.5">
              <p className="text-[8px] font-bold text-gray-700">6カテゴリー比較</p>
              <MiniRadar />
              <div className="flex justify-center gap-2 text-[7px] text-gray-500">
                <span className="font-bold text-[#0072B2]">■ 自社</span>
                <span>■ 全国平均</span>
              </div>
            </div>
            {/* ヒートマップ */}
            <div className="rounded-xl border border-gray-100 p-2.5">
              <p className="text-[8px] font-bold text-gray-700">部署別ヒートマップ</p>
              <table className="mt-1.5 w-full border-separate border-spacing-0.5 text-[7px]">
                <thead>
                  <tr className="text-gray-400">
                    <th className="text-left font-medium">部署</th>
                    <th className="font-medium">リテラシー</th>
                    <th className="font-medium">活用度</th>
                    <th className="font-medium">推進度</th>
                    <th className="font-medium">総合</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([name, a, b, c, t]) => (
                    <tr key={name}>
                      <td className="pr-1 font-bold text-gray-600">{name}</td>
                      {[a, b, c, t].map((v, i) => (
                        <td
                          key={i}
                          className="rounded px-1 py-1 text-center font-bold tabular-nums"
                          style={CELL_COLORS(v)}
                        >
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1 text-[6.5px] text-gray-400">
                色が濃いほど高スコア。弱い部署がひと目で分かる
              </p>
            </div>
          </div>
          {/* 推奨アクション */}
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gradient-to-r from-brand-50 to-cyan-50 px-3 py-2.5">
            <div>
              <p className="text-[7px] font-bold text-flame">推奨アクション</p>
              <p className="text-[9px] font-bold text-gray-800">
                「浸透度」改善には → 法人リスキリング(導入社数No.1)
              </p>
            </div>
            <span className="rounded-md bg-brand-600 px-2 py-1 text-[7px] font-bold text-white">
              無料相談
            </span>
          </div>
        </div>
      </div>

      {/* 注釈チップ(モックの縁に重ねて表示し、見出しと干渉しないようにする) */}
      <div className="absolute -top-3 left-3 hidden rounded-lg bg-white px-3 py-1.5 text-[10px] font-bold text-navy-900 shadow-card lg:block">
        全国偏差値で立ち位置が分かる ↓
      </div>
      <div className="absolute -left-3 bottom-24 hidden rounded-lg bg-white px-3 py-1.5 text-[10px] font-bold text-navy-900 shadow-card lg:block">
        弱い部署・弱いテーマを特定 →
      </div>
      {/* PDFバッジ */}
      <div className="absolute -bottom-3 right-4 rounded-full bg-gradient-to-r from-brand-500 to-violet2 px-3.5 py-1.5 text-[10px] font-bold text-white shadow-lg">
        A4レポート(PDF)出力対応
      </div>
    </div>
  );
}
