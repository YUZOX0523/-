import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * service roleクライアント(RLSバイパス)。
 * トークン検証付きRoute Handler・登録API・Cronなどサーバー専用。
 * クライアントコンポーネントから絶対にimportしないこと。
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
