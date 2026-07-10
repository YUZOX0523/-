require('dotenv').config();
const express = require('express');
const path = require('path');
const { ensureAdmin, authRoutes } = require('./auth');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '15mb' })); // 添付ファイル(base64)を含むため

// セキュリティヘッダー
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'");
  next();
});

app.use('/api/auth', authRoutes(express));
app.use('/api', require('./routes/chat'));
app.use('/api/admin', require('./routes/admin'));

// no-cache: 使う前に必ずサーバーへ更新確認させる（アップデート後に古い画面が残るのを防ぐ）
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache'),
}));

// APIのエラーハンドラ
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: 'サーバーエラーが発生しました' });
});

ensureAdmin();

const PORT = Number(process.env.PORT || 3100);
app.listen(PORT, () => {
  console.log(`DigiRise AI Workspace: http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[warn] ANTHROPIC_API_KEY が未設定です。チャット機能は動作しません。');
  }
});
