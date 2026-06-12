import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildDashboardData, type Company } from "@/lib/dashboard-data";
import CompanyDashboard from "@/components/CompanyDashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: companyAdmin } = await supabase
    .from("company_admins")
    .select("company_id, name, companies(*)")
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
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{company.name}</h1>
          <p className="text-sm text-gray-500">
            {data.industryLabel} / {data.sizeBandLabel} / 回答 {data.n} 名
          </p>
        </div>
        <Link
          href="/dashboard/report"
          className="no-print rounded-lg border border-brand-600 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-brand-50"
        >
          PDFレポートを出力
        </Link>
      </div>
      <CompanyDashboard data={data} consultationUrl={consultationUrl} />
    </div>
  );
}
