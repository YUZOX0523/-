// 初期設定が不要（すでにアカウントがある）ならログイン画面へ
fetch('/api/auth/setup-status').then((r) => r.json()).then((d) => {
  if (!d.needs_setup) location.href = '/login.html';
});

// パスワードを見えるようにするチェックボックス
document.getElementById('showPw').addEventListener('change', (e) => {
  const type = e.target.checked ? 'text' : 'password';
  document.getElementById('password').type = type;
  document.getElementById('password2').type = type;
});

document.getElementById('setupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('setupBtn');
  const err = document.getElementById('errorMsg');
  err.textContent = '';
  const password = document.getElementById('password').value;
  if (/[^\x21-\x7E]/.test(password)) {
    err.textContent = 'パスワードに全角文字または空白が入っています。日本語入力をオフ（半角英数）にして入力し直してください';
    return;
  }
  if (password !== document.getElementById('password2').value) {
    err.textContent = 'パスワードが一致しません。同じものを2回入力してください';
    return;
  }
  btn.disabled = true;
  try {
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        password,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '設定に失敗しました');
    location.href = '/';
  } catch (e2) {
    err.textContent = e2.message;
    btn.disabled = false;
  }
});
