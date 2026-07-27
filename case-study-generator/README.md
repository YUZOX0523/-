# 導入事例 原稿ジェネレーター(社内ツール)

法人リスキリングの最終報告MTG資料(PDF)をアップロードするだけで、導入事例の原稿2形式を自動生成するWebアプリ。

- **チェック用原稿(`draft.md`)** — 導入企業に掲載可否を確認してもらうMarkdown原稿
- **WordPress入稿用(`wordpress.html`)** — WordPressのコードエディターに全文コピペで記事になるGutenbergマークアップ

どちらにも企業ロゴ・宣材写真の**挿入位置マーカー**が入る。個人名・動画視聴状況は自動的に除外。
生成ルールは `.claude/skills/case-study/SKILL.md` と同期している。

利用者はデジライズ社員のみ(共有パスワードで保護。検索エンジンには noindex)。

## デプロイ手順(Vercel・初回のみ)

1. https://vercel.com/new でこのリポジトリをImport
2. 設定:
   - **Project Name**: `case-study-generator` など
   - **Framework Preset**: Next.js(自動検出される)
   - **Root Directory**: `case-study-generator` ← Editを押して選択
3. **Environment Variables** に以下を追加:
   | 変数名 | 値 |
   |---|---|
   | `ANTHROPIC_API_KEY` | Anthropicコンソール( https://platform.claude.com/ )で発行したAPIキー |
   | `APP_PASSWORD` | 社員に共有する任意のパスワード |
   | `WP_CASE_API_KEY` | WordPress側担当者から共有された「導入事例 自動下書き作成API」のキー(「WordPressへ下書き保存」機能に必要) |
4. **Deploy** を押す
5. (推奨)大きいPDF対応: プロジェクトの **Storage** タブ → **Create Database / Blob** → Blobストアを作成
   - `BLOB_READ_WRITE_TOKEN` が自動で設定される
   - これが無い場合、約3.5MBを超えるPDFはアップロードできない(それ以下はそのまま動く)

## 使い方(社員向け)

1. デプロイURLを開く → 社内パスワードを入力
2. 最終報告MTG資料のPDFをドラッグ&ドロップ
3. 「原稿を生成する」→ 3〜5分待つ(2形式が同時に生成される)
4. 生成結果を確認(**数値がPDFと一致しているか・個人名が入っていないか必ず確認**)
5. 「PDFで書き出す」で確認用PDFを作り、導入企業に送って掲載承諾+ロゴ・宣材写真をもらう
6. 承諾後、「📤 WordPressへ下書き保存」パネルで業種・従業員数・所在地・導入サービス・企業URLを入力して保存
   → digirise.ai に下書き記事が自動作成される
7. WordPress側で写真をアップロードし、記事内の【画像挿入位置①/②】を画像ブロックに差し替え、
   アイキャッチを設定して最終確認 → 公開

## WordPress自動下書き連携

「WordPressへ下書き保存」を押すと、生成済みのGutenberg本文と入力項目が
digirise.ai の「導入事例 自動下書き作成API」(`/wp-json/digirise/v1/case-generator/*`)に送信され、
**下書き**として登録される(このアプリから公開はできない)。API仕様は `docs/wordpress-api-spec.md` を参照。

- APIキーはサーバー側環境変数 `WP_CASE_API_KEY` のみに保持し、ブラウザには渡さない
  (フロントは `/api/wordpress/options` と `/api/wordpress/draft` を経由。どちらも社内パスワード必須)
- 従業員数・所在地・導入サービスのタームIDは、保存画面を開くたびに `options` APIから最新を取得
  (IDのハードコード禁止という仕様に対応)
- 業種(industry)は文字列送信で、未登録なら自動作成される仕様のため、表記ゆれによる重複タームを
  防ぐ正規化マッチ(全角半角・空白・波ダッシュ吸収)と既存名サジェストを実装している
- 「導入前の課題」「導入後の効果」のACF欄は事例ページから廃止決定のため送信しない。
  写真(アイキャッチ・本文内画像)もWordPress側で手動対応のため `featured_image_url` は送信しない

## 技術メモ

- Next.js (App Router) + `@anthropic-ai/sdk`。モデルは `claude-opus-4-8`(PDFを直接読解)
- 生成は `/api/generate` でストリーミング返却(`maxDuration: 300`)
- 3.5MB超のPDFはVercelの関数ボディ制限(4.5MB)を超えるため、`@vercel/blob` のクライアントアップロード経由でURL渡し
- パスワードは `x-app-password` ヘッダーで照合する簡易認証。社外秘資料を扱うため、URLは社外に共有しないこと

## ローカル開発

```bash
cd case-study-generator
cp .env.example .env.local  # 値を記入
npm install
npm run dev
```
