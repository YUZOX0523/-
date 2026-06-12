/**
 * LP用: 「診断で何が得られるか」を立体的に見せるショーケース。
 * 成果物ごとにモックUI+具体コピーをジグザグ配置で訴求する。
 */

const cell = (score: number) => {
  const t = Math.max(0, Math.min(1, score / 100));
  return {
    backgroundColor: `rgba(0, 114, 178, ${(0.1 + t * 0.85).toFixed(2)})`,
    color: t > 0.55 ? "#fff" : "#1f2937",
  };
};

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
      <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-red-300" />
        <span className="h-2 w-2 rounded-full bg-amber-300" />
        <span className="h-2 w-2 rounded-full bg-green-300" />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function MockDeviation() {
  return (
    <Frame>
      <div className="rounded-xl bg-gradient-to-br from-navy-950 via-navy-800 to-brand-800 p-5 text-white">
        <p className="text-[10px] text-white/60">総合AI活用偏差値</p>
        <div className="flex items-end justify-between">
          <p className="bg-gradient-to-r from-cyan-300 via-white to-violet-300 bg-clip-text text-5xl font-black leading-none text-transparent">
            46.3
          </p>
          <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-center">
            <p className="text-[9px] text-white/60">AI活用レベル</p>
            <p className="text-sm font-black">Lv.2 <span className="text-cyan-200">個人利用</span></p>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-white/70">
          全国の製造業・101〜300名規模の中で <strong className="text-white">下位35%</strong>(n=128社)
        </p>
      </div>
      <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3">
        <p className="text-[10px] font-bold text-red-700">
          ⚠ 警告: 貴社のAI活用は全国の下位グループに位置しています
        </p>
        <p className="mt-1 text-[9px] leading-relaxed text-gray-600">
          先行企業は1人あたり月30時間超の業務削減を実現しています。このまま1年経過すると、生産性だけでなく採用市場・取引先からの評価でも不利が固定化しかねません…
        </p>
      </div>
    </Frame>
  );
}

