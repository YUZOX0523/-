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

// チェック用原稿(Markdown)のfrontmatterから企業名を抽出する
export function extractCompany(draftText: string): string {
  const m = draftText.match(/^company:\s*(.+)$/m);
  return m ? m[1].trim() : "";
}

// 生成済み原稿から、WordPressのタイトル欄に入れる記事タイトルを抽出する。
// AIの出力ゆれで1つの書き方に依存すると空欄になるため、確度の高い順に
// 複数の取り方を試し、最後はチェック用原稿の見出し+企業名から組み立てる。
export function extractWpTitle(wordpressText: string, draftText: string): string {
  // 1) 冒頭コメントの「タイトル(タイトル欄にコピペ):」(同一行 or 次行)
  const m = wordpressText.match(
    /タイトル\s*[((]タイトル欄にコピペ[))]\s*[::]\s*([^\r\n]*)\r?\n?\s*([^\r\n]*)/
  );
  if (m) {
    const sameLine = m[1].trim();
    if (sameLine) return sameLine;
    const nextLine = (m[2] ?? "").trim();
    if (nextLine && !nextLine.startsWith("-->")) return nextLine;
  }

  // 2) 「タイトル: ◯◯」のような行(手順説明の文には「タイトル+コロン」の並びが無いため安全)
  const plain = wordpressText.match(/^\s*[・■]?\s*タイトル\s*[::]\s*(.{5,})$/m);
  if (plain) return plain[1].trim();

  // 3) チェック用原稿のタイトル(h1)+企業名で組み立てる
  const h1 = draftText.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
  if (!h1) return "";
  const company = extractCompany(draftText);
  if (company && !h1.includes(company)) return `${h1}|${company}様`;
  return h1;
}

// 導入サービスの選択肢のうち、事例作成の対象外として画面に出さないもの。
// WordPress側のタクソノミーから該当タームが削除されれば、この対応は不要になる。
const HIDDEN_IMPLEMENTATION_NAMES = ["楽ジョブAI"];

export function visibleImplementationTerms(terms: WpTerm[]): WpTerm[] {
  return terms.filter((t) => !HIDDEN_IMPLEMENTATION_NAMES.includes(t.name.trim()));
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
