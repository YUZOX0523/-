// ==== 状態 ====
let me = null;
let currentConv = null; // { id, title, mode }
let pendingFiles = [];  // { name, media_type, data }
let sending = false;
let availableModes = [];

// やりたいこと別の大ボタン（専門用語を出さない）
const CARDS = [
  { icon: '💬', name: '質問・相談する', desc: 'わからないことを何でも聞けます', mode: 'chat',
    hint: '話しかけるように入力してください。\n例：「エクセルで合計を出す方法を教えて」「この企画の良い点と心配な点を教えて」' },
  { icon: '✍️', name: '文章をつくる', desc: 'メール・案内文・お知らせなど', mode: 'chat',
    hint: '作りたい文章と相手を伝えてください。\n例：「取引先への値上げのお願いメールを、丁寧な言葉で作って」' },
  { icon: '📄', name: '資料を要約する', desc: 'PDFや文書を読んでまとめます', mode: 'docs',
    hint: '左下の 📎 ボタンで資料（PDFなど）を付けて、「要約して」と送ってください。\n「重要な点を3つにまとめて」のような頼み方もできます。' },
  { icon: '📊', name: 'データを分析する', desc: '売上表やアンケートの集計など', mode: 'docs',
    hint: '左下の 📎 ボタンでCSVやExcelから書き出したデータを付けて、「傾向を分析して」と送ってください。' },
  { icon: '💻', name: 'コードを書く・直す', desc: 'IT担当者向け', mode: 'code',
    hint: '作りたいものや直したいコードを貼り付けてください。\n例：「このマクロがエラーになる原因を教えて」' },
  { icon: '🔍', name: '高度な分析', desc: '複雑な検討・大量資料の分析', mode: 'advanced',
    hint: '時間がかかる複雑な分析に使います。資料を付けて、検討したい内容を詳しく書いてください。' },
];

// ==== 共通 ====
async function api(path, opts = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (res.status === 401) { location.href = '/login.html'; throw new Error('unauthorized'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'エラーが発生しました');
  return data;
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 最低限の読みやすさ変換（コードブロック・太字のみ）
function renderText(s) {
  let html = esc(s);
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => `<pre><code>${code}</code></pre>`);
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  return html;
}

// ==== ホーム ====
const homeView = document.getElementById('homeView');
const chatView = document.getElementById('chatView');

async function initHome() {
  me = await api('/api/auth/me');
  document.getElementById('userName').textContent = me.name + ' さん';
  if (me.role === 'admin') document.getElementById('adminLink').style.display = '';

  availableModes = await api('/api/modes');
  const enabled = new Set(availableModes.map((m) => m.key));
  const cardsEl = document.getElementById('cards');
  cardsEl.innerHTML = '';
  for (const c of CARDS) {
    if (!enabled.has(c.mode)) continue;
    const btn = document.createElement('button');
    btn.className = 'card-btn';
    btn.innerHTML = `<span class="icon">${c.icon}</span><span class="name">${c.name}</span><span class="desc">${c.desc}</span>`;
    btn.onclick = () => startConversation(c);
    cardsEl.appendChild(btn);
  }

  loadGauge();
  loadRecent();
}

async function loadGauge() {
  try {
    const { used, budget } = await api('/api/usage/me');
    const pct = budget > 0 ? Math.min(100, (used / budget) * 100) : 0;
    const fill = document.getElementById('gaugeFill');
    fill.style.width = pct + '%';
    fill.className = 'gauge-fill' + (pct >= 100 ? ' over' : pct >= 80 ? ' warn' : '');
    const label = pct >= 100 ? '今月の上限に達しました'
      : pct >= 80 ? '残りわずかです'
      : pct >= 50 ? 'まだ使えます'
      : 'じゅうぶん使えます';
    document.getElementById('gaugeText').textContent = label;
  } catch (e) { /* 表示だけの機能なので握りつぶす */ }
}

async function loadRecent() {
  const convs = await api('/api/conversations');
  const wrap = document.getElementById('recentWrap');
  const list = document.getElementById('recentList');
  list.innerHTML = '';
  if (!convs.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  const modeLabel = Object.fromEntries(availableModes.map((m) => [m.key, m.label]));
  for (const c of convs.slice(0, 8)) {
    const btn = document.createElement('button');
    btn.className = 'recent-item';
    btn.innerHTML = `<span class="mode-tag">${esc(modeLabel[c.mode] || '')}</span><span class="t">${esc(c.title)}</span>`;
    btn.onclick = () => openConversation(c.id);
    list.appendChild(btn);
  }
}

// ==== チャット ====
const chatInner = document.getElementById('chatInner');
const chatBody = document.getElementById('chatBody');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');

async function startConversation(card) {
  const conv = await api('/api/conversations', { method: 'POST', body: JSON.stringify({ mode: card.mode }) });
  currentConv = conv;
  showChat(card.name);
  chatInner.innerHTML = `<div class="hint-box">💡 ${esc(card.hint).replace(/\n/g, '<br>')}</div>`;
  msgInput.focus();
}

async function openConversation(id) {
  const conv = await api('/api/conversations/' + id);
  currentConv = conv;
  showChat(conv.title);
  chatInner.innerHTML = '';
  for (const m of conv.messages) addBubble(m.role === 'user' ? 'user' : 'ai', m.text, m.attachments);
  scrollBottom();
  msgInput.focus();
}

function showChat(title) {
  document.getElementById('chatTitle').textContent = title;
  homeView.style.display = 'none';
  chatView.style.display = '';
  pendingFiles = [];
  renderChips();
}

function backHome() {
  chatView.style.display = 'none';
  homeView.style.display = '';
  currentConv = null;
  loadGauge();
  loadRecent();
}

function addBubble(kind, text, attachments = []) {
  const row = document.createElement('div');
  row.className = 'msg ' + kind;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  let inner = '';
  for (const a of attachments || []) inner += `<span class="attach-tag">📎 ${esc(a)}</span>`;
  inner += renderText(text || '');
  bubble.innerHTML = inner;
  row.appendChild(bubble);
  chatInner.appendChild(row);
  return bubble;
}

function scrollBottom() { chatBody.scrollTop = chatBody.scrollHeight; }

async function send() {
  const text = msgInput.value.trim();
  if (!text || sending || !currentConv) return;
  sending = true;
  sendBtn.disabled = true;
  sendBtn.textContent = '送信中…';

  const files = pendingFiles;
  addBubble('user', text, files.map((f) => f.name));
  pendingFiles = [];
  renderChips();
  msgInput.value = '';
  autoGrow();

  const aiBubble = addBubble('ai', '');
  aiBubble.innerHTML = '<span class="thinking">考えています…</span>';
  scrollBottom();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: currentConv.id, text, files }),
    });
    if (res.status === 401) { location.href = '/login.html'; return; }
    if (!res.headers.get('content-type')?.includes('text/event-stream')) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'エラーが発生しました');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let fullText = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const ev = JSON.parse(line.slice(6));
        if (ev.type === 'delta') {
          fullText += ev.text;
          aiBubble.innerHTML = renderText(fullText);
          scrollBottom();
        } else if (ev.type === 'done') {
          if (ev.title && currentConv.title === '新しい会話') {
            currentConv.title = ev.title;
            document.getElementById('chatTitle').textContent = ev.title;
          }
        } else if (ev.type === 'error') {
          throw new Error(ev.error);
        }
      }
    }
    if (!fullText) aiBubble.innerHTML = '<span class="thinking">回答を取得できませんでした</span>';
  } catch (e) {
    aiBubble.innerHTML = `<span style="color:#d92d20">⚠️ ${esc(e.message)}</span>`;
  } finally {
    sending = false;
    sendBtn.disabled = false;
    sendBtn.textContent = '送信';
    scrollBottom();
  }
}

