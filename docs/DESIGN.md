# AI活用レベル診断 — Phase 0 設計書

株式会社デジライズ「AI活用レベル診断」サーベイ&ダッシュボードツールの実装前設計書です。
承認後、この内容に基づいて Phase 1 以降の実装を行います。

- 技術スタック: Next.js 14+ (App Router) / TypeScript / Tailwind CSS / Recharts / Supabase / Resend / Vercel
- 配布方式: リンク発行方式(回答者の個人情報は一切取得しない)

---

## 1. 画面遷移図

```
【回答者(認証不要)】
/s/[token]                 サーベイ入口(企業名表示・プライバシーポリシー同意チェック)
  → 属性選択(部署[必須] / 役職層[任意] / 年代[任意])
  → 設問 6画面(1画面1カテゴリー、プログレスバー、戻るボタン、LocalStorage自動保存)
  → フリーテキスト1問(任意)
  → 送信
/s/[token]/result/[responseId]   個人簡易結果(総合スコア・レベル・レーダー・一言コメント・CTA)

【企業担当者(Supabase Auth)】
/                          LP(サービス説明 → 登録CTA)
/register                  企業登録(リード情報入力: 会社名/業種/規模/氏名/メール/電話)
                           → Supabase Authユーザー作成 + Resendで確認メール
/login                     ログイン
/dashboard                 詳細ダッシュボード
                           ├ ヒーロー(総合偏差値・レベル・上位◯◯%)
                           ├ レーダーチャート(自社 vs 全国 vs 同業種)
                           ├ 部署×カテゴリーヒートマップ(回答3名未満は「回答数不足」)
                           ├ 回答状況(回答数/配布想定数、部署別回答率)
                           ├ 強み・弱み自動サマリー
                           ├ 推奨アクション(デジライズサービスへのCTA)
                           └ PDFレポート出力ボタン
/dashboard/setup           部署リスト設定・配布想定数入力・サーベイURL発行/コピー
/privacy                   プライバシーポリシー

【デジライズ管理者(Supabase Auth + role=admin)】
/admin                     登録企業一覧(リード情報 + 回答数 + 総合スコア)・CSVエクスポート
/admin/companies/[id]      各企業のダッシュボード閲覧(営業準備用)
/admin/benchmarks          ベンチマークパラメータ管理
/admin/questions           設問管理
```

---

## 2. DBスキーマ(Supabase / PostgreSQL)

```sql
-- 企業
companies (
  id uuid PK default gen_random_uuid(),
  name text not null,
  industry text not null,            -- 業種(下記コード表)
  employee_size_band text not null,  -- 従業員規模(下記コード表)
  expected_respondents int,          -- 配布想定数(回答率表示用)
  created_at timestamptz default now()
)

-- 企業担当者(リード情報)
company_admins (
  user_id uuid PK references auth.users,
  company_id uuid FK -> companies,
  name text not null,
  email text not null,
  phone text,
  created_at timestamptz default now()
)

-- 部署
departments (
  id uuid PK, company_id uuid FK, name text not null,
  sort_order int default 0,
  unique (company_id, name)
)

-- サーベイリンク
survey_links (
  id uuid PK, company_id uuid FK,
  token text unique not null,        -- 32byte URL-safeランダム
  is_active boolean default true,
  expires_at timestamptz,            -- null = 無期限
  created_at timestamptz default now()
)

-- 設問(バージョン管理)
questions (
  id uuid PK,
  category text not null,            -- literacy|usage|org_drive|culture|mindset|governance
  text text not null,
  scale_type text default 'agreement', -- agreement(当てはまる) | frequency(頻度)
  is_reversed boolean default false,
  sort_order int not null,
  version int not null default 1,
  is_active boolean default true
)

-- 回答(個人特定情報カラムなし)
responses (
  id uuid PK,
  company_id uuid FK,
  department_id uuid FK,
  role_band text,                    -- executive|manager|staff|null
  age_band text,                     -- u20s|30s|40s|50s|60s|null
  question_version int not null,
  answers jsonb not null,            -- {question_id: 1..5}
  free_text text,                    -- 課題・困りごと(任意)
  category_scores jsonb not null,    -- {literacy: 0-100, ...}
  total_score numeric not null,      -- 0-100
  created_at timestamptz default now()
)

-- ベンチマーク(全国 = industry/size_band が 'all')
benchmarks (
  id uuid PK,
  category text not null,            -- 6カテゴリー + 'total'
  industry text not null default 'all',
  size_band text not null default 'all',
  mean numeric not null, sd numeric not null, n int not null,
  source text not null check (source in ('seed','actual')),
  updated_at timestamptz default now(),
  unique (category, industry, size_band)
)

-- スコアリング設定(単一行)
scoring_config (
  id int PK default 1,
  weights jsonb,                     -- {literacy: 1, usage: 1, ...} 初期は均等
  level_thresholds jsonb,            -- [20, 40, 60, 80] → Lv.1〜5境界
  min_responses_per_dept int default 3,
  benchmark_switch_threshold int default 30  -- 実データ切替の最小企業数
)
```

