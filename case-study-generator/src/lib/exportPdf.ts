import { marked } from "marked";

// YAML frontmatter(company: ... のような管理用メタ情報)は
// お客様に見せる内容ではないので、PDF化する前に取り除く。
function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

// チェック用原稿(Markdown)を、非エンジニアの方でも開けるPDFにする。
// ブラウザの印刷機能(印刷 → PDFとして保存)を使う方式。
// サーバー側でPDFライブラリを動かすより軽量で、レイアウト崩れの心配もない。
export function exportMarkdownAsPdf(markdown: string, title: string) {
  const bodyHtml = marked.parse(stripFrontmatter(markdown), {
    async: false,
  }) as string;

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
<title>${title}</title>
<style>
  /* A4(210mm)から左右マージンを引いた印刷可能幅(174mm)に必ず収まるよう、
     幅はすべて mm 単位・パーセント指定にする(pxの固定max-widthは
     印刷可能幅を超えるとその分が欠けて消えるため使わない)。 */
  @page { size: A4; margin: 18mm 18mm; }
  * { box-sizing: border-box; }
  html, body { width: 100%; }
  body {
    font-family: "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif;
    color: #1e2740;
    line-height: 1.85;
    font-size: 12.5px;
    margin: 0 auto;
    padding: 20px;
    overflow-wrap: break-word;
    word-break: break-word;
  }
  h1 { font-size: 19px; margin: 0 0 18px; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; line-height: 1.5; }
  h2 { font-size: 15px; margin: 26px 0 10px; border-left: 5px solid #3b82f6; padding-left: 10px; }
  h3 { font-size: 13.5px; margin: 18px 0 8px; color: #3b63d8; }
  p { margin: 0 0 10px; }
  table { width: 100%; table-layout: fixed; border-collapse: collapse; margin: 10px 0 16px; font-size: 11.5px; }
  th, td { border: 1px solid #d8e0f0; padding: 7px 9px; text-align: left; overflow-wrap: break-word; word-break: break-word; }
  th { background: #eef2fa; font-weight: 700; }
  blockquote {
    margin: 10px 0; padding: 10px 16px; background: #f4f6fb;
    border-left: 4px solid #7c6ff0; color: #444; font-size: 12px;
  }
  ul, ol { margin: 0 0 12px; padding-left: 22px; }
  li { margin-bottom: 4px; }
  hr { border: none; border-top: 1px solid #d8e0f0; margin: 22px 0; }
  strong { color: #1e2740; }
  h1, h2, h3, tr, blockquote, li { page-break-inside: avoid; }
  @media print {
    body { padding: 0; }
  }
</style>
</head>
<body>
${bodyHtml}
<script>
  window.onload = () => { window.print(); };
</script>
</body>
</html>`);
  win.document.close();
}
