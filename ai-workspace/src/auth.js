const crypto = require('crypto');
const { db, audit } = require('./db');

const SESSION_TTL_HOURS = 12;

// ---- パスワードハッシュ（scrypt: Node標準・依存なし） ----
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored).split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

// ---- ログイン試行のレート制限（IPごと・メモリ内） ----
const attempts = new Map(); // ip -> { count, resetAt }
function loginRateLimited(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 10; // 10分間に10回まで
}

// ---- セッション ----
function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare(`INSERT INTO sessions (token, user_id, expires_at)
              VALUES (?, ?, datetime('now', '+${SESSION_TTL_HOURS} hours'))`).run(token, userId);
  return token;
}

function destroySession(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function getSessionUser(token) {
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now') AND u.active = 1
  `).get(token);
  return row || null;
}

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

// ---- Expressミドルウェア ----
function requireAuth(req, res, next) {
  const user = getSessionUser(parseCookies(req).session);
  if (!user) return res.status(401).json({ error: 'ログインが必要です' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: '管理者権限が必要です' });
    next();
  });
}

// ---- ルーター ----
function authRoutes(express) {
  const router = express.Router();

  router.post('/login', (req, res) => {
    const ip = req.ip;
    if (loginRateLimited(ip)) {
      audit(null, 'login.rate_limited', null, ip);
      return res.status(429).json({ error: 'ログイン試行回数が多すぎます。しばらく待ってから再試行してください' });
    }
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'メールアドレスとパスワードを入力してください' });

    const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(String(email).toLowerCase().trim());
    if (!user || !verifyPassword(password, user.password_hash)) {
      audit(null, 'login.failed', email, ip);
      return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
    }

    const token = createSession(user.id);
    audit(user.id, 'login.success', null, ip);
    res.setHeader('Set-Cookie',
      `session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_HOURS * 3600}${req.secure ? '; Secure' : ''}`);
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  });

  router.post('/logout', (req, res) => {
    const token = parseCookies(req).session;
    if (token) {
      const user = getSessionUser(token);
      destroySession(token);
      if (user) audit(user.id, 'logout', null, req.ip);
    }
    res.setHeader('Set-Cookie', 'session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    res.json({ ok: true });
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({ id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role });
  });

  return router;
}

// 初回起動時の管理者作成
function ensureAdmin() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) return;
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn('[warn] ユーザーが存在しません。.env に ADMIN_EMAIL / ADMIN_PASSWORD を設定して再起動すると管理者が作成されます。');
    return;
  }
  db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)')
    .run(email, hashPassword(password), process.env.ADMIN_NAME || '管理者', 'admin');
  console.log(`[init] 管理者アカウントを作成しました: ${email}`);
}

module.exports = { hashPassword, verifyPassword, requireAuth, requireAdmin, authRoutes, ensureAdmin };
