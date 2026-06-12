"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AGE_BANDS,
  CATEGORIES,
  ROLE_BANDS,
  SCALE_LABELS,
} from "@/lib/constants";

type SurveyMeta = {
  company_name: string;
  departments: { id: string; name: string }[];
  questions: {
    id: string;
    category: string;
    text: string;
    scale_type: "agreement" | "frequency";
    sort_order: number;
  }[];
};

type SavedState = {
  step: number;
  departmentId: string;
  roleBand: string;
  ageBand: string;
  answers: Record<string, number>;
  freeText: string;
  consented: boolean;
};

export default function SurveyPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;
  const storageKey = `ai-survey-${token}`;

  const [meta, setMeta] = useState<SurveyMeta | null>(null);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState(0); // 0=同意 1=属性 2..7=カテゴリー 8=自由記述
  const [consented, setConsented] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [roleBand, setRoleBand] = useState("");
  const [ageBand, setAgeBand] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [freeText, setFreeText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const restored = useRef(false);

  useEffect(() => {
    fetch(`/api/survey/${token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error);
        setMeta(await res.json());
      })
      .catch((e) =>
        setLoadError(e.message ?? "サーベイ情報の取得に失敗しました")
      );
  }, [token]);

  // 途中離脱対策: LocalStorageからの復元と自動保存
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const s: SavedState = JSON.parse(saved);
        setStep(s.step ?? 0);
        setDepartmentId(s.departmentId ?? "");
        setRoleBand(s.roleBand ?? "");
        setAgeBand(s.ageBand ?? "");
        setAnswers(s.answers ?? {});
        setFreeText(s.freeText ?? "");
        setConsented(s.consented ?? false);
      }
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    if (!restored.current) return;
    const state: SavedState = {
      step, departmentId, roleBand, ageBand, answers, freeText, consented,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {}
  }, [step, departmentId, roleBand, ageBand, answers, freeText, consented, storageKey]);

  const categorySteps = useMemo(() => {
    if (!meta) return [];
    return CATEGORIES.map((c) => ({
      ...c,
      questions: meta.questions
        .filter((q) => q.category === c.key)
        .sort((a, b) => a.sort_order - b.sort_order),
    })).filter((c) => c.questions.length > 0);
  }, [meta]);

  const totalQuestions = meta?.questions.length ?? 0;
  const answeredCount = Object.keys(answers).length;
  const progress = totalQuestions
    ? Math.round((answeredCount / totalQuestions) * 100)
    : 0;
  const lastStep = 1 + categorySteps.length + 1; // 属性 + カテゴリー + 自由記述

  const goNext = useCallback(() => {
    setStep((s) => Math.min(s + 1, lastStep));
    window.scrollTo({ top: 0 });
  }, [lastStep]);
  const goBack = useCallback(() => {
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0 });
  }, []);

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/survey/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department_id: departmentId,
          role_band: roleBand || null,
          age_band: ageBand || null,
          answers,
          free_text: freeText || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "送信に失敗しました");
        setSubmitting(false);
        return;
      }
      localStorage.removeItem(storageKey);
      router.push(`/s/${token}/result/${data.response_id}`);
    } catch {
      setSubmitError("通信エラーが発生しました。再度お試しください");
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
        <p className="text-lg font-bold">このURLは現在ご利用いただけません</p>
        <p className="mt-2 text-sm text-gray-600">{loadError}</p>
      </main>
    );
  }
  if (!meta) {
    return (
      <main className="flex min-h-screen items-center justify-center text-gray-500">
        読み込み中...
      </main>
    );
  }

  const currentCategory =
    step >= 2 && step < 2 + categorySteps.length ? categorySteps[step - 2] : null;
  const categoryAnswered = currentCategory
    ? currentCategory.questions.every((q) => answers[q.id])
    : false;

  return (
    <main className="mx-auto min-h-screen max-w-xl px-4 pb-28 pt-6">
      {/* プログレスバー */}
      {step >= 1 && (
        <div className="sticky top-0 z-10 -mx-4 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{meta.company_name} AI活用レベル診断</span>
            <span>
              {answeredCount} / {totalQuestions} 問
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100"
          >
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Step 0: 同意 */}
      {step === 0 && (
        <section className="py-10 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/digirise-logo.png"
            alt="DigiRise"
            width={110}
            className="mx-auto mb-5"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/char-duo.png"
            alt="デジライズ公式キャラクター"
            width={150}
            className="mx-auto mb-2 rounded-2xl"
          />
          <p className="text-sm font-bold text-brand-600">{meta.company_name}</p>
          <h1 className="mt-2 text-2xl font-black">AI活用レベル診断</h1>
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            あなたとあなたの組織のAI活用度を診断します。
            <br />
            所要時間は5〜10分、回答は<strong>匿名</strong>です。
            <br />
            氏名・メールアドレスの入力は不要です。
          </p>
          <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-4 text-left text-sm">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-brand-600"
              />
              <span>
                回答内容が統計処理のうえ診断に利用されることに同意します(
                <Link href="/privacy" target="_blank" className="text-brand-600 underline">
                  プライバシーポリシー
                </Link>
                )
              </span>
            </label>
          </div>
          <button
            onClick={goNext}
            disabled={!consented}
            className="mt-6 w-full rounded-xl bg-brand-600 py-4 text-lg font-bold text-white hover:bg-brand-700 disabled:opacity-40"
          >
            診断をはじめる
          </button>
        </section>
      )}

      {/* Step 1: 属性 */}
      {step === 1 && (
        <section className="py-6">
          <h2 className="text-xl font-bold">あなたについて教えてください</h2>
          <div className="mt-6 space-y-6">
            <div>
              <label htmlFor="dept" className="mb-1 block text-sm font-medium">
                所属部署 <span className="text-red-500">*</span>
              </label>
              <select
                id="dept"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:border-brand-500 focus:outline-none"
              >
                <option value="">選択してください</option>
                {meta.departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">役職層(任意)</legend>
              <div className="grid grid-cols-3 gap-2">
                {ROLE_BANDS.map((r) => (
                  <button
                    type="button"
                    key={r.code}
                    onClick={() => setRoleBand(roleBand === r.code ? "" : r.code)}
                    aria-pressed={roleBand === r.code}
                    className={`rounded-lg border py-3 text-sm font-medium ${
                      roleBand === r.code
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-gray-300 text-gray-700"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">年代(任意)</legend>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {AGE_BANDS.map((a) => (
                  <button
                    type="button"
                    key={a.code}
                    onClick={() => setAgeBand(ageBand === a.code ? "" : a.code)}
                    aria-pressed={ageBand === a.code}
                    className={`rounded-lg border py-3 text-sm font-medium ${
                      ageBand === a.code
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-gray-300 text-gray-700"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </section>
      )}

      {/* Step 2..7: カテゴリー(1画面1カテゴリー) */}
      {currentCategory && (
        <section className="py-6">
          <p className="text-xs font-bold text-brand-600">
            カテゴリー {step - 1} / {categorySteps.length}
          </p>
          <h2 className="mt-1 text-xl font-bold">{currentCategory.label}</h2>
          <div className="mt-6 space-y-8">
            {currentCategory.questions.map((q, qi) => {
              const labels = SCALE_LABELS[q.scale_type] ?? SCALE_LABELS.agreement;
              return (
                <fieldset key={q.id}>
                  <legend className="text-base font-medium leading-relaxed">
                    Q{q.sort_order}. {q.text}
                  </legend>
                  <div className="mt-3 grid grid-cols-5 gap-1.5" role="radiogroup">
                    {labels.map((label, i) => {
                      const value = i + 1;
                      const selected = answers[q.id] === value;
                      return (
                        <button
                          type="button"
                          key={value}
                          role="radio"
                          aria-checked={selected}
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, [q.id]: value }))
                          }
                          className={`flex min-h-[72px] flex-col items-center justify-center rounded-lg border px-1 py-2 ${
                            selected
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-gray-300 bg-white text-gray-600 hover:border-brand-300"
                          }`}
                        >
                          <span className="text-lg font-bold">{value}</span>
                          <span className="mt-0.5 text-center text-[10px] leading-tight">
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {qi < currentCategory.questions.length - 1 && (
                    <hr className="mt-8 border-gray-100" />
                  )}
                </fieldset>
              );
            })}
          </div>
        </section>
      )}

      {/* 最終Step: 自由記述 + 送信 */}
      {step === lastStep && (
        <section className="py-6">
          <h2 className="text-xl font-bold">最後に(任意)</h2>
          <label htmlFor="freeText" className="mt-4 block text-sm font-medium">
            AI活用に関して、現在の課題や困りごとがあればご記入ください
          </label>
          <textarea
            id="freeText"
            rows={5}
            maxLength={2000}
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="例: 使ってみたいが、何から始めればよいか分からない"
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-3 focus:border-brand-500 focus:outline-none"
          />
          {submitError && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {submitError}
            </p>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || answeredCount < totalQuestions}
            className="mt-6 w-full rounded-xl bg-brand-600 py-4 text-lg font-bold text-white hover:bg-brand-700 disabled:opacity-40"
          >
            {submitting ? "送信中..." : "回答を送信して結果を見る"}
          </button>
          {answeredCount < totalQuestions && (
            <p className="mt-2 text-center text-xs text-red-500">
              未回答の設問があります(戻って確認してください)
            </p>
          )}
        </section>
      )}

      {/* フッターナビゲーション */}
      {step >= 1 && step < lastStep && (
        <div className="fixed inset-x-0 bottom-0 border-t border-gray-100 bg-white p-3">
          <div className="mx-auto flex max-w-xl gap-3">
            <button
              onClick={goBack}
              className="w-1/3 rounded-xl border border-gray-300 py-3.5 font-medium text-gray-600"
            >
              ← 戻る
            </button>
            <button
              onClick={goNext}
              disabled={step === 1 ? !departmentId : !categoryAnswered}
              className="w-2/3 rounded-xl bg-brand-600 py-3.5 font-bold text-white hover:bg-brand-700 disabled:opacity-40"
            >
              次へ →
            </button>
          </div>
        </div>
      )}
      {step === lastStep && (
        <div className="fixed inset-x-0 bottom-0 border-t border-gray-100 bg-white p-3 sm:static sm:border-0 sm:p-0">
          <div className="mx-auto max-w-xl">
            <button
              onClick={goBack}
              className="w-full rounded-xl border border-gray-300 py-3 font-medium text-gray-600 sm:mt-3"
            >
              ← 戻る
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
