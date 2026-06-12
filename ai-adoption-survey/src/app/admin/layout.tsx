import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!adminRow) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-navy-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/digirise-logo-white.png" alt="DigiRise" width={100} />
            <span className="text-xs text-gray-400">管理画面</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/admin" className="text-gray-300 hover:text-white">
              企業一覧
            </Link>
            <Link href="/admin/benchmarks" className="text-gray-300 hover:text-white">
              ベンチマーク
            </Link>
            <Link href="/admin/questions" className="text-gray-300 hover:text-white">
              設問
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
