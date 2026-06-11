import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: companyAdmin } = await supabase
    .from("company_admins")
    .select("company_id, name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!companyAdmin) {
    // 企業担当者でない場合: 管理者なら管理画面へ
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    redirect(adminRow ? "/admin" : "/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="no-print border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="font-bold text-brand-700">
            AI活用レベル診断
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/dashboard" className="text-gray-600 hover:text-brand-700">
              ダッシュボード
            </Link>
            <Link href="/dashboard/setup" className="text-gray-600 hover:text-brand-700">
              部署・URL設定
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
