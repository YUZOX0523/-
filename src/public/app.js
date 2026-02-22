// ===== ユーティリティ =====
async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function statusBadge(status) {
  const map = { success: '成功', failed: '失敗', pending: '送信中' };
  return `<span class="badge badge-${status}">${map[status] || status}</span>`;
}

// ===== タブ切り替え =====
function showTab(name) {
  document.querySelectorAll('[id^="tab-"]').forEach((el) => el.classList.add('hidden'));
  document.getElementById('tab-' + name).classList.remove('hidden');
  document.querySelectorAll('.nav button').forEach((btn) => btn.classList.remove('active'));
  event.target.classList.add('active');

  if (name === 'dashboard') loadDashboard();
  if (name === 'companies') loadCompanies();
  if (name === 'templates') loadTemplates();
  if (name === 'send') loadSendPage();
  if (name === 'logs') loadLogs();
}

// ===== ダッシュボード =====
async function loadDashboard() {
  const stats = await api('/api/send/stats');
  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-success').textContent = stats.success;
  document.getElementById('stat-failed').textContent = stats.failed;

  const logs = await api('/api/send/logs');
  const tbody = document.getElementById('recent-logs');
  tbody.innerHTML = logs.slice(0, 10).map((log) => `
    <tr>
      <td>${log.sent_at}</td>
      <td>${escapeHtml(log.company_name)}</td>
      <td>${escapeHtml(log.email)}</td>
      <td>${escapeHtml(log.subject)}</td>
      <td>${statusBadge(log.status)}</td>
    </tr>
  `).join('');
}

// ===== 企業管理 =====
async function loadCompanies() {
  const companies = await api('/api/companies');
  const tbody = document.getElementById('companies-list');
  tbody.innerHTML = companies.map((c) => `
    <tr>
      <td>${c.id}</td>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.email)}</td>
      <td>${escapeHtml(c.industry)}</td>
      <td>${escapeHtml(c.contact_person)}</td>
      <td><button class="btn btn-sm btn-danger" onclick="deleteCompany(${c.id})">削除</button></td>
    </tr>
  `).join('');
}

document.getElementById('add-company-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    name: document.getElementById('c-name').value,
    email: document.getElementById('c-email').value,
    industry: document.getElementById('c-industry').value,
    contact_person: document.getElementById('c-contact').value,
  };
  const result = await api('/api/companies', { method: 'POST', body: JSON.stringify(data) });
  toast(result.message || result.error);
  e.target.reset();
  loadCompanies();
});

document.getElementById('csv-import-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('csv-file');
  if (!fileInput.files[0]) return toast('CSVファイルを選択してください');
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  const res = await fetch('/api/companies/import', { method: 'POST', body: formData });
  const result = await res.json();
  toast(result.message || result.error);
  fileInput.value = '';
  loadCompanies();
});

async function deleteCompany(id) {
  if (!confirm('この企業を削除しますか？')) return;
  const result = await api(`/api/companies/${id}`, { method: 'DELETE' });
  toast(result.message);
  loadCompanies();
}

// ===== テンプレート管理 =====
async function loadTemplates() {
  const templates = await api('/api/templates');
  const tbody = document.getElementById('templates-list');
  tbody.innerHTML = templates.map((t) => `
    <tr>
      <td>${t.id}</td>
      <td>${escapeHtml(t.name)}</td>
      <td>${escapeHtml(t.subject)}</td>
      <td>${t.updated_at}</td>
      <td><button class="btn btn-sm btn-danger" onclick="deleteTemplate(${t.id})">削除</button></td>
    </tr>
  `).join('');
}

document.getElementById('add-template-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    name: document.getElementById('t-name').value,
    subject: document.getElementById('t-subject').value,
    body: document.getElementById('t-body').value,
  };
  const result = await api('/api/templates', { method: 'POST', body: JSON.stringify(data) });
  toast(result.message || result.error);
  e.target.reset();
  loadTemplates();
});

async function deleteTemplate(id) {
  if (!confirm('このテンプレートを削除しますか？')) return;
  const result = await api(`/api/templates/${id}`, { method: 'DELETE' });
  toast(result.message);
  loadTemplates();
}

// ===== メール送信 =====
async function loadSendPage() {
  const templates = await api('/api/templates');
  const select = document.getElementById('send-template');
  select.innerHTML = templates.map((t) =>
    `<option value="${t.id}">${escapeHtml(t.name)} - ${escapeHtml(t.subject)}</option>`
  ).join('');

  const companies = await api('/api/companies');
  const tbody = document.getElementById('send-companies-list');
  tbody.innerHTML = companies.map((c) => `
    <tr>
      <td class="checkbox-cell"><input type="checkbox" class="company-cb" value="${c.id}"></td>
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.email)}</td>
      <td>${escapeHtml(c.industry)}</td>
    </tr>
  `).join('');
}

function selectAllCompanies() {
  document.querySelectorAll('.company-cb').forEach((cb) => (cb.checked = true));
  document.getElementById('select-all-cb').checked = true;
}

function deselectAllCompanies() {
  document.querySelectorAll('.company-cb').forEach((cb) => (cb.checked = false));
  document.getElementById('select-all-cb').checked = false;
}

function toggleAllCompanies(el) {
  document.querySelectorAll('.company-cb').forEach((cb) => (cb.checked = el.checked));
}

document.getElementById('send-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const templateId = parseInt(document.getElementById('send-template').value);
  const companyIds = [...document.querySelectorAll('.company-cb:checked')].map((cb) => parseInt(cb.value));

  if (!companyIds.length) return toast('送信先企業を選択してください');
  if (!confirm(`${companyIds.length}社にメールを送信します。よろしいですか？`)) return;

  const btn = document.getElementById('send-btn');
  btn.disabled = true;
  btn.textContent = '送信中...';

  const result = await api('/api/send', {
    method: 'POST',
    body: JSON.stringify({ template_id: templateId, company_ids: companyIds }),
  });

  btn.disabled = false;
  btn.textContent = '送信開始';

  const resultDiv = document.getElementById('send-result');
  resultDiv.classList.remove('hidden');

  if (result.results) {
    resultDiv.innerHTML = `
      <p><strong>${result.message}</strong></p>
      <table>
        <thead><tr><th>企業名</th><th>メール</th><th>結果</th><th>エラー</th></tr></thead>
        <tbody>
          ${result.results.map((r) => `
            <tr>
              <td>${escapeHtml(r.company)}</td>
              <td>${escapeHtml(r.email)}</td>
              <td>${statusBadge(r.status)}</td>
              <td>${escapeHtml(r.errorMessage)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else {
    resultDiv.innerHTML = `<p style="color:red">${escapeHtml(result.error)}</p>`;
  }
});

// ===== 送信ログ =====
async function loadLogs() {
  const logs = await api('/api/send/logs');
  const tbody = document.getElementById('logs-list');
  tbody.innerHTML = logs.map((log) => `
    <tr>
      <td>${log.sent_at}</td>
      <td>${escapeHtml(log.company_name)}</td>
      <td>${escapeHtml(log.email)}</td>
      <td>${escapeHtml(log.subject)}</td>
      <td>${statusBadge(log.status)}</td>
      <td>${escapeHtml(log.error_message)}</td>
    </tr>
  `).join('');
}

// ===== XSS対策 =====
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== 初期読み込み =====
loadDashboard();
