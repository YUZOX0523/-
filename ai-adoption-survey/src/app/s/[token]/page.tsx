"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AGE_BANDS,
  CATEGORIES,
  CATEGORY_DESCRIPTIONS,
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
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/digirise-logo.png" alt="DigiRise" width={120} />
        <p className="mt-6 text-lg font-bold">このURLは現在ご利用いただけません</p>
        <p className="mt-2 text-sm text-gray-600">{loadError}</p>
      </main>
    );
  }
  if (!meta) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white text-gray-400">
        読み込み中...
      </main>
    );
  }

  const currentCategory =
    step >= 2 && step < 2 + categorySteps.length ? categorySteps[step - 2] : null;
  const categoryAnswered = currentCategory
    ? currentCategory.questions.every((q) => answers[q.id])
    : false;
  const categoryIndex = step - 2;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white">
      {/* 上部ブランドライン */}
      <div className="h-1 w-full bg-gradient-to-r from-cyan2 via-brand-500 to-violet2" />

      <main className="mx-auto max-w-xl px-4 pb-32 pt-4">
        {/* ヘッダー(進捗) */}
        {step >= 1 && (
          <div className="sticky top-0 z-10 -mx-4 border-b border-gray-100 bg-white/95 px-4 pb-3 pt-3 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/digirise-logo.png" alt="DigiRise" width={78} />
                <span className="border-l border-gray-200 pl-2.5 text-[11px] font-semibold text-gray-500">
                  {meta.company_name}
                </span>
              </div>
              <span className="text-xs font-bold tabular-nums text-brand-700">
                {answeredCount}<span className="text-gray-400"> / {totalQuestions} 問</span>
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-gray-100"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan2 via-brand-500 to-violet2 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Step 0: 同意 */}
        {step === 0 && (
          <section className="py-8 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/digirise-logo.png" alt="DigiRise" width={120} className="mx-auto" />
            <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-card">
              <div className="relative bg-gradient-to-br from-navy-950 via-navy-800 to-brand-800 px-6 pb-8 pt-8 text-white">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-25 blur-3xl"
                  style={{ background: "radial-gradient(circle, #06b6d4, #6d28d9 70%, transparent)" }}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/char-duo.png"
                  alt="デジライズ公式キャラクター"
                  width={132}
                  className="relative mx-auto rounded-2xl shadow-lg"
                />
                <p className="relative mt-5 text-xs font-semibold tracking-wide text-cyan-200">
                  {meta.company_name}
                </p>
                <h1 className="relative mt-1 text-2xl font-extrabold tracking-tight">
                  AI活用レベル診断
                </h1>
                <p className="relative mt-3 text-sm leading-relaxed text-white/70">
                  あなたとあなたの組織のAI活用度を診断し、
                  <br />
                  全国平均と比較したレポートをその場でお届けします。
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    ["⏱", "5〜10分"],
                    ["🕶", "完全匿名"],
                    ["🔒", "個人情報不要"],
                  ].map(([icon, label]) => (
                    <div key={label} className="rounded-xl bg-slate-50 px-2 py-3">
                      <p className="text-lg">{icon}</p>
                      <p className="mt-1 text-[11px] font-bold text-gray-600">{label}</p>
                    </div>
                  ))}
                </div>
                <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left text-sm">
                  <input
                    type="checkbox"
                    checked={consented}
                    onChange={(e) => setConsented(e.target.checked)}
                    className="mt-0.5 h-5 w-5 accent-brand-600"
                  />
                  <span className="text-gray-600">
                    回答内容が統計処理のうえ診断に利用されることに同意します(
                    <Link href="/privacy" target="_blank" className="font-semibold text-brand-600 underline">
                      プライバシーポリシー
                    </Link>
                    )
                  </span>
                </label>
                <button
                  onClick={goNext}
                  disabled={!consented}
                  className="mt-5 w-full rounded-xl bg-gradient-to-r from-brand-500 to-violet2 py-4 text-lg font-bold tracking-wide text-white shadow-hero transition hover:opacity-90 disabled:opacity-30"
                >
                  診断をはじめる
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Step 1: 属性 */}
        {step === 1 && (
          <section className="py-6">
            <p className="text-xs font-bold tracking-widest text-brand-600">ABOUT YOU</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">
              あなたについて教えてください
            </h2>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-white p-5 shadow-card">
                <label htmlFor="dept" className="mb-2 block text-sm font-bold">
                  所属部署 <span className="text-flame">*</span>
                </label>
                <select
                  id="dept"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-slate-50 px-3 py-3.5 text-base focus:border-brand-500 focus:bg-white focus:outline-none"
                >
                  <option value="">選択してください</option>
                  {meta.departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <fieldset className="rounded-2xl bg-white p-5 shadow-card">
                <legend className="float-left mb-2 text-sm font-bold">役職層(任意)</legend>
                <div className="clear-both grid grid-cols-3 gap-2">
                  {ROLE_BANDS.map((r) => (
                    <button
                      type="button"
                      key={r.code}
                      onClick={() => setRoleBand(roleBand === r.code ? "" : r.code)}
                      aria-pressed={roleBand === r.code}
                      className={`rounded-xl border py-3 text-sm font-semibold transition ${
                        roleBand === r.code
                          ? "border-transparent bg-gradient-to-r from-brand-500 to-violet2 text-white shadow"
                          : "border-gray-200 bg-white text-gray-600 hover:border-brand-300"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="rounded-2xl bg-white p-5 shadow-card">
                <legend className="float-left mb-2 text-sm font-bold">年代(任意)</legend>
                <div className="clear-both grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {AGE_BANDS.map((a) => (
                    <button
                      type="button"
                      key={a.code}
                      onClick={() => setAgeBand(ageBand === a.code ? "" : a.code)}
                      aria-pressed={ageBand === a.code}
                      className={`rounded-xl border py-3 text-sm font-semibold transition ${
                        ageBand === a.code
                          ? "border-transparent bg-gradient-to-r from-brand-500 to-violet2 text-white shadow"
                          : "border-gray-200 bg-white text-gray-600 hover:border-brand-300"
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
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet2 text-sm font-bold text-white">
                {categoryIndex + 1}
                <span className="text-[9px] text-white/70">/{categorySteps.length}</span>
              </span>
              <div>
                <h2 className="text-lg font-bold tracking-tight">{currentCategory.label}</h2>
                <p className="text-[11px] text-gray-500">
                  {CATEGORY_DESCRIPTIONS[currentCategory.key]}
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {currentCategory.questions.map((q) => {
                const labels = SCALE_LABELS[q.scale_type] ?? SCALE_LABELS.agreement;
                const answered = !!answers[q.id];
                return (
                  <fieldset
                    key={q.id}
                    className={`rounded-2xl bg-white p-5 shadow-card transition ${
                      answered ? "ring-1 ring-brand-200" : ""
                    }`}
                  >
                    <legend className="float-left text-[15px] font-bold leading-relaxed">
                      <span className="mr-1.5 text-xs font-bold text-brand-500">
                        Q{q.sort_order}
                      </span>
                      {q.text}
                    </legend>
                    <div className="clear-both mt-4 grid grid-cols-5 gap-1.5" role="radiogroup">
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
                            className={`flex min-h-[76px] flex-col items-center justify-center rounded-xl border px-1 py-2 transition ${
                              selected
                                ? "border-transparent bg-gradient-to-b from-brand-500 to-brand-700 text-white shadow-md"
                                : "border-gray-200 bg-white text-gray-500 hover:border-brand-300 hover:bg-brand-50"
                            }`}
                          >
                            <span className="text-lg font-bold tabular-nums">{value}</span>
                            <span className="mt-1 text-center text-[10px] leading-tight">
                              {label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </section>
        )}

        {/* 最終Step: 自由記述 + 送信 */}
        {step === lastStep && (
          <section className="py-6">
            <p className="text-xs font-bold tracking-widest text-brand-600">LAST STEP</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">最後に(任意)</h2>
            <div className="mt-5 rounded-2xl bg-white p-5 shadow-card">
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/char-squirrel.png"
                  alt=""
                  width={56}
                  className="h-auto w-12 flex-none"
                />
                <label htmlFor="freeText" className="text-sm font-bold leading-relaxed">
                  AI活用に関して、現在の課題や困りごとがあればご記入ください
                  <span className="block text-[11px] font-normal text-gray-400">
                    ご回答は匿名のまま、社内の改善テーマとして活用されます
                  </span>
                </label>
              </div>
              <textarea
                id="freeText"
                rows={5}
                maxLength={2000}
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="例: 使ってみたいが、何から始めればよいか分からない"
                className="mt-3 w-full rounded-xl border border-gray-200 bg-slate-50 px-3 py-3 focus:border-brand-500 focus:bg-white focus:outline-none"
              />
            </div>
            {submitError && (
              <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting || answeredCount < totalQuestions}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-brand-500 to-violet2 py-4 text-lg font-bold tracking-wide text-white shadow-hero transition hover:opacity-90 disabled:opacity-30"
            >
              {submitting ? "送信中..." : "回答を送信して結果を見る"}
            </button>
            {answeredCount < totalQuestions && (
              <p className="mt-2 text-center text-xs font-semibold text-flame">
                未回答の設問があります(戻って確認してください)
              </p>
            )}
          </section>
        )}

        {/* フッターナビゲーション */}
        {step >= 1 && step < lastStep && (
          <div className="fixed inset-x-0 bottom-0 border-t border-gray-100 bg-white/95 p-3 backdrop-blur">
            <div className="mx-auto flex max-w-xl gap-3">
              <button
                onClick={goBack}
                className="w-1/3 rounded-xl border border-gray-200 bg-white py-3.5 font-semibold text-gray-500 transition hover:bg-gray-50"
              >
                ← 戻る
              </button>
              <button
                onClick={goNext}
                disabled={step === 1 ? !departmentId : !categoryAnswered}
                className="w-2/3 rounded-xl bg-gradient-to-r from-brand-500 to-violet2 py-3.5 font-bold tracking-wide text-white shadow-md transition hover:opacity-90 disabled:opacity-30"
              >
                次へ →
              </button>
            </div>
          </div>
        )}
        {step === lastStep && (
          <div className="fixed inset-x-0 bottom-0 border-t border-gray-100 bg-white/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
            <div className="mx-auto max-w-xl">
              <button
                onClick={goBack}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 font-semibold text-gray-500 hover:bg-gray-50 sm:mt-3"
              >
                ← 戻る
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
