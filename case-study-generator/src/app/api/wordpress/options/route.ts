import { NextRequest } from "next/server";
import {
  WP_API_BASE,
  checkAppPassword,
  getWpApiKey,
  WP_KEY_MISSING_MESSAGE,
  wpErrorToMessage,
} from "@/lib/wpServer";

// WordPressのタクソノミー選択肢(導入サービス/従業員数/所在地/業種)を取得して返す。
// タームIDは管理画面での追加・削除で変わるため、毎回このAPIで最新を取得する
// (仕様書の指示: IDをハードコードしない)。

export async function GET(req: NextRequest) {
  const denied = checkAppPassword(req);
  if (denied) return denied;

  const apiKey = getWpApiKey();
  if (!apiKey) {
    return Response.json({ ok: false, error: WP_KEY_MISSING_MESSAGE }, { status: 500 });
  }

  try {
    const res = await fetch(`${WP_API_BASE}/case-generator/options`, {
      headers: { "X-Case-Api-Key": apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success || !body?.data) {
      return Response.json(
        { ok: false, error: wpErrorToMessage(res.status, body) },
        { status: 502 }
      );
    }
    return Response.json({ ok: true, data: body.data });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return Response.json(
      { ok: false, error: `WordPress(digirise.ai)に接続できませんでした: ${detail}` },
      { status: 502 }
    );
  }
}
