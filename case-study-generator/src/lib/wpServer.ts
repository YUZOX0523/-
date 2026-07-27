// WordPress「導入事例 自動下書き作成API」のサーバー側共通処理。
// APIキー(WP_CASE_API_KEY)は仕様書の指示どおりサーバー側でのみ扱い、
// ブラウザには一切渡さない。フロントは /api/wordpress/* を経由する。

import { NextRequest } from "next/server";

export const WP_API_BASE =
  process.env.WP_API_BASE || "https://digirise.ai/wp-json/digirise/v1";

// 既存の /api/generate と同じ簡易認証(x-app-passwordヘッダー照合)。
// 認証NGならエラーResponseを返し、OKならnullを返す。
export function checkAppPassword(req: NextRequest): Response | null {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    return Response.json(
      { ok: false, error: "サーバーに APP_PASSWORD が設定されていません" },
      { status: 500 }
    );
  }
  if ((req.headers.get("x-app-password") ?? "") !== expected) {
    return Response.json({ ok: false, error: "パスワードが違います" }, { status: 401 });
  }
  return null;
}

export function getWpApiKey(): string | null {
  return process.env.WP_CASE_API_KEY || null;
}

export const WP_KEY_MISSING_MESSAGE =
  "サーバーに WP_CASE_API_KEY が設定されていません。Vercelの環境変数にWordPress側のAPIキーを追加してから再デプロイしてください。";

// WordPress側のエラーレスポンス({code, message})を社員向けの日本語に変換する
export function wpErrorToMessage(status: number, body: unknown): string {
  const code =
    body && typeof body === "object" && "code" in body ? String((body as { code: unknown }).code) : "";
  const message =
    body && typeof body === "object" && "message" in body
      ? String((body as { message: unknown }).message)
      : "";

  if (code === "case_api_key_invalid" || status === 401 || status === 403) {
    return "WordPress側でAPIキーが拒否されました。Vercelの環境変数 WP_CASE_API_KEY の値を確認してください。";
  }
  if (code === "invalid_term_id") {
    return "選択肢(導入サービス/従業員数/所在地)のIDがWordPress側と食い違っています。「選択肢を再読み込み」を押して選び直してください。";
  }
  if (code === "featured_image_invalid_file") {
    return "アイキャッチ画像のURLが画像ファイルではありませんでした。";
  }
  return `WordPress側でエラーが発生しました(${status}${code ? ` / ${code}` : ""})${
    message ? `: ${message}` : ""
  }`;
}
