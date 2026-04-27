'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CATEGORIES, QUESTIONS, SCORE_OPTIONS } from '@/lib/questions';

type Step = 'intro' | 'questions' | 'confirm';

export default function SurveyPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [companyName, setCompanyName] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<Step>('intro');
  const [categoryIndex, setCategoryIndex] = useState(0);

  const [respondentName, setRespondentName] = useState('');
  const [respondentDepartment, setRespondentDepartment] = useState('');
  const [respondentRole, setRespondentRole] = useState('');
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    fetch(`/api/survey/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setNotFound(true);
        else setCompanyName(data.company.name);
        setLoading(false);
      });
  }, [token]);

  const currentCategory = CATEGORIES[categoryIndex];
  const currentQuestions = QUESTIONS.filter((q) => q.category === currentCategory?.id);
  const totalCategories = CATEGORIES.length;
  const answeredInCategory = currentQuestions.filter((q) => answers[q.id]).length;
  const categoryComplete = answeredInCategory === currentQuestions.length;

  const totalAnswered = QUESTIONS.filter((q) => answers[q.id]).length;
  const allAnswered = totalAnswered === QUESTIONS.length;

  const progressPct =
    step === 'intro'
      ? 0
      : step === 'confirm'
      ? 100
      : Math.round(((categoryIndex * 4 + answeredInCategory) / QUESTIONS.length) * 100);

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError('');

    const res = await fetch(`/api/survey/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        respondentName,
        respondentDepartment,
        respondentRole,
        answers,
      }),
    });

    if (res.ok) {
      router.push(`/survey/${token}/complete`);
    } else {
      const data = await res.json();
      setSubmitError(data.error || '送信に失敗しました');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 font-medium">このURLは無効です</p>
          <p className="text-gray-500 text-sm mt-2">リンクをご確認ください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 bg-blue-800 rounded-md flex items-center justify-center">
            <span className="text-white font-black text-xs">AI</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">AI活用組織診断</p>
            <p className="text-xs text-gray-400">{companyName}</p>
          </div>
          <span className="text-xs text-gray-400">{progressPct}%</span>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* Intro step */}
        {step === 'intro' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                {companyName} 様 専用
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">AI活用組織診断</h1>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                本診断は、貴社のAI活用レベルを5つの観点から評価し、
                具体的な課題と改善施策をご提供するものです。
                所要時間は約<strong>5〜10分</strong>です。
              </p>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-xs font-semibold text-gray-700 mb-3">診断する5つの観点</p>
                <div className="space-y-2">
                  {CATEGORIES.map((cat, i) => (
                    <div key={cat.id} className="flex items-start gap-3">
                      <span
                        className="w-5 h-5 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: cat.color }}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{cat.name}</p>
                        <p className="text-xs text-gray-500">{cat.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <p className="text-sm font-medium text-gray-700 mb-4">
                  回答者情報（任意）
                </p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">お名前</label>
                    <input
                      type="text"
                      value={respondentName}
                      onChange={(e) => setRespondentName(e.target.value)}
                      placeholder="山田 太郎"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">部署</label>
                    <input
                      type="text"
                      value={respondentDepartment}
                      onChange={(e) => setRespondentDepartment(e.target.value)}
                      placeholder="営業部"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">役職</label>
                  <input
                    type="text"
                    value={respondentRole}
                    onChange={(e) => setRespondentRole(e.target.value)}
                    placeholder="一般社員 / 主任 / 課長 / 部長 など"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('questions')}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-4 rounded-xl text-lg transition-colors shadow-lg"
            >
              診断を開始する
            </button>
            <p className="text-center text-xs text-gray-400">
              全20問・選択式で回答するだけです
            </p>
          </div>
        )}

        {/* Questions step */}
        {step === 'questions' && currentCategory && (
          <div className="space-y-6">
            {/* Category header */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: currentCategory.color }}
              >
                {categoryIndex + 1}
              </div>
              <div>
                <p className="font-bold text-gray-900">{currentCategory.name}</p>
                <p className="text-xs text-gray-500">
                  カテゴリ {categoryIndex + 1}/{totalCategories} ·{' '}
                  {currentQuestions.length}問
                </p>
              </div>
            </div>

            {/* Questions */}
            {currentQuestions.map((question, qi) => {
              const qNum = categoryIndex * 4 + qi + 1;
              return (
                <div
                  key={question.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <span className="shrink-0 w-6 h-6 bg-gray-100 text-gray-600 text-xs font-bold rounded-full flex items-center justify-center mt-0.5">
                      {qNum}
                    </span>
                    <p className="text-gray-800 font-medium leading-snug">{question.text}</p>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {SCORE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [question.id]: opt.value }))
                        }
                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 transition-all text-xs font-medium ${
                          answers[question.id] === opt.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-lg leading-none">{opt.value}</span>
                        <span className="text-center leading-tight" style={{ fontSize: '9px' }}>
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Navigation */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (categoryIndex === 0) setStep('intro');
                  else setCategoryIndex((i) => i - 1);
                }}
                className="flex-1 border border-gray-300 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                戻る
              </button>
              {categoryIndex < totalCategories - 1 ? (
                <button
                  onClick={() => {
                    if (!categoryComplete) {
                      alert('このカテゴリの全問に回答してから次へ進んでください');
                      return;
                    }
                    setCategoryIndex((i) => i + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={!categoryComplete}
                  className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  次へ ({categoryIndex + 2}/{totalCategories})
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (!allAnswered) {
                      alert('全問に回答してから確認へ進んでください');
                      return;
                    }
                    setStep('confirm');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={!allAnswered}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  確認へ進む
                </button>
              )}
            </div>
          </div>
        )}

        {/* Confirm step */}
        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-2">回答の確認</h2>
              <p className="text-gray-500 text-sm mb-6">
                全{QUESTIONS.length}問の回答が完了しました。
                内容を確認して送信してください。
              </p>

              <div className="space-y-4">
                {CATEGORIES.map((cat, ci) => {
                  const qs = QUESTIONS.filter((q) => q.category === cat.id);
                  return (
                    <div key={cat.id} className="border border-gray-100 rounded-xl overflow-hidden">
                      <div
                        className="px-4 py-2 text-white text-sm font-semibold flex items-center gap-2"
                        style={{ backgroundColor: cat.color }}
                      >
                        <span>{ci + 1}.</span>
                        <span>{cat.name}</span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {qs.map((q, qi) => (
                          <div key={q.id} className="px-4 py-3 flex items-center gap-3">
                            <span className="text-xs text-gray-400 w-4 shrink-0">{ci * 4 + qi + 1}</span>
                            <p className="flex-1 text-sm text-gray-700 leading-snug">{q.text}</p>
                            <div className="shrink-0">
                              <span className="font-bold text-blue-700">{answers[q.id]}</span>
                              <span className="text-xs text-gray-400 ml-1">/ 5</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {submitError && (
                <p className="mt-4 text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">
                  {submitError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCategoryIndex(totalCategories - 1);
                  setStep('questions');
                }}
                className="flex-1 border border-gray-300 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                修正する
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {submitting ? '送信中...' : '送信する'}
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="py-4 text-center text-xs text-gray-400">
        Powered by デジライズ株式会社
      </footer>
    </div>
  );
}
