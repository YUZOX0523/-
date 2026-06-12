import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildDashboardData, type Company } from "@/lib/dashboard-data";
import CompanyDashboard from "@/components/CompanyDashboard";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

/** A4印刷(PDF保存)用レポートページ。役員報告にそのまま使える体裁 */
export default async function ReportPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: companyAdmin } = await supabase
    .from("company_admins")
    .select("company_id, companies(*)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!companyAdmin?.companies) redirect("/login");

  const company = (
    Array.isArray(companyAdmin.companies)
      ? companyAdmin.companies[0]
      : companyAdmin.companies
  ) as Company;
  const data = await buildDashboardData(supabase, company);
  const consultationUrl =
    process.env.NEXT_PUBLIC_CONSULTATION_URL ?? "https://digirise.ai/contact/";

  return (
    <div className="mx-auto max-w-4xl bg-white">
      <div className="no-print mb-6 flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 p-4">
        <p className="text-sm text-brand-800">
          「印刷 / PDF保存」から<strong>送信先: PDFに保存</strong>を選ぶとPDFがダウンロードできます(A4推奨)
        </p>
        <PrintButton />
      </div>

      <header className="border-b-4 border-brand-600 pb-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-brand-600">AI活用レベル診断レポート</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digirise-logo.png" alt="DigiRise" width={110} />
        </div>
        <h1 className="mt-1 text-3xl font-black">{company.name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {data.industryLabel} / {data.sizeBandLabel} / 回答 {data.n} 名 /{" "}
          {new Date().toLocaleDateString("ja-JP")} 時点 / 発行: 株式会社デジライズ
        </p>
      </header>

      <div className="mt-6">
        <CompanyDashboard data={data} consultationUrl={consultationUrl} forPrint />
      </div>

      <footer className="mt-8 border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
        本レポートは株式会社デジライズ「AI活用レベル診断」により自動生成されました。
        お問い合わせ: {consultationUrl}
      </footer>
    </div>
  );
}