### RLS方針
| テーブル | company_admin | admin | anon |
|---|---|---|---|
| companies / departments / survey_links | 自社のみ SELECT/UPDATE | 全件 | 不可(回答APIはservice role経由) |
| company_admins | 自分の行のみ | 全件 | 登録APIのみ(service role) |
| responses | **不可**(集計RPC経由のみ) | 全件 | INSERT不可(トークン検証付きRoute Handler = service roleのみ) |
| questions / benchmarks / scoring_config | SELECT のみ | 全権 | questions は SELECT のみ |

- 集計は `get_company_summary(company_id)` 等の SECURITY DEFINER な RPC で提供し、部署別集計は回答3名未満を `null`(回答数不足)で返す。
- 回答POSTは `/api/survey/[token]` Route Handler のみ。トークンの有効性・部署の所属を検証後、service role で INSERT。

---

## 3. スコアリングロジック

1. カテゴリースコア = 平均(逆転項目は `6 − 回答値` で反転) → `(avg − 1) / 4 × 100`
2. 総合スコア = 6カテゴリーの加重平均(`scoring_config.weights`、初期均等)
3. レベル: 0–20 Lv.1 未着手 / 20–40 Lv.2 個人利用 / 40–60 Lv.3 業務活用 / 60–80 Lv.4 組織展開 / 80–100 Lv.5 変革ドライバー(閾値は設定で変更可)
4. 偏差値 = `50 + 10 × (score − mean) / sd`。ベンチマークは「業種×規模」→「業種」→「全国」の順でフォールバック。画面に必ず `n=◯◯社` を表示
5. 初期ベンチマークseed: mean 55 / sd 15 / n 100(仮)。登録企業の実回答が閾値(初期30社)超で Vercel Cron(日次)が実データ集計に自動切替
6. 部署別: 回答3名未満は非表示(「回答数不足」)

---

## 4. 設問ドラフト(27問)— 要承認

回答尺度: ★=頻度尺度(全く使わない/月に数回/週に1回程度/週に数回/ほぼ毎日)、無印=同意尺度(全く当てはまらない/あまり当てはまらない/どちらともいえない/やや当てはまる/非常に当てはまる)。(逆)=逆転項目。

### カテゴリー1: AIリテラシー(知識・スキル)— 5問
1. 生成AI(ChatGPTなど)がどのような仕組みで回答を作っているか、概要を人に説明できる
2. 目的に応じて複数のAIツール(文章生成・画像生成・検索型など)を使い分けられる
3. 欲しい回答を得るために、AIへの指示文(プロンプト)を自分なりに工夫して書ける
4. AIの回答には誤りが含まれる可能性があることを理解し、重要な内容は自分で確認・検証している
5. AIの新しいツールや機能に関する情報を、自分から進んで収集している

