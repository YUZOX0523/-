import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { INDUSTRY_LABELS, SIZE_BAND_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** リード一覧のCSVエクスポート(管理者のみ。権限はRPC側でも検証される) */
export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_companies_overview");
  if (error) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const header = [
    "会社名", "業種", "従業員規模", "担当者名", "メールアドレス", "電話番号",
    "登録日", "回答数", "総合スコア",
  ];
  const rows = (data ?? []).map((c: Record<string, unknown>) =>
    [
      c.name,
      INDUSTRY_LABELS[c.industry as string] ?? c.industry,
      SIZE_BAND_LABELS[c.employee_size_band as string] ?? c.employee_size_band,
      c.admin_name,
      c.admin_email,
      c.admin_phone,
      c.created_at ? new Date(c.created_at as string).toLocaleDateString("ja-JP") : "",
      c.response_count,
      c.avg_total_score != null ? Math.round(Number(c.avg_total_score)) : "",
    ]
      .map(csvEscape)
      .join(",")
  );
  // Excelでの文字化け防止にBOMを付与
  const csv = "\uFEFF" + [header.join(","), ...rows].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
