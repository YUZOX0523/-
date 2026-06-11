"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("メールアドレスまたはパスワードが正しくありません");
      setSubmitting(false);
      return;
    }
    // 管理者なら管理画面へ、それ以外は企業ダッシュボードへ
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("user_id")
      .maybeSingle();
    const next = searchParams.get("next");
    router.push(next ?? (adminRow ? "/admin" : "/dashboard"));
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-center text-2xl font-bold">担当者ログイン</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            メールアドレス
          </label>
          <input id="email" type="email" required value={email} autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            パスワード
          </label>
          <input id="password" type="password" required value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}
          className="w-full rounded-xl bg-brand-600 py-3.5 font-bold text-white hover:bg-brand-700 disabled:opacity-50">
          {submitting ? "ログイン中..." : "ログイン"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-600">
        アカウントをお持ちでない方は{" "}
        <Link href="/register" className="font-medium text-brand-600 hover:underline">
          無料登録
        </Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
