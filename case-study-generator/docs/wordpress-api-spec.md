# Case Generator API 仕様書（Claude Code 向け整理版）

> 元ドキュメント: [Case Generator API 仕様書（Google Docs）](https://docs.google.com/document/d/1cWI-NB_PspoLxMp3MMUqrwHP78Jo--Fl_lF-diE1scs/edit)
> このファイルは、WordPress（digirise.ai）側で提供する「導入事例 自動下書き作成API」を、外部Webアプリ（Generator）から呼び出して実装する開発者・Claude Code向けに再構成したものです。内容は元仕様書と同一ですが、構造化・コード例の明示・実データの補足を行っています。

## 1. このAPIの目的

Generator（別アプリ）がAIで生成した導入事例コンテンツを、WordPress側に**下書き（Draft）投稿**として自動登録するためのREST APIです。公開はWordPress管理画面側で人が行う前提で、Generator側からは公開できません。

主な機能:

- 導入事例の下書き作成
- ACFカスタムフィールドの保存
- タクソノミー（導入サービス／従業員数／所在／業種）の設定
- 業種（industry）タクソノミーの自動新規作成
- アイキャッチ画像の任意登録（URL指定でWordPressが自動ダウンロード・登録）
- 保存途中でエラーが起きた場合の自動ロールバック（中途半端な下書きを残さない）

## 2. Base URL

```
https://digirise.ai/wp-json/digirise/v1
```

## 3. 認証

全エンドポイント共通で以下のヘッダーが必須です。

```
X-Case-Api-Key: <APIキー>
Content-Type: application/json
```

APIキーが一致しない場合は `401` または `403` が返却されます（後述のエラー一覧を参照）。

> **Claude Codeへの注意**: APIキーは `wp-config.php` 側で定義された秘密情報です。フロントエンドのJS（ブラウザ側）に直書きせず、Generatorのサーバーサイド（バックエンド）経由で呼び出す設計にしてください。

## 4. エンドポイント一覧

| Method | Endpoint | 内容 |
|---|---|---|
| GET | `/case-generator/options` | タクソノミーの選択肢一覧を取得 |
| POST | `/case-generator/auth-check` | APIキーの有効性を確認 |
| POST | `/case-generator/drafts` | 導入事例の下書きを作成 |

---

## 5. ① 選択肢取得API

### Request

```
GET /case-generator/options
X-Case-Api-Key: <APIキー>
```

パラメータなし。

### Response（200）

```json
{
  "success": true,
  "data": {
    "implementation": [
      { "id": 9, "name": "AIエージェント導入" }
    ],
    "employees": [
      { "id": 14, "name": "100〜300名" }
    ],
    "location": [
      { "id": 11, "name": "東京都" }
    ],
    "industry": [
      { "id": 56, "name": "製造業" }
    ]
  }
}
```

各配列にはそのタクソノミーに現在登録されている全タームが `{id, name}` 形式で返る想定です（元仕様書には各1件のサンプルのみ記載）。`implementation` / `employees` / `location` の3タクソノミーは、後述の下書き作成API送信時に**このIDをそのまま使用**します。

> **Claude Codeへの注意**: 下書き作成前に必ずこのAPIを呼び、最新のID一覧を取得してから使うこと。IDはハードコードしない（管理画面でタームが追加・削除されるとIDがずれる／存在しなくなるため）。

---

## 6. ② APIキー確認API

### Request

```
POST /case-generator/auth-check
X-Case-Api-Key: <APIキー>
```

> **未確定事項**: 元仕様書にはこのエンドポイントのMethod/Pathのみ記載があり、リクエストボディ・レスポンスの具体例が記載されていません。実装前にWordPress側の開発者（清水さん）に以下を確認してください。
> - リクエストボディは必要か（空でよいか）
> - 成功時のレスポンス形式（例: `{"success": true}` のみか、追加情報があるか）
> - 失敗時のレスポンス（`/drafts` と同じ `case_api_key_invalid` 形式か）

---

## 7. ③ 下書き作成API

### Request

```
POST /case-generator/drafts
X-Case-Api-Key: <APIキー>
Content-Type: application/json
```

### Request Body 例

```json
{
  "title": "株式会社〇〇様 導入事例",
  "content": "<!-- wp:paragraph -->...",
  "company_name": "株式会社〇〇",
  "issues_before_": "<p>導入前の課題</p>",
  "effects_after_": "<p>導入後の成果</p>",
  "corp_url": "https://example.com/",
  "implementation": [9],
  "employees": [14],
  "location": [11],
  "industry": "製造業",
  "featured_image_url": "https://example.com/image.jpg"
}
```

### パラメータ一覧

| 項目 | 型 | 必須 | 備考 |
|---|---|---|---|
| `title` | string | ○ | 投稿タイトル |
| `content` | string | ○ | Gutenberg形式のHTML（ブロックコメント付き）をそのまま送信 |
| `company_name` | string | × | ACFフィールド |
| `issues_before_` | string | × | ACFフィールド。HTML可 |
| `effects_after_` | string | × | ACFフィールド。HTML可 |
| `corp_url` | string | × | 企業URL |
| `implementation` | number[] | ○ | **タームIDの配列**。`options` APIで取得したIDを指定 |
| `employees` | number[] | ○ | **タームIDの配列** |
| `location` | number[] | ○ | **タームIDの配列** |
| `industry` | string | ○ | **文字列指定**（他3つと異なりIDではなく名前）。詳細は次項 |
| `featured_image_url` | string | × | HTTP/HTTPSの画像URL |

> ⚠️ **重要**: `implementation` / `employees` / `location` の3つは **タームID（数値配列）**、`industry` だけ **タームの名前（文字列）** という非対称な仕様です。実装時に型を混同しやすいので注意してください。

### 7.1 タクソノミー仕様

**implementation / employees / location**（ID指定）

```json
"implementation": [9]
```

存在しないIDを指定するとエラー（後述）。

**industry**（文字列指定・自動作成あり）

```json
"industry": "製造業"
```

WordPress側の処理:

1. 送信された文字列と同名のタームが既に存在する → 既存タームを使用
2. 存在しない → **新規タームを自動作成**してから投稿に設定

> ⚠️ **実運用上の注意**: `industry` は文字列の完全一致で既存/新規を判定するため、表記ゆれ（全角/半角、句読点の有無、末尾の空白など）があると**似た名前のタームが重複作成**されます。実際に本番環境（`industry` タクソノミー）には以下のような類似・重複気味のタームが既に存在しています。
> - `ICT（情報通信技術）サービス業` と `ICT（情報通信技術）業`
> - `卸売業` と `卸売業・小売業` と `卸売・小売・EC`
> - `スペースソリューション` と `スペースソリューション業`
>
> Generator側でAIが業種名を生成する場合、**送信前に `options` APIの既存一覧と類似度チェック（正規化・トリム・表記ゆれ吸収）を行う**ことを強く推奨します。そうしないとタクソノミーが際限なく増殖します。

### 7.2 アイキャッチ画像

送信しない場合（画像登録はスキップされる）:

```json
{}
```

または

```json
{ "featured_image_url": "" }
```

画像を指定する場合:

```json
{ "featured_image_url": "https://example.com/image.jpg" }
```

指定した場合、WordPress側で以下を自動実行:

1. 画像をダウンロード
2. メディアライブラリに登録
3. 投稿のアイキャッチとして設定

### 7.3 成功レスポンス（200）

```json
{
  "success": true,
  "message": "導入事例の下書きを作成しました。",
  "data": {
    "post_id": 2413,
    "status": "draft",
    "edit_url": "...",
    "preview_url": "...",
    "permalink": "...",
    "created_at": "...",
    "created_at_gmt": "...",
    "featured_image": {
      "attachment_id": 2414,
      "url": "..."
    },
    "taxonomies": {
      "implementation": [9],
      "employees": [14],
      "location": [11],
      "industry": 56
    }
  }
}
```

レスポンスの `taxonomies.industry` は文字列で送信したにもかかわらず、**返却時はタームID（数値）**になっている点に注意（作成/取得されたタームのIDが返る）。

### 7.4 エラー例

| ケース | HTTPステータス | レスポンス |
|---|---|---|
| タームIDが存在しない（`implementation`/`employees`/`location`） | 400 | `{"code": "invalid_term_id", "message": "..."}` |
| `featured_image_url` が画像ファイルではない | 400 | `{"code": "featured_image_invalid_file"}` |
| APIキー不正 | 403 | `{"code": "case_api_key_invalid"}` |

### 7.5 ロールバック仕様

以下のいずれかが発生した場合、**投稿は作成されません**。

- ACF保存失敗
- タクソノミー設定失敗
- アイキャッチ登録失敗
- その他、作成処理の途中で発生したエラー

処理途中で投稿レコードが一時的に作られていても、エラー発生時は `wp_delete_post()` で削除されます。**エラー時に中途半端な下書きがWordPress側に残ることはありません。**

---

## 8. Generator実装時の注意事項（まとめ）

- `title` ・ `content` は必須
- `content` はGutenbergブロック形式のHTMLをそのまま送信する（変換不要）
- `implementation` / `employees` / `location` は **タームID指定**（`options` APIで事前取得）
- `industry` のみ **文字列指定**（存在しなければ自動作成される点に注意。表記ゆれ対策推奨）
- `featured_image_url` は任意
- 作成される投稿のステータスは常に `draft`
- 公開処理はWordPress管理画面側で人が行う（Generator側に公開機能は不要）

## 9. 実装フロー

```
Generator
  ↓
GET /case-generator/options          … 選択肢（ID一覧）取得
  ↓
AI生成                                … 事例本文・タイトル等を生成
  ↓
JSON組み立て
  ↓
POST /case-generator/drafts          … 下書き作成をリクエスト
  ↓
WordPress側処理
  ├─ Draft投稿作成
  ├─ ACF保存
  ├─ タクソノミー設定（implementation/employees/location はID、industryは名前）
  ├─ industry未存在時は自動作成
  └─ （featured_image_url指定時）画像ダウンロード→メディア登録→アイキャッチ設定
  ↓
成功レスポンス返却（失敗時はロールバックしてエラー返却）
```

---

## 10. 参考: 現在登録されている実際のタクソノミー選択肢（2026-07-25時点スナップショット）

`GET /case-generator/options` が返す内容の実データ版です。WordPress管理画面（`/wp-admin/edit-tags.php?taxonomy=xxx&post_type=case`）から直接取得した、2026年7月25日時点の実際の登録内容です。**実装・テスト時の参考用であり、正式なソースは必ず `options` APIのレスポンスを使用してください**（管理画面での追加・削除により変動するため）。

### implementation（導入サービス）— 4件

| id | name |
|---|---|
| 95 | AI Works |
| 63 | AIコンサル |
| 48 | 楽ジョブAI |
| 9 | 法人リスキリング |

### employees（従業員数）— 15件

| id | name |
|---|---|
| 6 | 1〜20名 |
| 51 | 1～19名 |
| 14 | 100〜299名 |
| 55 | 1000名～ |
| 72 | 1000名~ |
| 73 | 1000名～1999名 |
| 52 | 20～49名 |
| 24 | 20～50名 |
| 80 | 2000～2999名 |
| 27 | 3,000名〜 |
| 53 | 300～499名 |
| 50 | 300～500名 |
| 10 | 300名〜 |
| 25 | 50～99名 |
| 54 | 500～999名 |

### location（所在）— 21件

| id | name |
|---|---|
| 87 | 京都府 |
| 75 | 兵庫県 |
| 85 | 北海道 |
| 90 | 千葉県 |
| 30 | 和歌山 |
| 60 | 埼玉県 |
| 20 | 大阪府 |
| 81 | 山形県 |
| 96 | 岡山県 |
| 35 | 愛知県 |
| 99 | 新潟県 |
| 11 | 東京都 |
| 49 | 栃木県 |
| 23 | 熊本県 |
| 7 | 石川県 |
| 41 | 神奈川県 |
| 45 | 福岡 |
| 46 | 福岡県 |
| 94 | 茨城県 |
| 57 | 静岡県 |
| 38 | 鹿児島県 |

> `福岡` と `福岡県` が別タームとして存在しています。`industry` と同様に表記ゆれによる重複の一例です。

### industry（業種）— 54件（文字列指定で使用。IDは参考情報）

| id | name |
|---|---|
| 42 | BPO業 |
| 105 | https://www.copa.co.jp/company |
| 31 | ICT（情報通信技術）サービス業 |
| 32 | ICT（情報通信技術）業 |
| 76 | ITコンサルティング事業 |
| 47 | イベント配信事業 |
| 74 | オンライン学習サービスの開発及び運営 |
| 82 | クリーニング業 |
| 33 | スペースソリューション |
| 34 | スペースソリューション業 |
| 77 | デジタルコンテンツ関連業や映像サービス業 |
| 88 | パチンコ業 |
| 65 | フードカタログギフト |
| 92 | メディア事業、コンテンツ・ソリューション事業、インバウンド事業 |
| 29 | 不動産 |
| 104 | 事務機器の販売 |
| 28 | 人材サービス業 |
| 67 | 保険代理店業 |
| 98 | 医療法人徳真会の歯科診療におけるバックオフィス業務全般 |
| 43 | 卸売・小売・EC |
| 97 | 卸売業 |
| 64 | 卸売業・小売業 |
| 103 | 各種教育セミナー事業、採用支援サービス業 |
| 36 | 商社 |
| 71 | 国内外食事業、宅食事業 |
| 8 | 士業・コンサルティング |
| 12 | 士業・医業等のプロフェッショナルに向けた総合支援 |
| 91 | 実地棚卸サービス |
| 106 | 実演販売および商品卸 |
| 78 | 小売業 |
| 86 | 弁当事業、給食・社員食堂委託事業 |
| 26 | 教育・学習支援業 |
| 101 | 教育・福祉、プランニング・サポート |
| 13 | 新規事業創造・オープンイノベーション推進、 管理並びにそれに付帯する業務 |
| 21 | 有料職業紹介事業 |
| 84 | 機械器具卸売業 |
| 93 | 注文住宅の請負ならびに設計、施工管理 |
| 68 | 生命保険の募集に関する媒介業務、損害保険の代理業務、金融商品仲介業務、 |
| 39 | 生命保険代理店 |
| 58 | 畜産食料品製造業、観光業 |
| 70 | 社会保険労務士業 |
| 40 | 福祉事業 |
| 83 | 税理士業 |
| 79 | 経営・財務コンサルティング |
| 102 | 総合コンサルティングサービス |
| 100 | 自動車部品・用品及び自動車整備工具の販売 |
| 56 | 製造業 |
| 66 | 設計業務、製造業務、人材派遣事業 |
| 61 | 調剤薬局業 |
| 22 | 軽貨物運送業 |
| 44 | 金融・保険業 |
| 62 | 障害福祉サービス |
| 89 | 電気機械器具の製造ならびに販売 、半導体およびその応用機械器具の製造ならびに販売 |
| 59 | 食料品製造卸業 観光業 |

---

## 11. このドキュメントについて

- 元データ: Google Docs「Case Generator API 仕様書」（内容は変更していません。Markdown化と補足コメントのみ追加）
- 補足セクション（10章）: WordPress管理画面から直接取得した実データ
- 未確定事項（6章）: 実装前にWordPress側担当者への確認が必要
- 形式をMarkdownにした理由: Claude CodeなどのAIコーディングツールはローカルのプレーンテキスト/Markdownファイルを直接コンテキストとして読み込みやすく、Google Docsのリッチテキスト形式（今回の元ドキュメントも太字がエスケープ文字化けするなど機械可読性が低い状態でした）より構造が壊れにくいため。リポジトリに `docs/case-generator-api-spec.md` のような形で配置して利用することを想定しています。
