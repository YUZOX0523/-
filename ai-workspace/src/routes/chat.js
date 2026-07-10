const express = require('express');
const { db, audit } = require('../db');
const { requireAuth } = require('../auth');
const { MODES, streamChat, checkBudget, advancedEnabled } = require('../claude');

const router = express.Router();
router.use(requireAuth);

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const TEXT_TYPES = ['text/plain', 'text/csv', 'text/markdown', 'application/json'];

// 利用可能なモード一覧
router.get('/modes', (req, res) => {
  const modes = Object.entries(MODES)
    .filter(([key]) => key !== 'advanced' || advancedEnabled())
    .map(([key, cfg]) => ({ key, label: cfg.label, model: cfg.model }));
  res.json(modes);
});

// 自分の当月利用状況
router.get('/usage/me', (req, res) => {
  const { used, budget } = checkBudget(req.user);
  res.json({ used: Math.round(used * 100) / 100, budget });
});

// 会話一覧
router.get('/conversations', (req, res) => {
  const rows = db.prepare(`SELECT id, title, mode, updated_at FROM conversations
                           WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100`).all(req.user.id);
  res.json(rows);
});

// 会話作成
router.post('/conversations', (req, res) => {
  const mode = MODES[req.body?.mode] ? req.body.mode : 'chat';
  const info = db.prepare('INSERT INTO conversations (user_id, mode) VALUES (?, ?)').run(req.user.id, mode);
  res.json({ id: info.lastInsertRowid, title: '新しい会話', mode });
});

function ownConversation(req, res) {
  const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);
  if (!conv) res.status(404).json({ error: '会話が見つかりません' });
  return conv;
}

// 会話のメッセージ取得（表示用：添付はメタ情報のみ）
router.get('/conversations/:id', (req, res) => {
  const conv = ownConversation(req, res);
  if (!conv) return;
  const rows = db.prepare(`SELECT role, content, created_at FROM messages
                           WHERE conversation_id = ? ORDER BY id`).all(conv.id);
  const messages = rows.map((r) => {
    const blocks = JSON.parse(r.content);
    const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const attachments = blocks
      .filter((b) => b.type === 'document' || b.type === 'image')
      .map((b) => b._filename || (b.type === 'image' ? '画像' : '添付ファイル'));
    return { role: r.role, text, attachments, created_at: r.created_at };
  });
  res.json({ id: conv.id, title: conv.title, mode: conv.mode, messages });
});

router.delete('/conversations/:id', (req, res) => {
  const conv = ownConversation(req, res);
  if (!conv) return;
  db.prepare('DELETE FROM conversations WHERE id = ?').run(conv.id);
  audit(req.user.id, 'conversation.delete', `id=${conv.id}`, req.ip);
  res.json({ ok: true });
});

// 添付ファイル → Claude APIコンテンツブロック
function fileToBlock(f) {
  if (!f || !f.data || !f.media_type) return null;
  if (Buffer.byteLength(f.data, 'base64') > MAX_ATTACHMENT_BYTES) {
    throw Object.assign(new Error(`ファイル ${f.name || ''} が大きすぎます（上限10MB）`), { status: 413 });
  }
  const name = String(f.name || 'file').slice(0, 200);
  if (f.media_type === 'application/pdf') {
    return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: f.data }, _filename: name };
  }
  if (IMAGE_TYPES.includes(f.media_type)) {
    return { type: 'image', source: { type: 'base64', media_type: f.media_type, data: f.data }, _filename: name };
  }
  if (TEXT_TYPES.includes(f.media_type) || f.media_type.startsWith('text/')) {
    const text = Buffer.from(f.data, 'base64').toString('utf-8').slice(0, 500_000);
    return { type: 'text', text: `【添付ファイル: ${name}】\n${text}`, _filename: name };
  }
  throw Object.assign(new Error(`未対応のファイル形式です: ${f.media_type}（PDF・画像・テキスト・CSVに対応）`), { status: 415 });
}

// APIに送る際は内部用メタ（_filename）を落とす
function stripMeta(blocks) {
  return blocks.map(({ _filename, ...rest }) => rest);
}

// チャット実行（SSEストリーミング）
router.post('/chat', async (req, res) => {
  const { conversationId, text, files } = req.body || {};
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'メッセージを入力してください' });
  }

  const conv = db.prepare('SELECT * FROM conversations WHERE id = ? AND user_id = ?')
    .get(conversationId, req.user.id);
  if (!conv) return res.status(404).json({ error: '会話が見つかりません' });

  // 月次予算チェック（利益保証の要）
  const { used, budget, ok } = checkBudget(req.user);
  if (!ok) {
    audit(req.user.id, 'chat.budget_exceeded', `used=${used.toFixed(0)}円/budget=${budget}円`, req.ip);
    return res.status(429).json({
      error: `今月の利用上限（${budget}円分）に達しました。管理者に上限の引き上げを依頼してください。`,
    });
  }

  // ユーザーメッセージのブロック構築
  let userBlocks;
  try {
    const fileBlocks = (Array.isArray(files) ? files.slice(0, 5) : []).map(fileToBlock).filter(Boolean);
    userBlocks = [...fileBlocks, { type: 'text', text: text.slice(0, 100_000) }];
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message });
  }

  // 履歴の組み立て
  const history = db.prepare(`SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id`)
    .all(conv.id)
    .map((r) => ({ role: r.role, content: stripMeta(JSON.parse(r.content)) }));
  const apiMessages = [...history, { role: 'user', content: stripMeta(userBlocks) }];

  // SSE開始
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  audit(req.user.id, 'chat.request', `conv=${conv.id} mode=${conv.mode} files=${files?.length || 0}`, req.ip);

  try {
    const result = await streamChat({
      user: req.user,
      conversationId: conv.id,
      mode: conv.mode,
      apiMessages,
      onText: (delta) => send({ type: 'delta', text: delta }),
    });

    // 成功時のみ履歴を保存
    const insert = db.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)');
    insert.run(conv.id, 'user', JSON.stringify(userBlocks));
    insert.run(conv.id, 'assistant', JSON.stringify([{ type: 'text', text: result.text }]));

    // タイトル自動設定
    if (conv.title === '新しい会話') {
      db.prepare('UPDATE conversations SET title = ? WHERE id = ?')
        .run(text.trim().slice(0, 40), conv.id);
    }
    db.prepare(`UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`).run(conv.id);

    const after = checkBudget(req.user);
    send({
      type: 'done',
      model: result.model,
      costJpy: Math.round(result.costJpy * 100) / 100,
      usedJpy: Math.round(after.used * 100) / 100,
      budgetJpy: after.budget,
      title: conv.title === '新しい会話' ? text.trim().slice(0, 40) : conv.title,
    });
  } catch (e) {
    console.error('[chat.error]', e.message);
    audit(req.user.id, 'chat.error', e.message, req.ip);
    send({ type: 'error', error: friendlyError(e) });
  }
  res.end();
});

function friendlyError(e) {
  if (e.status === 401) return 'APIキーが無効です。管理者に連絡してください。';
  if (e.status === 429) return 'アクセスが集中しています。少し待ってから再試行してください。';
  if (e.status === 529) return 'AIサービスが混雑しています。少し待ってから再試行してください。';
  if (e.status === 403) return e.message;
  return 'エラーが発生しました。時間をおいて再試行してください。';
}

module.exports = router;
