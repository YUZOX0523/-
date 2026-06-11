import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildDashboardData, type Company } from "@/lib/dashboard-data";
import CompanyDashboard from "@/components/CompanyDashboard";

export const dynamic = "force-dynamic";

/** 管理者用: 各企業のダッシュボード閲覧(営業準備用) */
export default async function AdminCompanyPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!company) notFound();

  const data = await buildDashboardData(supabase, company as Company);
  const consultationUrl =
    process.env.NEXT_PUBLIC_CONSULTATION_URL ?? "https://digirise.ai/contact/";

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-brand-600 hover:underline">
          ← 企業一覧へ戻る
        </Link>
        <h1 className="mt-2 text-2xl font-black">{company.name}</h1>
        <p className="text-sm text-gray-500">
          {data.industryLabel} / {data.sizeBandLabel} / 回答 {data.n} 名
        </p>
      </div>
      <CompanyDashboard data={data} consultationUrl={consultationUrl} />
    </div>
  );
}
