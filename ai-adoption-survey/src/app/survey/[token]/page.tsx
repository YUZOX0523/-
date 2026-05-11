'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CATEGORIES, QUESTIONS, SCORE_OPTIONS } from '@/lib/questions';
import { DigiRiseLogoMark } from '@/components/DigiRiseLogo';

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
      body: JSON.stringify({ respondentName, respondentDepartment, respondentRole, answers }),
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F8F7FF' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-t-2 animate-spin"
            style={{ borderColor: '#E5E7EB', borderTopColor: '#7B3FFF' }}
          />
          <p className="text-gray-400 text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 font-medium">このURLは無効です</p>
          <p className="text-gray-400 text-sm mt-2">リンクをご確認ください</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8F7FF' }}>
      {/* Sticky header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <DigiRiseLogoMark size={28} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 leading-none">AI活用組織診断</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{companyName}</p>
          </div>
          <span className="text-xs font-bold" style={{ color: '#7B3FFF' }}>{progressPct}%</span>
        </div>
        <div className="h-1 bg-gray-100">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #7B3FFF, #00D4FF)' }}
          />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">

        {/* ── Intro ── */}
        {step === 'intro' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full mb-5"
                style={{ background: '#7B3FFF15', color: '#7B3FFF' }}
              >
                {companyName} 様 専用
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-3">AI活用組織診断</h1>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                貴社のAI活用レベルを5つの観点から評価し、具体的な課題と改善施策をご提供します。
                所要時間は約<strong className="text-gray-700">5〜10分</strong>です。
              </p>

              <div className="rounded-xl p-4 mb-6 space-y-3" style={{ background: '#F8F7FF' }}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">診断する5つの観点</p>
                {CATEGORIES.map((cat, i) => (
                  <div key={cat.id} className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: cat.color }}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{cat.name}</p>
                      <p className="text-xs text-gray-400">{cat.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-6">
                <p className="text-sm font-semibold text-gray-700 mb-4">
                  回答者情報
                  <span className="ml-2 text-xs font-normal text-gray-400">任意</span>
                </p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">お名前</label>
                    <input
                      type="text"
                      value={respondentName}
                      onChange={(e) => setRespondentName(e.target.value)}
                      placeholder="山田 太郎"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#7B3FFF] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">部署</label>
                    <input
                      type="text"
                      value={respondentDepartment}
                      onChange={(e) => setRespondentDepartment(e.target.value)}
                      placeholder="営業部"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#7B3FFF] transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">役職</label>
                  <input
                    type="text"
                    value={respondentRole}
                    onChange={(e) => setRespondentRole(e.target.value)}
                    placeholder="一般社員 / 主任 / 課長 / 部長 など"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#7B3FFF] transition-colors"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('questions')}
              className="w-full text-white font-bold py-4 rounded-2xl text-base transition-all shadow-lg"
              style={{ background: 'linear-gradient(135deg, #7B3FFF, #00D4FF)' }}
            >
              診断を開始する →
            </button>
            <p className="text-center text-xs text-gray-400">全20問・選択式で回答するだけ</p>
          </div>
        )}

        {/* ── Questions ── */}
        {step === 'questions' && currentCategory && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                style={{ background: currentCategory.color }}
              >
                {categoryIndex + 1}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{currentCategory.name}</p>
                <p className="text-xs text-gray-400">カテゴリ {categoryIndex + 1}/{totalCategories} · {currentQuestions.length}問</p>
              </div>
              <div
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: `${currentCategory.color}15`, color: currentCategory.color }}
              >
                {answeredInCategory}/{currentQuestions.length}
              </div>
            </div>

            {currentQuestions.map((question, qi) => {
              const qNum = categoryIndex * 4 + qi + 1;
              const selected = answers[question.id];
              return (
                <div
                  key={question.id}
                  className="bg-white rounded-2xl shadow-sm border-2 transition-all"
                  style={{ borderColor: selected ? `${currentCategory.color}40` : '#f3f4f6' }}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-5">
                      <span
                        className="shrink-0 w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center mt-0.5"
                        style={
                          selected
                            ? { background: currentCategory.color, color: 'white' }
                            : { background: '#F3F4F6', color: '#9CA3AF' }
                        }
                      >
                        {qNum}
                      </span>
                      <p className="text-gray-800 font-medium leading-snug text-sm">{question.text}</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-gray-400 px-1">
                        <span>そう思わない</span>
                        <span>非常にそう思う</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {SCORE_OPTIONS.map((opt) => {
                          const isSelected = selected === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: opt.value }))}
                              className="flex flex-col items-center py-3 rounded-xl border-2 transition-all font-bold text-xl"
                              style={
                                isSelected
                                  ? { borderColor: currentCategory.color, background: `${currentCategory.color}15`, color: currentCategory.color }
                                  : { borderColor: '#E5E7EB', background: 'white', color: '#9CA3AF' }
                              }
                            >
                              {opt.value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  if (categoryIndex === 0) setStep('intro');
                  else setCategoryIndex((i) => i - 1);
                }}
                className="flex-1 border-2 border-gray-200 text-gray-600 font-semibold py-3.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                ← 戻る
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
                  className="flex-1 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-40"
                  style={{ background: categoryComplete ? currentCategory.color : '#D1D5DB' }}
                >
                  次へ ({categoryIndex + 2}/{totalCategories}) →
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
                  className="flex-1 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-40"
                  style={{ background: allAnswered ? 'linear-gradient(135deg, #7B3FFF, #00D4FF)' : '#D1D5DB' }}
                >
                  確認へ進む →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Confirm ── */}
        {step === 'confirm' && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">回答の確認</h2>
              <p className="text-gray-400 text-sm mb-6">全{QUESTIONS.length}問の回答が完了しました。</p>

              <div className="space-y-4">
                {CATEGORIES.map((cat, ci) => {
                  const qs = QUESTIONS.filter((q) => q.category === cat.id);
                  return (
                    <div key={cat.id} className="rounded-xl overflow-hidden border border-gray-100">
                      <div
                        className="px-4 py-2.5 text-white text-sm font-bold"
                        style={{ background: cat.color }}
                      >
                        {ci + 1}. {cat.name}
                      </div>
                      <div className="divide-y divide-gray-50">
                        {qs.map((q, qi) => (
                          <div key={q.id} className="px-4 py-3 flex items-center gap-3">
                            <span className="text-xs text-gray-300 w-5 shrink-0">{ci * 4 + qi + 1}</span>
                            <p className="flex-1 text-sm text-gray-600 leading-snug">{q.text}</p>
                            <div className="shrink-0 flex items-baseline gap-0.5">
                              <span className="font-black text-lg" style={{ color: cat.color }}>{answers[q.id]}</span>
                              <span className="text-xs text-gray-300">/5</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {submitError && (
                <p className="mt-4 text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">
                  {submitError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setCategoryIndex(totalCategories - 1); setStep('questions'); }}
                className="flex-1 border-2 border-gray-200 text-gray-600 font-semibold py-3.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                修正する
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #7B3FFF, #00D4FF)' }}
              >
                {submitting ? '送信中...' : '送信する ✓'}
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="py-5 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
        <DigiRiseLogoMark size={16} />
        Powered by DigiRise株式会社
      </footer>
    </div>
  );
}
