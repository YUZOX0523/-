# AI活用レベル診断

株式会社デジライズ提供の法人向け無償診断ツール。社員が5〜10分の匿名サーベイ(27問+属性3問)に回答すると、企業全体・部署ごとのAI活用レベルがスコアリングされ、全国ベンチマークに対する偏差値とともにダッシュボードで可視化されます。

- 設計書: [`../docs/DESIGN.md`](../docs/DESIGN.md)
- 技術スタック: Next.js 14 (App Router) / TypeScript / Tailwind CSS / Recharts / Supabase / Resend / Vercel

## 構成

| パス | 内容 |
|---|---|
| `/` | LP(企業登録への導線) |
| `/register` | 企業登録(リード情報入力 → サーベイURL即時発行) |
| `/login` | 担当者・管理者ログイン |
| `/s/[token]` | サーベイ回答(認証不要・匿名) |
| `/s/[token]/result/[id]` | 回答者向け簡易結果 |
| `/dashboard` | 企業担当者ダッシュボード(偏差値・レーダー・部署ヒートマップ・推奨アクション) |
| `/dashboard/setup` | 部署リスト・サーベイURL・配布想定数の設定 |
| `/dashboard/report` | A4印刷(PDF保存)用レポート |
| `/admin` | デジライズ管理画面(リード一覧・CSVエクスポート・各社ダッシュボード閲覧) |
| `/admin/benchmarks` | ベンチマークパラメータ・集計設定の管理 |
| `/admin/questions` | 設問管理(バージョン管理) |

## ローカル開発

前提: Node.js 20+ / Docker / [Supabase CLI](https://supabase.com/docs/guides/cli)

```bash
cd ai-adoption-survey
npm install

# ローカルSupabaseを起動(初回はイメージ取得に数分かかります)
npx supabase start
# → 出力された API URL / anon key / service_role key を控える

# 環境変数を設定
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY /
# SUPABASE_SERVICE_ROLE_KEY を supabase start の出力値で埋める

# マイグレーション+seed(設問27問・初期ベンチマーク・デモデータ)を適用
npx supabase db reset

npm run dev
# → http://localhost:3000
```

### Seedに含まれるデモアカウント(ローカル専用)

| ロール | メール | パスワード |
|---|---|---|
| デジライズ管理者 | `admin@example.com` | `password123` |
| デモ企業担当者 | `demo@example.com` | `password123` |

- デモ企業「デモ株式会社」に5部署+ダミー回答50件がseedされます。
- デモ用サーベイURL: `http://localhost:3000/s/demo0000demo0000demo0000demo0000`

### 環境変数一覧

| 変数 | 説明 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | SupabaseプロジェクトURL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anonキー(RLS適用) |
| `SUPABASE_SERVICE_ROLE_KEY` | service roleキー(回答POST・登録API・Cron用。**サーバー専用**) |
| `RESEND_API_KEY` | ResendのAPIキー(未設定時はメール送信をスキップしログ出力) |
| `EMAIL_FROM` | 送信元(例: `AI活用レベル診断 <noreply@yourdomain.jp>`) |
| `NEXT_PUBLIC_APP_URL` | アプリの公開URL(メール内リンク・OGPに使用) |
| `NEXT_PUBLIC_CONSULTATION_URL` | 「無料相談を予約する」CTAのリンク先 |
| `CRON_SECRET` | Vercel Cronの認証用シークレット |

## 本番デプロイ

### 1. Supabase

1. [supabase.com](https://supabase.com) でプロジェクト作成
2. マイグレーション適用:
   ```bash
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```
3. 本番seed(設問・初期ベンチマーク・scoring_config)を適用:
   `supabase/seed.sql` のうち **「ローカル開発用ユーザー」「デモ企業」セクションを除いた部分**を
   SQL Editorで実行する(ローカル専用seedを本番に入れないこと)
4. 管理者アカウント作成: Authentication → Users でユーザーを作成し、SQL Editorで
   ```sql
   insert into admin_users (user_id) values ('<作成したユーザーのUUID>');
   ```

### 2. Vercel

1. リポジトリをimportし、**Root Directory を `ai-adoption-survey`** に設定(設定済み)
2. 上記の環境変数をすべて設定(`CRON_SECRET` はランダム文字列)
3. デプロイ。`vercel.json` の定義により毎日 18:00 UTC(JST 3:00)に
   `/api/cron/refresh-benchmarks` が実行され、実回答企業数が閾値
   (`scoring_config.benchmark_switch_threshold`、初期値30社)を超えると
   ベンチマークが実データ集計値に自動切替されます

### 3. Resend

1. [resend.com](https://resend.com) でドメイン認証し、APIキーを `RESEND_API_KEY` に設定
2. `EMAIL_FROM` を認証済みドメインのアドレスに変更

## セキュリティ設計(要点)

- **RLS**: 企業担当者は自社の `companies` / `departments` / `survey_links` のみ参照可。
  `responses`(生回答)は管理者以外参照不可で、担当者には `get_company_dashboard`
  RPC(SECURITY DEFINER・呼出元の所属企業を検証)経由の集計値のみ提供
- **回答POST**: トークン検証付きRoute Handler(service role)経由のみ。クライアントからの直接INSERTは不可
- **匿名性**: `responses` に個人特定カラムなし。回答3名未満の部署はスコア非表示
  (閾値は `scoring_config.min_responses_per_dept`)
- **スコアリング**: カテゴリースコア=回答平均(逆転項目は反転)を0〜100換算、
  総合=加重平均(`scoring_config.weights`)、偏差値=`50 + 10 × (score − mean) / sd`
  (ベンチマークは業種×規模→業種→規模→全国の順でフォールバック)

## PDFレポートについて

`/dashboard/report` はA4印刷に最適化されたページです。「印刷 / PDF保存」ボタン
(またはブラウザの印刷機能)から「PDFに保存」を選ぶことでダウンロードできます。
