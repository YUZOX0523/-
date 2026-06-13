# Vercel引っ越し & リポジトリ移管 手順書

「AI活用レベル診断」(shindan.digirise.ai) を個人Vercelアカウントから
会社アカウントへ移行するための完全手順。**この文書だけで作業完結できます。**

---

## 現状の構成(2026年6月時点)

| 要素 | 現状 | 引っ越し |
|---|---|---|
| GitHubリポジトリ | `github.com/YUZOX0523/-`(mainブランチ) | **会社組織へ移管** |
| アプリ本体 | リポジトリ内 **`ai-adoption-survey/`** ディレクトリ(Next.js 14 / App Router) | リポジトリごと移動 |
| データベース | Supabase(`https://ffkugjqkhfhyzzuaxveq.supabase.co`) | **そのまま(触らない)** |
| ホスティング | Vercel 個人Hobbyアカウント(ytsutsumi-digiriseais-projects / プロジェクト名 `-`) | **会社アカウントに新規作成** |
| 本番ドメイン | `shindan.digirise.ai`(DNS: GMO `ns-rs1/ns-rs2.gmoserver.jp`) | 新プロジェクトへ付け替え |

> 💡 アプリのデータ(リード・回答・設問)はすべてSupabase側にあるため、
> Vercelの引っ越しでデータが消えることはありません。

---

## 手順1: GitHubリポジトリの移管

1. `github.com/YUZOX0523/-` → Settings → 最下部 Danger Zone →「**Transfer ownership**」→ 会社のGitHub組織を指定
2. **推奨**: 移管に合わせてリポジトリ名を `-` から `ai-level-check` 等に変更(分かりやすさのため。アプリ動作への影響なし)
3. 移管後、旧URLへのアクセスは自動リダイレクトされる

## 手順2: 会社のVercelアカウントで新プロジェクト作成

1. Vercel(会社チーム)→「Add New…」→「Project」→ 移管したリポジトリをImport
   (組織のGitHub連携でリポジトリへのアクセス許可が必要)
2. 設定項目:
   - **Root Directory: `ai-adoption-survey`** ← ⚠最重要。これを忘れるとビルドできない
   - Framework Preset: Next.js(自動検出)
   - Build/Output: デフォルトのまま

## 手順3: 環境変数を登録(7つ・Production/Preview両方に)

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ffkugjqkhfhyzzuaxveq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabaseダッシュボード → Project Settings → **API Keys** → Publishable key(`sb_publishable_...`)をコピー |
| `SUPABASE_SERVICE_ROLE_KEY` | 同ページ → Secret keys(`sb_secret_...`、目のアイコンで表示)をコピー ⚠秘匿情報 |
| `NEXT_PUBLIC_APP_URL` | `https://shindan.digirise.ai` |
| `NEXT_PUBLIC_CONSULTATION_URL` | `https://digirise.ai/contact/` |
| `EMAIL_FROM` | `noreply@example.com`(Resend導入時に正式アドレスへ変更) |
| `CRON_SECRET` | 任意のランダム文字列(32文字程度)。現行値を引き継ぐ場合は旧Vercelの環境変数からコピー |

> Supabaseダッシュボードへのアクセス権は堤(y.tsutsumi@digirise.ai)が保有。

## 手順4: デプロイと動作確認

1. Import完了時に自動で初回デプロイが走る(失敗したらRoot Directory設定を確認)
2. 発行された `xxx.vercel.app` で確認:
   - [ ] LPが表示される
   - [ ] 企業登録 → サーベイURL発行
   - [ ] サーベイ回答 → 個人結果表示
   - [ ] `/login` で企業ダッシュボード表示
   - [ ] 管理者ログイン(`y.tsutsumi@digirise.ai` / パスワードは堤が保有)→ リード一覧
3. Vercelの「Cron Jobs」タブに `/api/cron/refresh-benchmarks`(毎日18:00 UTC)が
   登録されていることを確認(`vercel.json` により自動設定)

## 手順5: ドメイン `shindan.digirise.ai` の付け替え

1. **旧**Vercelプロジェクト → Domains → `shindan.digirise.ai` を **Remove**
2. **新**プロジェクト → Domains → `shindan.digirise.ai` を **Add**
   - 会社VercelアカウントにはdigiRise.aiが既にリンク済みのため、所有権TXT認証は不要の見込み
3. 新プロジェクトが提示する**CNAME値**を確認:
   - 現在のDNS設定: `shindan` CNAME `41ced73bd62d2ead.vercel-dns-017.com`(GMOのDNS管理画面)
   - 提示された値が異なる場合のみ、DNS担当者へ「`shindan` のCNAME値を新しい値へ変更」を依頼
   - 共通値 `cname.vercel-dns.com` が提示された場合はそれでもOK
4. ステータスが ✅(Valid Configuration)になり、SSL証明書が自動発行されたら完了
5. `https://shindan.digirise.ai` で再度動作確認

## 手順6: 後片付け

- [ ] 旧Vercelプロジェクト(個人アカウントの `-`)を削除
- [ ] DNSの `_vercel` TXTレコード(`vc-domain-verify=shindan...`)は削除してよい(残置も無害)

---

## 触ってはいけないもの

- **Supabase**: プロジェクト・データ・スキーマ・認証ユーザーすべてそのまま使う
- **DNSのその他レコード**(digirise.ai本体、claudecode等)

## 関連ドキュメント

- ローカル開発・初期構築・本番Seed手順: `ai-adoption-survey/README.md`
- プロダクト設計書(スキーマ・画面遷移・設問・スコアリング): `docs/DESIGN.md`

## 問い合わせ

- プロダクト/アカウント情報: 堤(y.tsutsumi@digirise.ai)
