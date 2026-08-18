const express = require('express');
const { db, audit } = require('../db');
const { requireAdmin, hashPassword } = require('../auth');
const { budgetFor } = require('../claude');

const router = express.Router();
router.use(requireAdmin);

// ---- ユーザー管理 ----
router.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.email, u.name, u.role, u.active, u.monthly_budget_jpy, u.created_at,
           COALESCE((SELECT SUM(cost_jpy) FROM usage_log
                     WHERE user_id = u.id AND created_at >= date('now','start of month')), 0) AS used_jpy
    FROM users u ORDER BY u.id
  `).all();
  res.json(users.map((u) => ({ ...u, used_jpy: Math.round(u.used_jpy * 100) / 100, budget_jpy: budgetFor(u) })));
});

router.post('/users', (req, res) => {
  const { email, name, password, role } = req.body || {};
  if (!email || !name || !password) return res.status(400).json({ error: 'メール・氏名・パスワードは必須です' });
  if (String(password).length < 8) return res.status(400).json({ error: 'パスワードは8文字以上にしてください' });
  try {
    const info = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)')
      .run(String(email).toLowerCase().trim(), hashPassword(password), String(name).slice(0, 100),
           role === 'admin' ? 'admin' : 'user');
    audit(req.user.id, 'admin.user_create', email, req.ip);
    res.json({ id: info.lastInsertRowid });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'そのメールアドレスは既に登録されています' });
    throw e;
  }
});

router.patch('/users/:id', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });

  const { active, monthly_budget_jpy, password, role, name } = req.body || {};
  if (active !== undefined) {
    if (user.id === req.user.id && !active) return res.status(400).json({ error: '自分自身は無効化できません' });
    db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, user.id);
    if (!active) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  }
  if (monthly_budget_jpy !== undefined) {
    const v = monthly_budget_jpy === null ? null : Math.max(0, Number(monthly_budget_jpy));
    db.prepare('UPDATE users SET monthly_budget_jpy = ? WHERE id = ?').run(v, user.id);
  }
  if (password) {
    if (String(password).length < 8) return res.status(400).json({ error: 'パスワードは8文字以上にしてください' });
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), user.id);
  }
  if (role && ['user', 'admin'].includes(role)) {
    if (user.id === req.user.id && role !== 'admin') return res.status(400).json({ error: '自分自身の管理者権限は外せません' });
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, user.id);
  }
  if (name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(String(name).slice(0, 100), user.id);

  audit(req.user.id, 'admin.user_update', `id=${user.id} ${JSON.stringify(Object.keys(req.body || {}))}`, req.ip);
  res.json({ ok: true });
});

// ---- 利用状況ダッシュボード ----
router.get('/usage', (req, res) => {
  const summary = db.prepare(`
    SELECT COALESCE(SUM(cost_jpy),0) AS total_jpy, COUNT(*) AS requests,
           COALESCE(SUM(input_tokens),0) AS input_tokens, COALESCE(SUM(output_tokens),0) AS output_tokens
    FROM usage_log WHERE created_at >= date('now','start of month')
  `).get();
  const byModel = db.prepare(`
    SELECT model, COUNT(*) AS requests, COALESCE(SUM(cost_jpy),0) AS cost_jpy
    FROM usage_log WHERE created_at >= date('now','start of month')
    GROUP BY model ORDER BY cost_jpy DESC
  `).all();
  const byDay = db.prepare(`
    SELECT date(created_at) AS day, COALESCE(SUM(cost_jpy),0) AS cost_jpy, COUNT(*) AS requests
    FROM usage_log WHERE created_at >= date('now','-30 days')
    GROUP BY day ORDER BY day
  `).all();
  const activeUsers = db.prepare(`
    SELECT COUNT(DISTINCT user_id) AS c FROM usage_log WHERE created_at >= date('now','start of month')
  `).get().c;
  res.json({
    month: {
      total_jpy: Math.round(summary.total_jpy * 100) / 100,
      requests: summary.requests,
      input_tokens: summary.input_tokens,
      output_tokens: summary.output_tokens,
      active_users: activeUsers,
    },
    by_model: byModel.map((m) => ({ ...m, cost_jpy: Math.round(m.cost_jpy * 100) / 100 })),
    by_day: byDay.map((d) => ({ ...d, cost_jpy: Math.round(d.cost_jpy * 100) / 100 })),
  });
});

// ---- 監査ログ ----
router.get('/audit', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  const rows = db.prepare(`
    SELECT a.id, a.action, a.detail, a.ip, a.created_at, u.email
    FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.id DESC LIMIT ?
  `).all(limit);
  res.json(rows);
});

module.exports = router;
