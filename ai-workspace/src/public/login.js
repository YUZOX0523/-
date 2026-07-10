// 初回起動（アカウント未作成）なら初期設定画面へ
fetch('/api/auth/setup-status').then((r) => r.json()).then((d) => {
  if (d.needs_setup) location.href = '/setup.html';
});

document.getElementById('showPw').addEventListener('change', (e) => {
  document.getElementById('password').type = e.target.checked ? 'text' : 'password';
});

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const err = document.getElementById('errorMsg');
  btn.disabled = true; err.textContent = '';
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'ログインに失敗しました');
    location.href = '/';
  } catch (e2) {
    err.textContent = e2.message;
    btn.disabled = false;
  }
});
