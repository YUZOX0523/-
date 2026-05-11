'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DigiRiseLogoMark } from '@/components/DigiRiseLogo';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push('/');
    } else {
      setError('パスワードが正しくありません');
    }
    setLoading(false);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: 'linear-gradient(135deg, #0A0520 0%, #160835 40%, #0A1A40 100%)',
      }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7B3FFF, transparent)' }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #00D4FF, transparent)' }}
        />
      </div>

      <div className="relative bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <DigiRiseLogoMark size={44} />
          <div>
            <p className="font-bold text-gray-900 text-lg leading-none">DigiRise</p>
            <p className="text-gray-500 text-xs mt-0.5">AI活用組織診断 管理者画面</p>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">ログイン</h1>
        <p className="text-gray-500 text-sm mb-7">管理者パスワードを入力してください</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              autoFocus
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#7B3FFF] transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 px-4 py-3 rounded-xl border border-red-100">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: loading ? '#9B6FFF' : 'linear-gradient(135deg, #7B3FFF, #5B2FDF)' }}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-gray-400">
          Powered by DigiRise株式会社
        </p>
      </div>
    </div>
  );
}
