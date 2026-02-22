const express = require('express');
const db = require('../db');
const { sendBulk } = require('../mailer');

const router = express.Router();

// 一括送信
router.post('/', async (req, res) => {
  const { template_id, company_ids } = req.body;

  if (!template_id || !company_ids || !company_ids.length) {
    return res.status(400).json({ error: 'テンプレートと送信先企業を選択してください' });
  }

  const template = db.prepare('SELECT * FROM templates WHERE id = ?').get(template_id);
  if (!template) {
    return res.status(404).json({ error: 'テンプレートが見つかりません' });
  }

  const placeholders = company_ids.map(() => '?').join(',');
  const companies = db.prepare(`SELECT * FROM companies WHERE id IN (${placeholders})`).all(...company_ids);

  if (!companies.length) {
    return res.status(404).json({ error: '送信先企業が見つかりません' });
  }

  try {
    const results = await sendBulk(companies, template, db);
    const successCount = results.filter((r) => r.status === 'success').length;
    const failCount = results.filter((r) => r.status === 'failed').length;
    res.json({
      message: `送信完了: 成功 ${successCount}件, 失敗 ${failCount}件`,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: '送信エラー: ' + err.message });
  }
});

// 送信ログ取得
router.get('/logs', (req, res) => {
  const logs = db.prepare('SELECT * FROM send_logs ORDER BY sent_at DESC LIMIT 500').all();
  res.json(logs);
});

// 送信ログ統計
router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM send_logs').get();
  const success = db.prepare("SELECT COUNT(*) as count FROM send_logs WHERE status = 'success'").get();
  const failed = db.prepare("SELECT COUNT(*) as count FROM send_logs WHERE status = 'failed'").get();
  res.json({
    total: total.count,
    success: success.count,
    failed: failed.count,
  });
});

module.exports = router;
