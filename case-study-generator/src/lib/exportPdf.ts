import { marked } from "marked";

type FrontMatter = {
  company?: string;
  program?: string;
  period?: string;
  participants?: string;
};

// YAML frontmatter(company: ... のような管理用メタ情報)は
// お客様に見せる内容ではないので抜き出して、本文からは取り除く。
function parseFrontmatter(markdown: string): { data: FrontMatter; body: string } {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, body: markdown };

  const data: FrontMatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m && (m[1] === "company" || m[1] === "program" || m[1] === "period" || m[1] === "participants")) {
      data[m[1] as keyof FrontMatter] = m[2].trim();
    }
  }
  return { data, body: match[2] };
}

// 画像挿入位置の指示文から、プレースホルダーに出すラベルだけ抜き出す。
// 「【画像挿入位置①:企業ロゴ】ここに導入企業のロゴを挿入(背景透過…」→「企業ロゴ」
function extractPlaceholderLabel(text: string): { kind: "logo" | "photo"; label: string } {
  const isLogo = /ロゴ/.test(text);
  const bracket = text.match(/【[^】]*[:：]\s*([^】]+)】/);
  const label = bracket ? bracket[1].trim() : isLogo ? "企業ロゴ" : "宣材写真";
  return { kind: isLogo ? "logo" : "photo", label };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function exportMarkdownAsPdf(markdown: string, titleFallback: string) {
  const { data, body } = parseFrontmatter(markdown);
  const bodyHtml = marked.parse(body, { async: false }) as string;

  const doc = new DOMParser().parseFromString(
    `<div id="root">${bodyHtml}</div>`,
    "text/html"
  );
  const root = doc.getElementById("root")!;

  // 引用ブロック(画像挿入位置の指示 / 受講者の声)を見た目で仕分けして装飾する
  root.querySelectorAll("blockquote").forEach((bq) => {
    const text = (bq.textContent ?? "").trim();
    if (/画像挿入位置|【.*ロゴ|【.*写真/.test(text)) {
      const { kind, label } = extractPlaceholderLabel(text);
      const box = doc.createElement("div");
      box.className = `img-placeholder ${kind}`;
      box.innerHTML = `
        <div class="img-icon">${kind === "logo" ? "🏢" : "🖼️"}</div>
        <div class="img-placeholder-label">${escapeHtml(label)}が入ります</div>
        <div class="img-placeholder-note">掲載許諾時にお客様よりご支給いただいた画像に差し替わります</div>
      `;
      bq.replaceWith(box);
      return;
    }
    // 受講者の声: 末尾の出典表記(例: (受講者アンケートより))を切り出してキャプションにする
    const attrMatch = text.match(/^(.*?)\s*[\((]([^()]*(?:アンケート|より)[^()]*)[\))]\s*$/);
    const quoteText = attrMatch ? attrMatch[1].trim() : text;
    const attribution = attrMatch ? attrMatch[2].trim() : "";
    const card = doc.createElement("div");
    card.className = "quote-card";
    card.innerHTML = `
      <div class="quote-mark">"</div>
      <p class="quote-text">${escapeHtml(quoteText)}</p>
      ${attribution ? `<div class="quote-attr">${escapeHtml(attribution)}</div>` : ""}
    `;
    bq.replaceWith(card);
  });

  // 先頭の h1(タイトル)と、その直後の p(リード文)をヒーローセクション用に取り出す
  let heroTitle = "";
  let heroLead = "";
  const h1 = root.querySelector("h1");
  if (h1) {
    heroTitle = h1.innerHTML;
    const next = h1.nextElementSibling;
    if (next && next.tagName === "P") {
      heroLead = next.innerHTML;
      next.remove();
    }
    h1.remove();
  }

  const restHtml = root.innerHTML;

  const chips = [
    data.company ? `🏢 ${escapeHtml(data.company)} 様` : "",
    data.participants ? `👥 ${escapeHtml(data.participants)}` : "",
    data.period ? `🗓 ${escapeHtml(data.period)}` : "",
  ]
    .filter(Boolean)
    .map((c) => `<span class="chip">${c}</span>`)
    .join("");

  const heroHtml = heroTitle
    ? `
    <div class="hero">
      <div class="hero-tag">導入事例プレビュー(お客様確認用)</div>
      <h1>${heroTitle}</h1>
      ${heroLead ? `<p class="lead">${heroLead}</p>` : ""}
      ${chips ? `<div class="chips">${chips}</div>` : ""}
    </div>`
    : "";

  const title = data.company ? `導入事例プレビュー_${data.company}` : titleFallback;

  const win = window.open("", "_blank");
  if (!win) {
    alert(
      "ポップアップがブロックされました。ブラウザの設定でこのサイトのポップアップを許可してください。"
    );
    return;
  }

  win.document.write(`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<style>
  /* A4(210mm)から左右マージンを引いた印刷可能幅(174mm)に必ず収まるよう、
     幅はすべて mm 単位・パーセント指定にする(pxの固定max-widthは
     印刷可能幅を超えるとその分が欠けて消えるため使わない)。 */
  @page { size: A4; margin: 16mm 16mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { width: 100%; }
  body {
    font-family: "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif;
    color: #1e2740;
    line-height: 1.85;
    font-size: 12.5px;
    margin: 0 auto;
    padding: 0;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  .content { padding: 0 4mm; }

  /* ヒーロー部分は「背景色」に色を頼らない設計にしている。
     多くのブラウザは印刷/PDF保存時に既定で背景色・背景画像を出力しない
     (「背景のグラフィック」設定がオフ)ため、背景塗りだけで色を表現すると
     設定次第で真っ白になってしまう。文字色・枠線は常に印刷されるため、
     そちらだけで確実に色が出るようにする。 */
  .hero {
    border: 1.5px solid #cdd8f2;
    border-top: 5px solid #4c6fe0;
    border-radius: 4px 4px 14px 14px;
    padding: 20px 24px;
    margin-bottom: 22px;
  }
  .hero-tag {
    display: inline-block;
    font-size: 10.5px; font-weight: 700; letter-spacing: .06em;
    border: 1px solid #7c6ff0; color: #5b54e8; border-radius: 999px;
    padding: 3px 12px; margin-bottom: 12px;
  }
  .hero h1 { color: #23306b; font-size: 19px; line-height: 1.55; margin: 0 0 10px; border: none; padding: 0; }
  .hero .lead { color: #4a5578; font-size: 12px; margin: 0 0 14px; }
  .hero .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .hero .chip {
    border: 1px solid #a9bdf5; color: #3b63d8;
    border-radius: 999px; padding: 4px 12px; font-size: 11px; font-weight: 600;
  }

  h1 { font-size: 18px; margin: 0 0 16px; border-bottom: 3px solid #3b82f6; padding-bottom: 9px; }
  h2 { font-size: 14.5px; margin: 26px 0 10px; border-left: 5px solid #3b82f6; padding-left: 10px; color: #1e2740; }
  h3 { font-size: 13px; margin: 18px 0 8px; color: #3b63d8; }
  p { margin: 0 0 10px; }

  table {
    width: 100%; table-layout: fixed; border-collapse: collapse;
    margin: 10px 0 16px; font-size: 11.5px;
  }
  /* table-layout:fixed は列幅を均等割りするため、セル内の長文が
     はみ出さず必ず折り返す(word-break併用)。印刷可能幅からの
     はみ出し=欠落を防ぐための必須設定。 */
  th, td { border: 1px solid #d3ddf2; padding: 8px 10px; text-align: left; overflow-wrap: break-word; word-break: break-word; }
  th { font-weight: 700; color: #2f3b5c; border-bottom: 2px solid #3b82f6; }

  .img-placeholder {
    margin: 12px 0; padding: 22px 16px; text-align: center;
    border: 1.5px dashed #a9bdf5; border-radius: 12px;
  }
  .img-placeholder.logo { padding: 16px; }
  .img-icon { font-size: 22px; margin-bottom: 6px; }
  .img-placeholder-label { font-weight: 700; color: #3b63d8; font-size: 12.5px; margin-bottom: 3px; }
  .img-placeholder-note { font-size: 10.5px; color: #6d7893; }

  .quote-card {
    margin: 10px 0; padding: 14px 18px 12px;
    border: 1px solid #e4e9f4; border-left: 4px solid #7c6ff0; border-radius: 0 10px 10px 0;
  }
  .quote-mark { font-family: Georgia, serif; font-size: 26px; color: #7c6ff0; line-height: 1; margin-bottom: 2px; }
  .quote-text { margin: 0; font-size: 12px; color: #333; }
  .quote-attr { margin-top: 8px; font-size: 10.5px; color: #6d7893; }

  ul, ol { margin: 0 0 12px; padding-left: 22px; }
  li { margin-bottom: 4px; }
  hr { border: none; border-top: 1px solid #d8e0f0; margin: 22px 0; }
  strong { color: #1e2740; }
  h1, h2, h3, tr, .quote-card, .img-placeholder, li { page-break-inside: avoid; }

  .pdf-footer {
    margin-top: 26px; padding-top: 12px; border-top: 1px solid #e4e9f4;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 10px; color: #a4adc2;
  }
</style>
</head>
<body>
<div class="content">
${heroHtml}
${restHtml}
<div class="pdf-footer">
  <span>DigiRise「法人リスキリング」導入事例(確認用プレビュー)</span>
  <span>実際の掲載ページはWebサイトのデザインで表示されます</span>
</div>
</div>
<script>
  window.onload = () => { window.print(); };
</script>
</body>
</html>`);
  win.document.close();
}
