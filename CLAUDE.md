# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains **two independent applications** that do not share code or dependencies. Each has its own `package.json` and must be installed/run separately:

1. **Sales mail sender** (repository root, `src/`) — 企業infoメールへの営業メール自動送信アプリ. Express + SQLite + Nodemailer app for bulk-sending sales emails to companies.
2. **AI adoption survey** (`ai-adoption-survey/`) — AI活用組織診断アプリ. Next.js 14 (App Router) + TypeScript app that surveys organizations on AI adoption and generates a scored diagnosis with a radar chart.

`ClaudeCode完全マニュアル_超初心者向け.md` is a standalone Japanese beginner's guide to Claude Code — documentation only, unrelated to the code.

**Language convention:** UI text, code comments, commit messages, and API error messages are written in Japanese. Follow this convention.

There are no tests or CI in this repository. The only lint setup is `next lint` inside `ai-adoption-survey/`.

## Sales Mail Sender (root)

### Commands

```bash
npm install
cp .env.example .env   # fill in SMTP credentials before sending mail
npm start              # node src/index.js — serves http://localhost:3000
npm run dev            # node --watch src/index.js
```

Configuration is entirely via `.env` (see `.env.example`): SMTP settings, sender name/email, `PORT`, and `SEND_INTERVAL_MS` (delay between bulk sends to avoid spam filtering).

### Architecture

- `src/index.js` — Express entry point; mounts JSON APIs under `/api/companies`, `/api/templates`, `/api/send` and serves the static frontend from `src/public/` (vanilla JS/HTML/CSS single page, no framework or build step).
- `src/config.js` — loads `.env` via dotenv; all env access goes through this module.
- `src/db.js` — opens `data/app.db` with `better-sqlite3` (WAL mode) and creates the schema on startup: `companies`, `templates`, `send_logs`. There are no migrations — schema changes go in this `CREATE TABLE IF NOT EXISTS` block and only apply to fresh databases.
- `src/mailer.js` — Nodemailer transport. Email templates support placeholders `{{company_name}}`, `{{contact_person}}`, `{{industry}}` substituted per company. `sendBulk` sends sequentially, sleeping `SEND_INTERVAL_MS` between sends, and writes a row to `send_logs` (status `success`/`failed`) for every attempt.
- `src/routes/` — one router per resource. `companies.js` includes CSV import (multer + csv-parser; `sample.csv` shows the expected columns). `send.js` performs bulk send and exposes `/logs` and `/stats`.
- `data/` is gitignored (except `.gitkeep`); the SQLite database is created there at runtime.

## AI Adoption Survey (`ai-adoption-survey/`)

### Commands

```bash
cd ai-adoption-survey
npm install
npm run dev     # next dev on http://localhost:3001
npm run build   # next build
npm start       # next start -p 3001
npm run lint    # next lint
```

**Node.js 22+ is required**: the database layer uses the built-in `node:sqlite` module (`DatabaseSync`), deliberately replacing `better-sqlite3` (see commit 6237b99). Do not reintroduce a native SQLite dependency here.

### Architecture

Next.js 14 App Router, TypeScript (strict), Tailwind CSS, Recharts. Path alias `@/*` → `src/*`.

**Data flow / user journey:**
1. Admin page (`src/app/page.tsx`) registers a company via `POST /api/companies`, which generates a unique UUID `survey_token`.
2. Respondents open `/survey/[token]`, answer 20 questions (1–5 scale) across 5 categories, submitted to `POST /api/survey/[token]`. Scoring is computed server-side at submission time and stored with the response.
3. Results are viewed at `/results/[token]` (fetched from `/api/results/[token]`), rendered with `RadarChartComponent`.

**Key modules (`src/lib/`):**
- `db.ts` — lazy singleton `DatabaseSync` connection to `data/survey.db` (created on first use, WAL mode). Schema: `companies`, `survey_responses`. Answers and category scores are stored as JSON in TEXT columns. No migrations, same caveat as the root app. `data/` is gitignored.
- `questions.ts` — the 5 categories (strategy, practice, talent, data, culture) and 20 questions, each category with a display color and a benchmark score used in the radar chart.
- `scoring.ts` — all diagnosis logic: category scores (0–100), total score, a deviation score (偏差値, clamped 20–80) computed against a hard-coded virtual benchmark (mean 42, std 14), S–D rank, top-percentile conversion, and per-category issues with recommended actions (`ISSUES_MAP`) for any category scoring below 60. Multiple responses per company are averaged via `aggregateAnswers`.

Route handlers live in `src/app/api/**/route.ts` and are the only code that touches the database; pages fetch through these APIs.
