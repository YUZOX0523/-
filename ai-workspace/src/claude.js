const Anthropic = require('@anthropic-ai/sdk');
const { db, monthlyCost } = require('./db');

const client = new Anthropic(); // ANTHROPIC_API_KEY を環境変数から読む

const USD_JPY = Number(process.env.USD_JPY_RATE || 155);

// モデル単価（USD / 100万トークン）。キャッシュ読取は入力の0.1倍、書込は1.25倍。
const MODELS = {
  'claude-haiku-4-5':  { input: 1,  output: 5  },
  'claude-sonnet-5':   { input: 3,  output: 15 },
  'claude-opus-4-8':   { input: 5,  output: 25 },
};

// モードごとの設定：モデル振り分けがコスト構造の心臓部。
// chat  … 日常の質問・文章作成 → Haiku 4.5（最安・高速）
// docs  … 資料の読み込み・分析 → Sonnet 5
// code  … コード生成・レビュー → Sonnet 5（コーディング性能がOpus級）
// advanced … 高度な分析（管理者が有効化した場合のみ）→ Opus 4.8
const MODES = {
  chat: {
    model: 'claude-haiku-4-5',
    maxTokens: 2048,
    label: 'チャット',
    system: `あなたは企業の社内アシスタントです。ビジネス文書の作成、要約、翻訳、企画の壁打ちなど、日常業務を日本語で支援します。
- 回答は簡潔に。長文が必要な場合のみ詳しく書く
- 機密情報の扱いには注意を促す
- わからないことは正直にわからないと言う`,
  },
  docs: {
    model: 'claude-sonnet-5',
    maxTokens: 8192,
    effort: 'medium',
    label: 'ドキュメント分析',
    system: `あなたは企業のドキュメント分析アシスタントです。アップロードされた資料（PDF・CSV・画像など）を読み取り、要約・分析・データ抽出を行います。
- 資料に書かれている内容と、あなたの推測を明確に区別する
- 数値を扱うときは根拠となる箇所を示す
- 表形式が適切な場合は表で整理する`,
  },
  code: {
    model: 'claude-sonnet-5',
    maxTokens: 8192,
    effort: 'medium',
    label: 'コード支援',
    system: `あなたは社内エンジニア向けのコーディングアシスタントです。コードの生成・レビュー・デバッグ・リファクタリング・技術調査を支援します。
- コードには必要最小限のコメントを付ける
- セキュリティ上の問題（ハードコードされた秘密情報、インジェクション等）を見つけたら必ず指摘する
- 動作の前提条件（言語バージョン、依存ライブラリ）を明記する`,
  },
  advanced: {
    model: 'claude-opus-4-8',
    maxTokens: 16000,
    effort: 'high',
    label: '高度な分析',
    system: `あなたは企業の高度分析アシスタントです。複雑な戦略検討、大量資料の統合分析、難易度の高い技術課題に取り組みます。結論を先に述べ、根拠を構造的に示してください。`,
  },
};

function advancedEnabled() {
  return String(process.env.ENABLE_ADVANCED_MODEL).toLowerCase() === 'true';
}

function calcCostJpy(model, usage) {
  const p = MODELS[model];
  if (!p) return 0;
  const usd =
    (usage.input_tokens || 0) / 1e6 * p.input +
    (usage.output_tokens || 0) / 1e6 * p.output +
    (usage.cache_read_input_tokens || 0) / 1e6 * p.input * 0.1 +
    (usage.cache_creation_input_tokens || 0) / 1e6 * p.input * 1.25;
  return usd * USD_JPY;
}

function budgetFor(user) {
  return user.monthly_budget_jpy ?? Number(process.env.DEFAULT_MONTHLY_BUDGET_JPY || 500);
}

function checkBudget(user) {
  const used = monthlyCost(user.id);
  const budget = budgetFor(user);
  return { used, budget, ok: used < budget };
}

/**
 * 会話をストリーミング実行し、テキストチャンクごとに onText を呼ぶ。
 * 完了後に usage を記録して {text, usage, costJpy} を返す。
 */
async function streamChat({ user, conversationId, mode, apiMessages, onText }) {
  const cfg = MODES[mode] || MODES.chat;
  if (mode === 'advanced' && !advancedEnabled()) {
    throw Object.assign(new Error('高度な分析モードは管理者によって無効化されています'), { status: 403 });
  }

  const params = {
    model: cfg.model,
    max_tokens: cfg.maxTokens,
    system: [{ type: 'text', text: cfg.system, cache_control: { type: 'ephemeral' } }],
    messages: apiMessages,
  };
  // effort は Sonnet 5 / Opus 4.8 のみ（Haiku 4.5 ではエラーになるため付けない）
  if (cfg.effort) params.output_config = { effort: cfg.effort };

  const stream = client.messages.stream(params);
  stream.on('text', (delta) => onText(delta));
  const final = await stream.finalMessage();

  const text = final.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const costJpy = calcCostJpy(cfg.model, final.usage);

  db.prepare(`INSERT INTO usage_log
      (user_id, conversation_id, model, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_jpy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(user.id, conversationId, cfg.model,
      final.usage.input_tokens || 0, final.usage.output_tokens || 0,
      final.usage.cache_read_input_tokens || 0, final.usage.cache_creation_input_tokens || 0,
      costJpy);

  return { text, usage: final.usage, costJpy, model: cfg.model, stopReason: final.stop_reason };
}

module.exports = { MODES, MODELS, streamChat, checkBudget, budgetFor, calcCostJpy, advancedEnabled, USD_JPY };
