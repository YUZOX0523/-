import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron(日次)から呼ばれる。実回答企業数が閾値(scoring_config.
 * benchmark_switch_threshold)を超えたら、ベンチマークを実データ集計値に切替える。
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("refresh_benchmarks");
  if (error) {
    console.error("ベンチマーク更新に失敗:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, result: data });
}
