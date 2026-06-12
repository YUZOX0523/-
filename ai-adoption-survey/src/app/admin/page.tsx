import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { INDUSTRY_LABELS, SIZE_BAND_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

type CompanyOverview = {
  id: string;
  name: string;
  industry: string;
  employee_size_band: string;
  expected_respondents: number | null;
  created_at: string;
  admin_name: string | null;
  admin_email: string | null;
  admin_phone: string | null;
  response_count: number;
  avg_total_score: number | null;
};

export default async function AdminPage() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_companies_overview");
  if (error) throw error;
  const companies = (data ?? []) as CompanyOverview[];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">登録企業一覧(リード)</h1>
          <p className="text-sm text-gray-500">{companies.length} 社</p>
        </div>
        <a
          href="/api/admin/export-leads"
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
        >
          CSVエクスポート
        </a>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3">会社名</th>
              <th className="px-4 py-3">業種</th>
              <th className="px-4 py-3">規模</th>
              <th className="px-4 py-3">担当者</th>
              <th className="px-4 py-3">メール</th>
              <th className="px-4 py-3">電話</th>
              <th className="px-4 py-3 text-right">回答数</th>
              <th className="px-4 py-3 text-right">総合スコア</th>
              <th className="px-4 py-3">登録日</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {companies.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{INDUSTRY_LABELS[c.industry] ?? c.industry}</td>
                <td className="px-4 py-3">
                  {SIZE_BAND_LABELS[c.employee_size_band] ?? c.employee_size_band}
                </td>
                <td className="px-4 py-3">{c.admin_name ?? "—"}</td>
                <td className="px-4 py-3">{c.admin_email ?? "—"}</td>
                <td className="px-4 py-3">{c.admin_phone ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{c.response_count}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {c.avg_total_score != null ? Math.round(Number(c.avg_total_score)) : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(c.created_at).toLocaleDateString("ja-JP")}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/companies/${c.id}`}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    ダッシュボード →
                  </Link>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                  登録企業はまだありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
