// WordPress「導入事例 自動下書き作成API」連携用のクライアント側ヘルパー。
// API仕様: docs/wordpress-api-spec.md(清水さん作成の仕様書のMarkdown版)
// APIキーを扱う処理はここには書かない(サーバー側 /api/wordpress/* のみ)。

export type WpTerm = { id: number; name: string };

export type WpOptions = {
  implementation: WpTerm[];
  employees: WpTerm[];
  location: WpTerm[];
  industry: WpTerm[];
};

export type WpDraftResult = {
  post_id: number;
  status: string;
  edit_url?: string;
  preview_url?: string;
  permalink?: string;
};

// 生成済みWordPress原稿の冒頭コメント(貼り付け手順+タイトル)からタイトルを抽出する。
// 「タイトル(タイトル欄にコピペ):」の同一行 or 次行のどちらの書き方にも対応。
export function extractWpTitle(wordpressText: string, draftText: string): string {
  const m = wordpressText.match(
    /タイトル\s*[((]タイトル欄にコピペ[))]\s*[::]\s*([^\r\n]*)\r?\n?\s*([^\r\n]*)/
  );
  if (m) {
    const sameLine = m[1].trim();
    if (sameLine) return sameLine;
    const nextLine = (m[2] ?? "").trim();
    if (nextLine && !nextLine.startsWith("-->")) return nextLine;
  }
  const h1 = draftText.match(/^#\s+(.+)$/m);
  return h1 ? h1[1].trim() : "";
}

// チェック用原稿(Markdown)のfrontmatterから企業名を抽出する
export function extractCompany(draftText: string): string {
  const m = draftText.match(/^company:\s*(.+)$/m);
  return m ? m[1].trim() : "";
}

// WordPress原稿の冒頭にある「使い方」説明コメントを取り除く。
// タイトルは投稿APIに別項目で渡すため、本文に説明コメントを残す必要がない。
// Gutenbergブロックのコメント(<!-- wp:... -->)は本文そのものなので残す。
export function stripInstructionComments(html: string): string {
  let s = html.trimStart();
  while (s.startsWith("<!--") && !/^<!--\s*\/?wp:/.test(s)) {
    const end = s.indexOf("-->");
    if (end === -1) break;
    s = s.slice(end + 3).trimStart();
  }
  return s.trim();
}

// 業種(industry)は文字列の完全一致で既存/新規が判定され、表記ゆれがあると
// 類似タームが重複作成されてしまう(仕様書7.1の注意)。全角半角・空白・
// 波ダッシュの違いを吸収した正規化キーで既存タームと突き合わせる。
export function normalizeTermName(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/[~〜～]/g, "〜")
    .toLowerCase();
}

// 入力中の業種名に近い既存タームを返す(重複作成を防ぐためのサジェスト用)
export function findSimilarTerms(input: string, terms: WpTerm[], limit = 6): WpTerm[] {
  const key = normalizeTermName(input);
  if (key.length < 2) return [];
  return terms
    .filter((t) => {
      const cand = normalizeTermName(t.name);
      return cand !== key && (cand.includes(key) || key.includes(cand));
    })
    .slice(0, limit);
}

// 従業員数タームを人数の昇順に並べる(WordPress側の登録順は不揃いのため)
export function sortEmployeeTerms(terms: WpTerm[]): WpTerm[] {
  const lower = (t: WpTerm) => {
    const m = t.name.normalize("NFKC").replace(/,/g, "").match(/\d+/);
    return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
  };
  return [...terms].sort((a, b) => lower(a) - lower(b) || a.name.localeCompare(b.name, "ja"));
}