### カテゴリー2: 業務活用度(実践)— 5問
6. ★ 業務でAI(生成AIツール)を使う頻度はどのくらいですか
7. 文章作成・要約・翻訳・調査など、複数の種類の業務でAIを活用している
8. AIの活用によって、業務時間の短縮や成果物の品質向上を実感している
9. 定型業務だけでなく、企画やアイデア出しなど考える業務にもAIを使っている
10. AIを使った自分なりの仕事の進め方(手順やお決まりのプロンプト)ができている

### カテゴリー3: 組織推進度 — 4問
11. 経営層が、AI活用の方針やビジョンを明確に発信している
12. 会社として、AIツールの導入・利用に必要な投資(予算・有料ライセンス)を行っている
13. 社内に、AI活用を推進する担当者やチームが存在する
14. AIの使い方を学べる研修や学習機会が、会社から提供されている

### カテゴリー4: 浸透度(カルチャー)— 4問
15. 自分の部署では、多くのメンバーが日常的にAIを活用している
16. 同僚とAIの使い方やプロンプトを教え合う・共有する文化がある
17. 社内でAI活用の成功事例が共有され、他の部署にも広がっている
18. 業務で困りごとがあったとき、「AIで解決できないか」という発想が自然に出る

### カテゴリー5: マインド・受容性 — 5問
19. AIに業務の一部を任せることに、不安よりも期待を感じる
20. AIの新しい使い方を試してみることに前向きである
21. AIスキルを身につけるための学習時間を、自分から確保している
22. (逆)AIによって自分の仕事が奪われるのではないかという不安を感じる
23. (逆)「AIを使うより自分でやったほうが早い」と感じて、AIを使うのを避けることが多い

### カテゴリー6: ガバナンス・セキュリティ — 4問
24. 会社に、AI利用に関するルールやガイドラインが整備されている
25. 会社のAI利用ルールの内容を理解し、守って利用できている
26. 機密情報や個人情報をAIに入力してはいけない場面を、自分で判断できる
27. 情報漏えいなどの心配をせず、安心してAIを使える環境が会社に整っている

### 属性(設問の前に表示)
- 部署(必須・プルダウン、担当者が設定したリスト)
- 役職層(任意): 経営層 / 管理職 / 一般
- 年代(任意): 20代以下 / 30代 / 40代 / 50代 / 60代以上

### フリーテキスト(最後・任意)
- 「AI活用に関して、現在の課題や困りごとがあればご記入ください」→ 担当者ダッシュボードに一覧表示

---

## 5. 選択肢マスタ(提案)

**業種**: 製造 / 建設・不動産 / IT・通信 / 金融・保険 / 小売・卸売 / 医療・福祉 / 教育 / 運輸・物流 / 飲食・宿泊 / 専門サービス(士業・コンサル等) / 公務・団体 / その他

**従業員規模**: 〜10名 / 11〜50名 / 51〜100名 / 101〜300名 / 301〜1,000名 / 1,001名〜

**AI活用レベル説明文**:
- Lv.1 未着手: AI活用はこれから。まずは触れる機会づくりが第一歩です。
- Lv.2 個人利用: 一部の社員が個人的に使い始めた段階。組織的な後押しで一気に伸びます。
- Lv.3 業務活用: 日常業務での活用が定着しつつあります。部署間の差を埋めることが次の課題です。
- Lv.4 組織展開: 組織として推進が機能し、活用が広がっています。業務変革への接続がテーマです。
- Lv.5 変革ドライバー: AIが業務と事業の変革を牽引する先進企業です。

**推奨アクションのマッピング**(弱点カテゴリー → サービス):
- AIリテラシー / 業務活用度 → 法人リスキリング(研修プログラム)
- 組織推進度 / 浸透度 → AI活用コンサルティング
- マインド / ガバナンス → AI活用コンサルティング(ガイドライン策定・チェンジマネジメント)
- 業務活用度が高くリテラシーも高い場合 → AI開発・導入支援(特定業務の自動化余地)
- 各カードのCTAリンク先は環境変数 `NEXT_PUBLIC_CONSULTATION_URL` で設定

---

## 6. 環境変数(.env.example)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
EMAIL_FROM=noreply@example.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CONSULTATION_URL=https://example.com/contact
CRON_SECRET=
```
