async function api(path, opts = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (res.status === 401 || res.status === 403) { location.href = '/'; throw new Error('forbidden'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'エラー');
  return data;
}
const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// タブ切替
document.querySelectorAll('.admin-nav button').forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll('.admin-nav button').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    for (const t of ['usage','users','audit']) document.getElementById('tab-'+t).style.display = t === b.dataset.tab ? '' : 'none';
    load(b.dataset.tab);
  };
});

async function load(tab) {
  if (tab === 'usage') {
    const d = await api('/api/admin/usage');
    document.getElementById('statGrid').innerHTML = `
      <div class="stat"><div class="v">${d.month.total_jpy.toLocaleString()} 円</div><div class="k">今月のAPIコスト合計</div></div>
      <div class="stat"><div class="v">${d.month.active_users}</div><div class="k">今月の利用ユーザー数</div></div>
      <div class="stat"><div class="v">${d.month.requests.toLocaleString()}</div><div class="k">今月のリクエスト数</div></div>
      <div class="stat"><div class="v">${d.month.active_users ? Math.round(d.month.total_jpy / d.month.active_users).toLocaleString() : 0} 円</div><div class="k">1ユーザーあたり平均コスト</div></div>`;
    document.querySelector('#modelTable tbody').innerHTML = d.by_model.map((m) =>
      `<tr><td>${esc(m.model)}</td><td>${m.requests}</td><td>${m.cost_jpy.toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="3">まだ利用がありません</td></tr>';
    document.querySelector('#dayTable tbody').innerHTML = d.by_day.slice().reverse().map((x) =>
      `<tr><td>${esc(x.day)}</td><td>${x.requests}</td><td>${x.cost_jpy.toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="3">まだ利用がありません</td></tr>';
  }
  if (tab === 'users') {
    const users = await api('/api/admin/users');
    document.querySelector('#userTable tbody').innerHTML = users.map((u) => `
      <tr>
        <td>${esc(u.name)}</td><td>${esc(u.email)}</td>
        <td>${u.role === 'admin' ? '管理者' : '一般'}</td>
        <td><span class="pill ${u.active ? 'ok' : 'ng'}">${u.active ? '有効' : '停止中'}</span></td>
        <td>${u.used_jpy.toLocaleString()} 円 / ${u.budget_jpy.toLocaleString()} 円</td>
        <td><input type="number" value="${u.monthly_budget_jpy ?? ''}" placeholder="既定" style="width:90px;padding:6px;border:1px solid var(--border);border-radius:6px" data-budget="${u.id}"></td>
        <td>
          <button class="small-btn" data-save="${u.id}">上限保存</button>
          <button class="small-btn" data-toggle="${u.id}" data-next="${u.active ? 0 : 1}">${u.active ? '停止' : '再開'}</button>
        </td>
      </tr>`).join('');
    document.querySelectorAll('[data-save]').forEach((b) => b.onclick = async () => {
      const id = b.dataset.save;
      const v = document.querySelector(`[data-budget="${id}"]`).value;
      await api('/api/admin/users/' + id, { method: 'PATCH', body: JSON.stringify({ monthly_budget_jpy: v === '' ? null : Number(v) }) });
      load('users');
    });
    document.querySelectorAll('[data-toggle]').forEach((b) => b.onclick = async () => {
      await api('/api/admin/users/' + b.dataset.toggle, { method: 'PATCH', body: JSON.stringify({ active: b.dataset.next === '1' }) });
      load('users');
    });
  }
  if (tab === 'audit') {
    const rows = await api('/api/admin/audit');
    document.querySelector('#auditTable tbody').innerHTML = rows.map((r) => `
      <tr><td>${esc(r.created_at)}</td><td>${esc(r.email || '-')}</td><td>${esc(r.action)}</td><td>${esc(r.detail || '')}</td><td>${esc(r.ip || '')}</td></tr>`).join('');
  }
}

document.getElementById('nuAdd').onclick = async () => {
  const err = document.getElementById('nuError');
  err.textContent = '';
  try {
    await api('/api/admin/users', { method: 'POST', body: JSON.stringify({
      name: document.getElementById('nuName').value,
      email: document.getElementById('nuEmail').value,
      password: document.getElementById('nuPass').value,
    })});
    document.getElementById('nuName').value = document.getElementById('nuEmail').value = document.getElementById('nuPass').value = '';
    load('users');
  } catch (e) { err.textContent = e.message; }
};

load('usage');

document.getElementById('backToApp').onclick = () => { location.href = '/'; };
