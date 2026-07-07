# press/ — PR TIMES プレスリリース制作システム

デジライズの広報用ツールキットです。Claude Code のスキル2本と補助スクリプトで、
**ネタ発掘 → 原稿制作 → SEO採点 → PR TIMES入稿パッケージ出力** までを半自動化します。

> ⚠️ PR TIMES には投稿APIがないため、**最後の配信操作(管理画面への貼り付けと予約設定)だけは手動**です。
> このツールは「貼るだけ」の状態まで仕上げます。

## 必要なもの

- Node.js 22以上(それだけ。`npm install` は**不要**、依存パッケージゼロ)
- Claude Code(スキルを使う場合)

## 使い方(2つのスキル)

| スキル | やること | 使う頻度 |
|---|---|---|
| `/pr-watch` | 競合・業界ニュースを収集 → トレンド分析 → **リリース案3〜5件を提案** | 週1回 |
| `/press-release` | 取材インタビュー → 原稿生成 → SEO採点(80点以上まで自動改善) → 入稿パッケージ出力 | リリースごと |

Claude Code でリポジトリを開き、`/pr-watch` または `/press-release` と入力するだけです。

## 初回セットアップ(3ステップ)

1. **会社情報の登録**: `/press-release` を一度実行すると、Claude が会社情報(住所・代表・広報連絡先・実績数字)を
   インタビューして `press/knowledge/company.md` に登録します
2. **ウォッチ対象の登録**: `press/config/watchlist.json` の `companies` に競合企業を追加します。
   `company_id` は PR TIMES の企業ページURL `prtimes.jp/main/html/searchrlp/company_id/XXXXX` の数字部分です。
   Google News のキーワードも自由に追加・変更できます
3. **フィード疎通確認**: **自分のPC(ローカル)で** `/pr-watch` を一度実行し、フィードが取得できるか確認します。
   ※クラウド実行環境では外部サイトへの接続が遮断されている場合があります。その場合の動作確認は
   `cd press && node scripts/watch.mjs --sample` (サンプルデータで全機能を通す)を使ってください

## 日常の運用フロー

```
週1回        /pr-watch を実行 → press/reports/ にレポート+リリース案
ネタ決定     案を選んで /press-release を実行(取材インタビューに答える)
原稿完成     80点以上に自動改善された原稿が press/releases/ に保存される
入稿         出力された入稿パッケージをPR TIMES管理画面にコピペ
             → 火〜木の午前10〜11時台で予約配信(推奨日時も出力されます)
配信後       原稿の frontmatter を status: published に変更
```

配信頻度の目安や書き方のルールは `press/knowledge/style-guide.md` を参照してください。

## スクリプトを直接使う場合

```bash
cd press
node scripts/watch.mjs              # ウォッチ収集(新着を press/data/inbox/ に保存)
node scripts/watch.mjs --sample     # サンプルデータで動作確認(オフライン可)
node scripts/seo-check.mjs releases/2026-07-14-example.md   # 原稿の採点
node scripts/seo-check.mjs fixtures/release-good.md          # 100点のお手本を採点してみる
npm test                            # テスト実行
```

## ファイル構成

```
press/
├── config/watchlist.json     ウォッチ対象(競合company_id・キーワード)← 自由に編集
├── knowledge/
│   ├── company.md            会社ボイラープレート(初回に自動登録)
│   ├── style-guide.md        執筆ルール・転載最大化ノウハウ
│   └── templates/            リリース種類別テンプレート5種
├── scripts/
│   ├── watch.mjs             収集CLI
│   ├── seo-check.mjs         採点CLI(100点満点)
│   └── lib/rss.mjs           RSSパーサ
├── fixtures/                 お手本原稿・テスト用データ
├── releases/                 生成した原稿(コミットして履歴管理)
├── reports/                  ウォッチレポート
└── data/                     収集データ(gitignore対象・自動生成)
```

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| `❌ 取得失敗（HTTP 403）` | 実行環境からのアクセスがブロックされています。ローカルPCで実行してください |
| `❌ 取得失敗（fetch failed / timeout）` | ネットワーク接続を確認。会社プロキシ配下なら `HTTPS_PROXY` 設定が必要な場合あり |
| すべてのフィードが失敗する | `node scripts/watch.mjs --sample` でスクリプト自体の動作を確認してから切り分け |
| 採点が厳しすぎる/緩すぎる | `--threshold 数字` で合格ラインを調整(既定80) |
| PR TIMESのフィード形式が変わった | `scripts/lib/rss.mjs` のパーサ修正が必要。Claude Codeに相談を |

## 規約・法令上の注意

- 収集するのは**見出し・リンク・日付のみ**。他社リリース本文の複製・再掲載はしません(PR TIMES利用規約対応)
- `watch.mjs` は手動実行のみ。高頻度の自動ポーリングは設定しないでください
- 「業界初」「No.1」等は根拠注記なしでは使わない(景表法)。採点スクリプトが自動チェックします
- 将来 GitHub Actions などで定期ウォッチを自動化する場合は、実行間隔を1日1回程度にとどめ、
  Anthropic APIキーを使った要約はその時点で追加できます(現状は不要)
