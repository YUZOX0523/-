# CLAUDE.md

## プロジェクト概要

営業メール自動送信アプリ（sales-mail-sender）。企業のinfoメールアドレスへ営業メールを一括送信するWebアプリケーション。

## 技術スタック

- **ランタイム**: Node.js
- **フレームワーク**: Express.js
- **データベース**: SQLite（better-sqlite3）
- **メール送信**: Nodemailer
- **フロントエンド**: バニラHTML/CSS/JavaScript（SPA構成）
- **ファイルアップロード**: Multer（CSVインポート用）

## プロジェクト構成

```
src/
├── index.js          # Expressサーバーのエントリーポイント
├── config.js         # 環境変数の読み込み（dotenv）
├── db.js             # SQLiteデータベース初期化・スキーマ定義
├── mailer.js         # メール送信ロジック（Nodemailer）
├── routes/
│   ├── companies.js  # 企業管理API（CRUD + CSVインポート）
│   ├── templates.js  # メールテンプレートAPI（CRUD）
│   └── send.js       # メール送信API（一括送信 + ログ）
└── public/
    ├── index.html    # SPA HTML
    ├── app.js        # フロントエンドJS
    └── style.css     # スタイルシート
data/                 # SQLiteデータベースファイル格納先
sample.csv            # CSVインポートのサンプルファイル
```

## コマンド

```bash
# 依存関係インストール
npm install

# 本番起動
npm start

# 開発モード（ファイル変更時に自動再起動）
npm run dev
```

## 環境変数

`.env.example` を `.env` にコピーして設定する。

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| SMTP_HOST | SMTPサーバーホスト | smtp.gmail.com |
| SMTP_PORT | SMTPポート | 587 |
| SMTP_SECURE | SSL使用 | false |
| SMTP_USER | SMTP認証ユーザー | - |
| SMTP_PASS | SMTP認証パスワード | - |
| FROM_NAME | 送信者名 | - |
| FROM_EMAIL | 送信元メールアドレス | - |
| PORT | サーバーポート | 3000 |
| SEND_INTERVAL_MS | 送信間隔（ミリ秒） | 5000 |

## データベーススキーマ

- **companies** - 送信先企業情報（name, email, industry, contact_person, notes）
- **templates** - メールテンプレート（name, subject, body）
- **send_logs** - 送信履歴（company_id, template_id, status, error_message）

## テンプレート変数

メールテンプレートの件名・本文で使用可能:
- `{{company_name}}` - 企業名
- `{{contact_person}}` - 担当者名
- `{{industry}}` - 業種

## 開発時の注意事項

- テストフレームワークは未導入。テスト追加時は `jest` や `vitest` を検討
- リンター・フォーマッターは未導入。導入時は `eslint` + `prettier` を検討
- `.env` ファイルはコミットしないこと（`.gitignore` に含まれている）
- データベースファイル（`data/*.db`）もコミット対象外
- フロントエンドはビルドステップ不要（バニラJS）