function MockHeatmap() {
  const rows: [string, number, number, number, number][] = [
    ["開発部", 78, 74, 70, 75],
    ["営業部", 64, 58, 61, 61],
    ["人事部", 52, 47, 50, 50],
    ["経理部", 41, 35, 44, 39],
  ];
  return (
    <Frame>
      <p className="text-xs font-bold text-gray-700">部署別スコアヒートマップ</p>
      <table className="mt-2 w-full border-separate border-spacing-1 text-[10px]">
        <thead>
          <tr className="text-gray-400">
            <th className="text-left font-medium">部署</th>
            <th className="font-medium">リテラシー</th>
            <th className="font-medium">活用度</th>
            <th className="font-medium">浸透度</th>
            <th className="font-medium">総合</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, a, b, c, t], i) => (
            <tr key={name}>
              <td className="pr-1 font-bold text-gray-600">
                {name}
                {i === 0 && (
                  <span className="ml-1 rounded bg-brand-100 px-1 py-0.5 text-[7px] font-bold text-brand-700">
                    社内トップ
                  </span>
                )}
                {i === 3 && (
                  <span className="ml-1 rounded bg-orange-100 px-1 py-0.5 text-[7px] font-bold text-flame">
                    要テコ入れ
                  </span>
                )}
              </td>
              {[a, b, c, t].map((v, j) => (
                <td key={j} className="rounded px-1.5 py-1.5 text-center font-bold tabular-nums" style={cell(v)}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 rounded-lg bg-gray-50 p-2 text-[9px] leading-relaxed text-gray-500">
        👉 開発部(総合75)のやり方を経理部(39)へ横展開するのが近道です — 差は36ポイント
      </p>
    </Frame>
  );
}

function MockPersonal() {
  return (
    <div className="mx-auto w-44 overflow-hidden rounded-[1.6rem] border-4 border-gray-800 bg-white shadow-hero">
      <div className="bg-gray-800 pb-1 pt-1 text-center">
        <span className="inline-block h-1 w-12 rounded-full bg-gray-600" />
      </div>
      <div className="p-3 text-center">
        <p className="text-[8px] font-bold text-brand-600">診断が完了しました</p>
        <div className="mt-2 rounded-xl bg-gradient-to-br from-navy-950 to-brand-800 p-3 text-white">
          <p className="text-3xl font-black">
            58<span className="text-xs text-white/40">/100</span>
          </p>
          <p className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[8px] font-bold">
            Lv.3 業務活用
          </p>
        </div>
        <svg viewBox="0 0 100 88" className="mx-auto mt-2 w-24" aria-hidden>
          {(() => {
            const cx = 50, cy = 44, r = 34;
            const a = (i: number) => (-90 + i * 60) * (Math.PI / 180);
            const p = (i: number, v: number) =>
              `${cx + Math.cos(a(i)) * r * v},${cy + Math.sin(a(i)) * r * v}`;
            const self = [0.7, 0.5, 0.62, 0.45, 0.66, 0.55];
            return (
              <>
                <polygon points={[0,1,2,3,4,5].map((i) => p(i, 1)).join(" ")} fill="none" stroke="#e5e7eb" />
                <polygon points={[0,1,2,3,4,5].map((i) => p(i, 0.55)).join(" ")} fill="rgba(153,153,153,0.12)" stroke="#bbb" />
                <polygon points={self.map((v, i) => p(i, v)).join(" ")} fill="rgba(0,114,178,0.25)" stroke="#0072B2" strokeWidth="1.5" />
              </>
            );
          })()}
        </svg>
        <p className="mt-1 rounded-lg bg-brand-50 p-1.5 text-[7.5px] leading-relaxed text-brand-800">
          あなたの「AIリテラシー」は全国平均を上回っています
        </p>
      </div>
    </div>
  );
}

const ITEMS: {
  label: string;
  title: string;
  points: string[];
  mock: React.ReactNode;
}[] = [
  {
    label: "DELIVERABLE 01",
    title: "会議で1枚で語れる「全国偏差値」と、忖度なしの自動所見",
    points: [
      "全国・同業種・同規模と比較した偏差値と上位◯%を即算出。「ウチは進んでる方?」の議論が数字で終わります",
      "スコアに応じて危機感も率直に伝える辛口の自動所見つき。経営会議・役員報告の説得材料がその場で手に入ります",
      "A4数枚のPDFレポート出力対応。そのまま社内資料として配布できます",
    ],
    mock: <MockDeviation />,
  },
  {
    label: "DELIVERABLE 02",
    title: "「どの部署から手を打つか」が決まる部署別ヒートマップ",
    points: [
      "部署×6カテゴリーのマトリクスを色の濃淡で表示。強い部署・置いていかれている部署が3秒で分かります",
      "社内トップ部署と要テコ入れ部署を自動で特定し、横展開の道筋まで提案",
      "回答3名未満の部署は自動で非表示 — 匿名性を守る設計だから、社員が本音で答えます",
    ],
    mock: <MockHeatmap />,
  },
  {
    label: "DELIVERABLE 03",
    title: "回答した社員にも、その場で個人スコアを即返却",
    points: [
      "社員一人ひとりに個人スコア・レベル・全国比較レーダーを即表示。「やらされ調査」で終わりません",
      "回答そのものが社員のAI意識を高めるきっかけに — 診断自体が最初の打ち手になります",
      "氏名・メールアドレスは一切取得しない完全匿名設計。現場への展開ハードルは最小です",
    ],
    mock: <MockPersonal />,
  },
];

export default function LpDeliverables() {
  return (
    <div className="space-y-14">
      {ITEMS.map((item, i) => (
        <div
          key={item.label}
          className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-14"
        >
          <div className={i % 2 === 1 ? "lg:order-2" : ""}>
            <p className="text-xs font-bold tracking-widest text-brand-600">{item.label}</p>
            <h3 className="mt-2 text-xl font-bold leading-snug tracking-tight sm:text-2xl">
              {item.title}
            </h3>
            <ul className="mt-5 space-y-3">
              {item.points.map((p) => (
                <li key={p} className="flex gap-2.5 text-sm leading-relaxed text-gray-600">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet2 text-[10px] font-bold text-white">
                    ✓
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={`mx-auto w-full max-w-md ${i % 2 === 1 ? "lg:order-1" : ""}`}>
            {item.mock}
          </div>
        </div>
      ))}
    </div>
  );
}