// ==== 添付ファイル ====
const fileInput = document.getElementById('fileInput');
document.getElementById('attachBtn').onclick = () => fileInput.click();

const EXT_TYPES = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', txt: 'text/plain', csv: 'text/csv', md: 'text/markdown', json: 'application/json' };

fileInput.addEventListener('change', async () => {
  for (const f of fileInput.files) {
    if (pendingFiles.length >= 5) { alert('付けられるファイルは5つまでです'); break; }
    if (f.size > 10 * 1024 * 1024) { alert(`${f.name} は大きすぎます（上限10MB）`); continue; }
    const ext = f.name.split('.').pop().toLowerCase();
    const type = f.type || EXT_TYPES[ext];
    if (!type) { alert(`${f.name} は対応していない形式です`); continue; }
    const data = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result.split(',')[1]);
      r.readAsDataURL(f);
    });
    pendingFiles.push({ name: f.name, media_type: type, data });
  }
  fileInput.value = '';
  renderChips();
});

function renderChips() {
  const el = document.getElementById('fileChips');
  el.innerHTML = '';
  pendingFiles.forEach((f, i) => {
    const chip = document.createElement('span');
    chip.className = 'file-chip';
    chip.innerHTML = `📎 ${esc(f.name)} <button title="外す">✕</button>`;
    chip.querySelector('button').onclick = () => { pendingFiles.splice(i, 1); renderChips(); };
    el.appendChild(chip);
  });
}

// ==== 入力欄 ====
function autoGrow() {
  msgInput.style.height = 'auto';
  msgInput.style.height = Math.min(msgInput.scrollHeight, 160) + 'px';
}
msgInput.addEventListener('input', autoGrow);
msgInput.addEventListener('keydown', (e) => {
  // Enterのみ=改行（誤送信防止）、Ctrl/Cmd+Enter=送信
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); }
});
sendBtn.onclick = send;
document.getElementById('backBtn').onclick = backHome;
document.getElementById('logoutBtn').onclick = async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.href = '/login.html';
};

initHome().catch(() => { location.href = '/login.html'; });
