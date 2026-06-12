"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORY_LABELS,
  INDUSTRY_LABELS,
  SIZE_BAND_LABELS,
} from "@/lib/constants";

type BenchmarkRow = {
  id: string;
  category: string;
  industry: string;
  size_band: string;
  mean: number;
  sd: number;
  n: number;
  source: "seed" | "actual";
  updated_at: string;
};

export default function AdminBenchmarksPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<BenchmarkRow[]>([]);
  const [threshold, setThreshold] = useState("");
  const [minDept, setMinDept] = useState("");
  const [filter, setFilter] = useState("all-all"); // 全国のみ初期表示
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: bms }, { data: config }] = await Promise.all([
        supabase
          .from("benchmarks")
          .select("*")
          .order("category")
          .order("industry")
          .order("size_band"),
        supabase.from("scoring_config").select("*").eq("id", 1).single(),
      ]);
      setRows((bms ?? []) as BenchmarkRow[]);
      if (config) {
        setThreshold(String(config.benchmark_switch_threshold));
        setMinDept(String(config.min_responses_per_dept));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveRow(row: BenchmarkRow) {
    const { error } = await supabase
      .from("benchmarks")
      .update({ mean: row.mean, sd: row.sd, n: row.n, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    setMessage(error ? "保存に失敗しました" : `${CATEGORY_LABELS[row.category] ?? row.category} を保存しました`);
  }

  async function saveConfig() {
    const { error } = await supabase
      .from("scoring_config")
      .update({
        benchmark_switch_threshold: Number(threshold),
        min_responses_per_dept: Number(minDept),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setMessage(error ? "設定の保存に失敗しました" : "設定を保存しました");
  }

  const visible = rows.filter((r) => {
    if (filter === "all-all") return r.industry === "all" && r.size_band === "all";
    if (filter === "industry") return r.industry !== "all" && r.size_band === "all";
    if (filter === "size") return r.industry === "all" && r.size_band !== "all";
    return true;
  });

  function updateLocal(id: string, patch: Partial<BenchmarkRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <div>
      <h1 className="text-2xl font-black">ベンチマーク管理</h1>

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="font-bold">集計設定</h2>
        <div className="mt-4 flex flex-wrap items-end gap-6">
          <div>
            <label htmlFor="threshold" className="block text-sm text-gray-600">
              実データ切替の最小企業数
            </label>
            <input id="threshold" type="number" min={1} value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="mt-1 w-32 rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <div>
            <label htmlFor="minDept" className="block text-sm text-gray-600">
              部署スコア表示の最小回答数
            </label>
            <input id="minDept" type="number" min={1} value={minDept}
              onChange={(e) => setMinDept(e.target.value)}
              className="mt-1 w-32 rounded-lg border border-gray-300 px-3 py-2" />
          </div>
          <button onClick={saveConfig}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700">
            設定を保存
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">ベンチマークパラメータ</h2>
          <label className="text-sm text-gray-600">
            表示:{" "}
            <select value={filter} onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1.5">
              <option value="all-all">全国</option>
              <option value="industry">業種別</option>
              <option value="size">規模別</option>
              <option value="all">すべて</option>
            </select>
          </label>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs text-gray-500">
              <tr>
                <th className="px-2 py-2">カテゴリー</th>
                <th className="px-2 py-2">業種</th>
                <th className="px-2 py-2">規模</th>
                <th className="px-2 py-2">mean</th>
                <th className="px-2 py-2">sd</th>
                <th className="px-2 py-2">n</th>
                <th className="px-2 py-2">source</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((r) => (
                <tr key={r.id}>
                  <td className="px-2 py-2 font-medium">
                    {r.category === "total" ? "総合" : CATEGORY_LABELS[r.category] ?? r.category}
                  </td>
                  <td className="px-2 py-2">
                    {r.industry === "all" ? "全国" : INDUSTRY_LABELS[r.industry] ?? r.industry}
                  </td>
                  <td className="px-2 py-2">
                    {r.size_band === "all" ? "全体" : SIZE_BAND_LABELS[r.size_band] ?? r.size_band}
                  </td>
                  {(["mean", "sd", "n"] as const).map((field) => (
                    <td key={field} className="px-2 py-1">
                      <input
                        type="number"
                        step="0.1"
                        value={r[field]}
                        aria-label={`${r.category} ${field}`}
                        onChange={(e) =>
                          updateLocal(r.id, { [field]: Number(e.target.value) })
                        }
                        className="w-20 rounded border border-gray-200 px-2 py-1"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      r.source === "actual"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {r.source}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <button onClick={() => saveRow(r)}
                      className="text-xs font-bold text-brand-600 hover:underline">
                      保存
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {message && (
        <p role="status" className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
          {message}
        </p>
      )}
    </div>
  );
}
