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
4. **Deploy** を押す
5. (推奨)大きいPDF対応: プロジェクトの **Storage** タブ → **Create Database / Blob** → Blobストアを作成
   - `BLOB_READ_WRITE_TOKEN` が自動で設定される
   - これが無い場合、約3.5MBを超えるPDFはアップロードできない(それ以下はそのまま動く)

## 使い方(社員向け)

1. デプロイURLを開く → 社内パスワードを入力
2. 最終報告MTG資料のPDFをドラッグ&ドロップ
3. 「原稿を生成する」→ 3〜5分待つ(2形式が同時に生成される)
4. 生成結果を確認(**数値がPDFと一致しているか・個人名が入っていないか必ず確認**)
5. `draft.md` を導入企業に送って掲載承諾+ロゴ・宣材写真をもらう
6. 承諾後、`wordpress.html` をWordPressに貼り付け(手順はファイル冒頭のコメント参照)、画像を差し替えて公開

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
