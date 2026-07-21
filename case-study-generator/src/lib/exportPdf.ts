import { marked } from "marked";

// チェック用原稿(Markdown)を、非エンジニアの方でも開けるPDFにする。
// ブラウザの印刷機能(印刷 → PDFとして保存)を使う方式。
// サーバー側でPDFライブラリを動かすより軽量で、レイアウト崩れの心配もない。
export function exportMarkdownAsPdf(markdown: string, title: string) {
  const bodyHtml = marked.parse(markdown, { async: false }) as string;

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
  @page { size: A4; margin: 22mm 18mm; }
  body {
    font-family: "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif;
    color: #1e2740;
    line-height: 1.8;
    font-size: 13px;
    max-width: 720px;
    margin: 0 auto;
    padding: 24px;
  }
  h1 { font-size: 21px; margin: 0 0 18px; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
  h2 { font-size: 16px; margin: 28px 0 10px; border-left: 5px solid #3b82f6; padding-left: 10px; }
  h3 { font-size: 14px; margin: 18px 0 8px; color: #3b63d8; }
  p { margin: 0 0 10px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; font-size: 12px; }
  th, td { border: 1px solid #d8e0f0; padding: 7px 10px; text-align: left; }
  th { background: #eef2fa; font-weight: 700; }
  blockquote {
    margin: 10px 0; padding: 10px 16px; background: #f4f6fb;
    border-left: 4px solid #7c6ff0; color: #444; font-size: 12.5px;
  }
  ul, ol { margin: 0 0 12px; padding-left: 22px; }
  li { margin-bottom: 4px; }
  hr { border: none; border-top: 1px solid #d8e0f0; margin: 22px 0; }
  strong { color: #1e2740; }
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
