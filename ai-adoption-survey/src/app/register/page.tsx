"use client";

import { useState } from "react";
import Link from "next/link";
import { INDUSTRIES, SIZE_BANDS } from "@/lib/constants";
import { NextSteps } from "@/components/NextSteps";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export default function RegisterPage() {
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [sizeBand, setSizeBand] = useState("");
  const [expected, setExpected] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [departmentsText, setDepartmentsText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [surveyUrl, setSurveyUrl] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const departments = departmentsText
      .split(/\n|、|,/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (departments.length === 0) {
      setError("部署を1つ以上入力してください");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: {
            name: companyName,
            industry,
            employee_size_band: sizeBand,
            expected_respondents: expected ? Number(expected) : null,
          },
          admin: { name: adminName, email, phone, password },
          departments,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました");
        return;
      }
      setSurveyUrl(data.survey_url);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  if (surveyUrl) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="text-center">
          <div className="text-5xl">🎉</div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            サーベイURLが発行されました
          </h1>
          <div className="mt-5 break-all rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm font-medium text-brand-800">
            {surveyUrl}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(surveyUrl);
              setCopied(true);
            }}
            className="mt-3 rounded-lg bg-brand-600 px-6 py-3 font-bold text-white hover:bg-brand-700"
          >
            {copied ? "コピーしました ✓" : "URLをコピー"}
          </button>
          <p className="mt-2 text-xs text-gray-400">
            このURLはログイン後の「部署・URL設定」ページでいつでも確認できます
          </p>
        </div>

        <h2 className="mt-10 text-center text-lg font-bold tracking-tight">
          次にやることは、この3つだけ
        </h2>
        <div className="mt-4">
          <NextSteps surveyUrl={surveyUrl} />
        </div>

        <div className="mt-8 rounded-2xl bg-gradient-to-br from-navy-950 to-brand-800 p-6 text-center text-white">
          <p className="text-sm font-bold">
            会社全体の診断結果は、ダッシュボードで
          </p>
          <p className="mt-1 text-xs text-white/60">
            登録したメールアドレスとパスワードでログインできます
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-xl bg-white px-8 py-3 font-bold text-brand-700 hover:bg-brand-50"
          >
            ダッシュボードへログイン →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <Link href="/" className="text-sm text-brand-600 hover:underline">
        ← トップへ戻る
      </Link>
      <h1 className="mt-4 text-2xl font-bold">無料診断のお申し込み</h1>
      <p className="mt-2 text-sm text-gray-600">
        ご登録後すぐに、社内展開用のサーベイURLが発行されます。
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <fieldset className="space-y-4">
          <legend className="font-bold text-gray-900">会社情報</legend>
          <div>
            <label htmlFor="companyName" className="mb-1 block text-sm font-medium">
              会社名 <span className="text-red-500">*</span>
            </label>
            <input id="companyName" required value={companyName}
              onChange={(e) => setCompanyName(e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="industry" className="mb-1 block text-sm font-medium">
                業種 <span className="text-red-500">*</span>
              </label>
              <select id="industry" required value={industry}
                onChange={(e) => setIndustry(e.target.value)} className={inputClass}>
                <option value="">選択してください</option>
                {INDUSTRIES.map((i) => (
                  <option key={i.code} value={i.code}>{i.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sizeBand" className="mb-1 block text-sm font-medium">
                従業員規模 <span className="text-red-500">*</span>
              </label>
              <select id="sizeBand" required value={sizeBand}
                onChange={(e) => setSizeBand(e.target.value)} className={inputClass}>
                <option value="">選択してください</option>
                {SIZE_BANDS.map((s) => (
                  <option key={s.code} value={s.code}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="expected" className="mb-1 block text-sm font-medium">
              回答してほしい人数(任意・回答率の表示に使います)
            </label>
            <input id="expected" type="number" min={1} value={expected}
              onChange={(e) => setExpected(e.target.value)} className={inputClass} />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="font-bold text-gray-900">部署リスト</legend>
          <div>
            <label htmlFor="departments" className="mb-1 block text-sm font-medium">
              部署名(改行またはカンマ区切り) <span className="text-red-500">*</span>
            </label>
            <textarea id="departments" required rows={4} value={departmentsText}
              onChange={(e) => setDepartmentsText(e.target.value)}
              placeholder={"営業部\n経理部\n開発部"} className={inputClass} />
            <p className="mt-1 text-xs text-gray-500">
              回答者は最初に自分の部署を選択します。後から追加・変更もできます。
            </p>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="font-bold text-gray-900">ご担当者情報</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="adminName" className="mb-1 block text-sm font-medium">
                氏名 <span className="text-red-500">*</span>
              </label>
              <input id="adminName" required value={adminName}
                onChange={(e) => setAdminName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium">
                電話番号(任意)
              </label>
              <input id="phone" type="tel" value={phone}
                onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input id="email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              パスワード(8文字以上・ダッシュボード閲覧用) <span className="text-red-500">*</span>
            </label>
            <input id="password" type="password" required minLength={8} value={password}
              onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <p className="text-xs text-gray-500">
          送信により
          <Link href="/privacy" className="text-brand-600 underline">
            プライバシーポリシー
          </Link>
          に同意したものとみなします。
        </p>

        <button type="submit" disabled={submitting}
          className="w-full rounded-xl bg-brand-600 py-4 text-lg font-bold text-white hover:bg-brand-700 disabled:opacity-50">
          {submitting ? "登録中..." : "登録してサーベイURLを発行する"}
        </button>
      </form>
    </main>
  );
}
