'use client';

import { useState, useEffect } from 'react';

type Company = {
  id: number;
  name: string;
  contact_name: string | null;
  survey_token: string;
  results_token: string | null;
  created_at: string;
  response_count: number;
};

export default function AdminPage() {
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ token: string; resultsToken: string } | null>(null);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    setLoadingList(true);
    const res = await fetch('/api/companies');
    const data = await res.json();
    setCompanies(data.companies || []);
    setLoadingList(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, contactName, contactEmail }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || 'エラーが発生しました');
    } else {
      setResult(data);
      setName('');
      setContactName('');
      setContactEmail('');
      fetchCompanies();
    }
    setLoading(false);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert('コピーしました');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-violet-900">
      {/* Header */}
      <header className="px-6 py-5 flex items-center gap-3">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
          <span className="text-blue-800 font-black text-sm">AI</span>
        </div>
        <div>
          <p className="text-white font-bold text-lg leading-none">AI活用組織診断</p>
          <p className="text-blue-200 text-xs">by デジライズ</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="bg-blue-700 text-blue-100 text-xs px-3 py-1 rounded-full">管理者画面</span>
          <button
            onClick={async () => {
              await fetch('/api/admin/logout', { method: 'POST' });
              window.location.href = '/admin/login';
            }}
            className="text-blue-200 hover:text-white text-xs underline"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pb-16">
        {/* Create survey card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">診断リンクを発行する</h1>
          <p className="text-gray-500 text-sm mb-6">
            企業ごとに専用URLを発行します。対象社員にURLを共有するだけで診断を開始できます。
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                企業名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="株式会社〇〇"
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">担当者名</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="山田 太郎"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">担当者メール</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="yamada@example.com"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {loading ? '発行中...' : '診断リンクを発行する'}
            </button>
          </form>

          {result && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-5">
              <p className="text-blue-800 font-semibold mb-3">発行が完了しました！</p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    📋 回答URL <span className="text-gray-400">— 社員全員に共有するURL</span>
                  </p>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-white border border-blue-200 rounded px-3 py-2 text-sm text-blue-800 break-all">
                      {origin}/survey/{result.token}
                    </code>
                    <button
                      onClick={() => copyToClipboard(`${origin}/survey/${result.token}`)}
                      className="shrink-0 bg-blue-700 text-white text-xs px-3 rounded hover:bg-blue-800"
                    >
                      コピー
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    🔒 結果URL <span className="text-gray-400">— 企業担当者のみに共有するURL（回答URLとは別）</span>
                  </p>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-white border border-blue-200 rounded px-3 py-2 text-sm text-blue-800 break-all">
                      {origin}/results/{result.resultsToken}
                    </code>
                    <button
                      onClick={() => copyToClipboard(`${origin}/results/${result.resultsToken}`)}
                      className="shrink-0 bg-blue-700 text-white text-xs px-3 rounded hover:bg-blue-800"
                    >
                      コピー
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Company list */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800">発行済み一覧</h2>
            <button
              onClick={fetchCompanies}
              className="text-blue-600 text-sm hover:text-blue-800"
            >
              更新
            </button>
          </div>

          {loadingList ? (
            <p className="text-gray-400 text-sm">読み込み中...</p>
          ) : companies.length === 0 ? (
            <p className="text-gray-400 text-sm">まだ発行されていません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">企業名</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">担当者</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">回答数</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">発行日</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">リンク</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium">{c.name}</td>
                      <td className="py-3 px-3 text-gray-500">{c.contact_name || '-'}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.response_count > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {c.response_count}名
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-500">
                        {new Date(c.created_at).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex gap-2">
                          <a
                            href={`/survey/${c.survey_token}`}
                            target="_blank"
                            className="text-blue-600 hover:text-blue-800 text-xs underline"
                          >
                            回答URL
                          </a>
                          {c.results_token && (
                            <a
                              href={`/results/${c.results_token}`}
                              target="_blank"
                              className="text-violet-600 hover:text-violet-800 text-xs underline"
                            >
                              結果URL
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
