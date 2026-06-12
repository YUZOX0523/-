"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_LABELS } from "@/lib/constants";

type QuestionRow = {
  id: string;
  category: string;
  text: string;
  scale_type: string;
  is_reversed: boolean;
  sort_order: number;
  version: number;
  is_active: boolean;
};

export default function AdminQuestionsPage() {
  const supabase = createClient();
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase
      .from("questions")
      .select("*")
      .order("version", { ascending: false })
      .order("sort_order")
      .then(({ data }) => setQuestions((data ?? []) as QuestionRow[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveQuestion(q: QuestionRow) {
    const { error } = await supabase
      .from("questions")
      .update({ text: q.text, is_active: q.is_active })
      .eq("id", q.id);
    setMessage(error ? "保存に失敗しました" : `Q${q.sort_order} を保存しました`);
  }

  function updateLocal(id: string, patch: Partial<QuestionRow>) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  return (
    <div>
      <h1 className="text-2xl font-black">設問管理</h1>
      <p className="mt-1 text-sm text-gray-500">
        設問はバージョン管理されています。過去回答はそのバージョンの設問に紐づきます。
        大幅な改訂時は旧設問を無効化し、新バージョンとして追加してください。
      </p>

      <div className="mt-6 space-y-3">
        {questions.map((q) => (
          <div key={q.id}
            className={`rounded-xl border bg-white p-4 ${q.is_active ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-brand-600">Q{q.sort_order}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                {CATEGORY_LABELS[q.category] ?? q.category}
              </span>
              <span className="text-gray-400">v{q.version}</span>
              {q.is_reversed && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                  逆転項目
                </span>
              )}
              {q.scale_type === "frequency" && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
                  頻度尺度
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input
                value={q.text}
                aria-label={`設問${q.sort_order}の本文`}
                onChange={(e) => updateLocal(q.id, { text: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={q.is_active}
                  onChange={(e) => updateLocal(q.id, { is_active: e.target.checked })}
                  className="h-4 w-4 accent-brand-600"
                />
                有効
              </label>
              <button onClick={() => saveQuestion(q)}
                className="text-xs font-bold text-brand-600 hover:underline">
                保存
              </button>
            </div>
          </div>
        ))}
      </div>

      {message && (
        <p role="status" className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
          {message}
        </p>
      )}
    </div>
  );
}
