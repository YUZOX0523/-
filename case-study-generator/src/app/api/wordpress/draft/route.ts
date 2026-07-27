import { NextRequest } from "next/server";
import {
  WP_API_BASE,
  checkAppPassword,
  getWpApiKey,
  WP_KEY_MISSING_MESSAGE,
  wpErrorToMessage,
} from "@/lib/wpServer";

// 生成済みのGutenberg本文+入力項目を、WordPressに「下書き」として登録する。
// 公開はWordPress管理画面で人が行う(このAPIから公開はできない仕様)。
// 写真(アイキャッチ・本文内画像)はWordPress側で手動対応するため
// featured_image_url は送らない。導入前の課題/導入後の効果のACF欄も
// 事例ページから廃止決定のため送らない。

export const maxDuration = 60;

type DraftRequestBody = {
  title?: unknown;
  content?: unknown;
  company_name?: unknown;
  corp_url?: unknown;
  implementation?: unknown;
  employees?: unknown;
  location?: unknown;
  industry?: unknown;
};

function isIdArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.length > 0 && v.every((n) => Number.isInteger(n) && n > 0);
}

export async function POST(req: NextRequest) {
  const denied = checkAppPassword(req);
  if (denied) return denied;

  const apiKey = getWpApiKey();
  if (!apiKey) {
    return Response.json({ ok: false, error: WP_KEY_MISSING_MESSAGE }, { status: 500 });
  }

  let body: DraftRequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "リクエストが不正です" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const industry = typeof body.industry === "string" ? body.industry.trim() : "";
  const companyName = typeof body.company_name === "string" ? body.company_name.trim() : "";
  const corpUrl = typeof body.corp_url === "string" ? body.corp_url.trim() : "";

  if (!title) {
    return Response.json({ ok: false, error: "タイトルが未入力です" }, { status: 400 });
  }
  if (!content || !content.includes("wp:")) {
    return Response.json(
      { ok: false, error: "本文がGutenbergブロック形式ではありません。WordPress入稿用の原稿を生成してから保存してください。" },
      { status: 400 }
    );
  }
  if (!industry) {
    return Response.json({ ok: false, error: "業種が未入力です" }, { status: 400 });
  }
  if (!isIdArray(body.implementation) || !isIdArray(body.employees) || !isIdArray(body.location)) {
    return Response.json(
      { ok: false, error: "導入サービス・従業員数・所在地をそれぞれ1つ以上選択してください" },
      { status: 400 }
    );
  }
  if (corpUrl && !/^https?:\/\/.+/.test(corpUrl)) {
    return Response.json(
      { ok: false, error: "企業ホームページURLは https:// から始まる形式で入力してください" },
      { status: 400 }
    );
  }

  // 仕様書7章のとおり: implementation/employees/location はタームID配列、
  // industry のみターム名の文字列(未存在ならWordPress側で自動作成される)
  const payload: Record<string, unknown> = {
    title,
    content,
    implementation: body.implementation,
    employees: body.employees,
    location: body.location,
    industry,
  };
  if (companyName) payload.company_name = companyName;
  if (corpUrl) payload.corp_url = corpUrl;

  try {
    const res = await fetch(`${WP_API_BASE}/case-generator/drafts`, {
      method: "POST",
      headers: {
        "X-Case-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(55_000),
    });
    const resBody = await res.json().catch(() => null);
    if (!res.ok || !resBody?.success || !resBody?.data?.post_id) {
      return Response.json(
        { ok: false, error: wpErrorToMessage(res.status, resBody) },
        { status: 502 }
      );
    }
    // 失敗時はWordPress側でロールバックされるため、中途半端な下書きは残らない(仕様書7.5)
    return Response.json({ ok: true, data: resBody.data });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return Response.json(
      { ok: false, error: `WordPress(digirise.ai)に接続できませんでした: ${detail}` },
      { status: 502 }
    );
  }
}
