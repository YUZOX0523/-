const express = require('express');
const db = require('../db');

const router = express.Router();

// テンプレート一覧取得
router.get('/', (req, res) => {
  const templates = db.prepare('SELECT * FROM templates ORDER BY updated_at DESC').all();
  res.json(templates);
});

// テンプレート取得
router.get('/:id', (req, res) => {
  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id);
  if (!template) {
    return res.status(404).json({ error: 'テンプレートが見つかりません' });
  }
  res.json(template);
});

// テンプレート作成
router.post('/', (req, res) => {
  const { name, subject, body } = req.body;
  if (!name || !subject || !body) {
    return res.status(400).json({ error: 'テンプレート名、件名、本文は必須です' });
  }
  const result = db.prepare(
    'INSERT INTO templates (name, subject, body) VALUES (?, ?, ?)'
  ).run(name, subject, body);
  res.json({ id: result.lastInsertRowid, message: 'テンプレートを作成しました' });
});

// テンプレート更新
router.put('/:id', (req, res) => {
  const { name, subject, body } = req.body;
  db.prepare(
    "UPDATE templates SET name = ?, subject = ?, body = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
  ).run(name, subject, body, req.params.id);
  res.json({ message: 'テンプレートを更新しました' });
});

// テンプレート削除
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM templates WHERE id = ?').run(req.params.id);
  res.json({ message: 'テンプレートを削除しました' });
});

module.exports = router;
