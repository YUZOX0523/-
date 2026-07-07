---
name: press-release
description: PR TIMES向けプレスリリース原稿を制作する。「プレスリリースを書きたい」「リリース作成」「PR TIMESに入稿したい」「導入事例/新サービス/イベント/調査結果を発表したい」と言われたら使用。取材インタビュー→原稿生成→SEO採点ループ→入稿パッケージ出力まで行う。
---

# /press-release — PR TIMES 原稿制作スキル

高品質なプレスリリース原稿を作り、PR TIMES管理画面にそのまま貼れる入稿パッケージを出力する。
**PR TIMESへの配信自体は必ず人間が行う**(投稿APIは存在しない。自動投稿を試みないこと)。

## 前提ファイル(すべて必ず読むこと)

- `press/knowledge/style-guide.md` — 執筆ルール(採点基準と同期)
- `press/knowledge/company.md` — 会社ボイラープレート
- `press/knowledge/templates/` — 種類別テンプレート5種
- `press/fixtures/release-good.md` — 100点満点のお手本

## フロー

### 1. 初回セットアップ検出

`press/knowledge/company.md` に `TODO` マーカーが残っていたら、原稿制作の前にインタビューして埋める:
本社所在地 / 代表者名 / 設立 / 事業内容 / 広報連絡先(メール・電話) / 会社紹介の定型文 / 実績数字(導入社数・受講者数など) / PR TIMESの常用カテゴリ・キーワードタグ。
回答を `company.md` に書き込み、TODOコメントを消す。**このスキルが編集してよいのは company.md と press/releases/ 配下のみ。**

### 2. リリース種類の選択

ユーザーにテーマを聞き、テンプレートを選ぶ(迷ったら AskUserQuestion で選択肢提示):

| 種類 | テンプレート | 向いているネタ |
|---|---|---|
| 新サービス/新機能 | `templates/new-service.md` | 提供開始・大型アップデート |
| 導入事例 | `templates/case-study.md` | 顧客の成果(⚠️掲載許可必須) |
| イベント/セミナー | `templates/event.md` | 開催2〜4週間前に |
| 調査リリース | `templates/survey.md` | 自社調査(転載率最強・月1推奨) |
| 提携/協業 | `templates/partnership.md` | 業務提携(⚠️先方承認必須) |

`press/reports/` に直近のウォッチレポートがあれば、そこのリリース案も候補として提示する。

### 3. 取材インタビュー

テンプレートのコメント欄を質問リストとして使い、**数字・固有名詞・引用コメントを必ず引き出す**:
- 5W2H(いつから・誰向け・何を・なぜ今・どうやって・いくらで)
- タイトルに使える数字(導入社数・◯倍・◯%・日数・価格)
- 代表者 or 顧客のコメント(なければその場で草案を作り確認)
- 導入事例・提携は掲載許可の取得状況を必ず確認

### 4. ドラフト生成

テンプレート+style-guide+company.md をもとに原稿を書き、
`press/releases/YYYY-MM-DD-<slug>.md` に保存する(release_dateは配信予定日)。
frontmatter(title/subtitle/type/keywords/release_date/status)とH2構造はテンプレートの契約を厳守。

### 5. SEO採点ループ

```bash
cd press && node scripts/seo-check.mjs releases/<ファイル名>.md --json
```

- `passed: false` なら `fixes` の指示を原稿に反映して再実行(**最大3周**)
- 3周しても80点未満なら、残った fixes をユーザーに提示して判断を仰ぐ
- `visualChecks`(目視確認項目)は最終出力に必ず含める

### 6. 入稿パッケージ出力

合格したら、PR TIMES管理画面の入力順にコピペ用ブロックを提示する:

1. **タイトル**(100字以内・改行なし)
2. **サブタイトル**(100字以内)
3. **本文**(リード文+本文。マークダウン記法は外し、見出しはPR TIMESの見出し機能で設定する旨を注記)
4. **画像リスト**(`[画像n: 説明]` を抜き出し、準備すべき画像の一覧に)
5. **カテゴリ・キーワードタグ**(company.mdの固定設定+今回のkeywords)
6. **配信予約日時の推奨**(style-guide準拠: 火〜木の10〜11時台から具体的な日時を提案)

最後に入稿チェックリストを表示:
- [ ] 画像ファイルの準備(メイン1200×630px)
- [ ] 「※根拠注記」が必要な表現の最終確認
- [ ] (該当時)相手企業の掲載承認
- [ ] PR TIMESで予約配信を設定
- [ ] 目視確認項目(visualChecks)のチェック

配信完了後、原稿の frontmatter を `status: published` に更新するようユーザーに案内する。
