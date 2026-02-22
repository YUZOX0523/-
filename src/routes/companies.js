const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const db = require('../db');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '..', '..', 'uploads') });

// 企業一覧取得
router.get('/', (req, res) => {
  const companies = db.prepare('SELECT * FROM companies ORDER BY created_at DESC').all();
  res.json(companies);
});

// 企業追加
router.post('/', (req, res) => {
  const { name, email, industry, contact_person, notes } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: '企業名とメールアドレスは必須です' });
  }
  const result = db.prepare(
    'INSERT INTO companies (name, email, industry, contact_person, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(name, email, industry || '', contact_person || '', notes || '');
  res.json({ id: result.lastInsertRowid, message: '企業を追加しました' });
});

// 企業削除
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
  res.json({ message: '企業を削除しました' });
});

// CSV一括インポート
router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSVファイルを選択してください' });
  }

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => {
      const name = row['企業名'] || row['name'] || row['company_name'] || '';
      const email = row['メールアドレス'] || row['email'] || row['mail'] || '';
      const industry = row['業種'] || row['industry'] || '';
      const contactPerson = row['担当者'] || row['contact_person'] || row['contact'] || '';
      const notes = row['備考'] || row['notes'] || '';

      if (name && email) {
        results.push({ name, email, industry, contactPerson, notes });
      }
    })
    .on('end', () => {
      const insert = db.prepare(
        'INSERT INTO companies (name, email, industry, contact_person, notes) VALUES (?, ?, ?, ?, ?)'
      );
      const insertMany = db.transaction((items) => {
        for (const item of items) {
          insert.run(item.name, item.email, item.industry, item.contactPerson, item.notes);
        }
      });
      insertMany(results);

      // アップロードファイル削除
      fs.unlink(req.file.path, () => {});

      res.json({ message: `${results.length}件の企業をインポートしました` });
    })
    .on('error', (err) => {
      res.status(500).json({ error: 'CSV読み込みエラー: ' + err.message });
    });
});

module.exports = router;
