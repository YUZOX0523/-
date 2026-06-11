"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Department = { id: string; name: string; sort_order: number };

export default function SetupPage() {
  const supabase = createClient();
  const [companyId, setCompanyId] = useState("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newDept, setNewDept] = useState("");
  const [surveyUrl, setSurveyUrl] = useState("");
  const [expected, setExpected] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: ca } = await supabase
        .from("company_admins")
        .select("company_id, companies(expected_respondents)")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!ca) return;
      setCompanyId(ca.company_id);
      const c = Array.isArray(ca.companies) ? ca.companies[0] : ca.companies;
      if (c?.expected_respondents) setExpected(String(c.expected_respondents));

      const [{ data: depts }, { data: link }] = await Promise.all([
        supabase
          .from("departments")
          .select("id, name, sort_order")
          .eq("company_id", ca.company_id)
          .order("sort_order"),
        supabase
          .from("survey_links")
          .select("token")
          .eq("company_id", ca.company_id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle(),
      ]);
      setDepartments(depts ?? []);
      if (link) {
        setSurveyUrl(`${window.location.origin}/s/${link.token}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addDepartment() {
    const name = newDept.trim();
    if (!name || !companyId) return;
    const sortOrder = (departments[departments.length - 1]?.sort_order ?? 0) + 1;
    const { data, error } = await supabase
      .from("departments")
      .insert({ company_id: companyId, name, sort_order: sortOrder })
      .select()
      .single();
    if (error) {
      setMessage(
        error.code === "23505" ? "同名の部署が既にあります" : "追加に失敗しました"
      );
      return;
    }
    setDepartments((d) => [...d, data]);
    setNewDept("");
    setMessage("");
  }

  async function removeDepartment(id: string) {
    if (
      !confirm(
        "この部署を削除しますか?(回答がある部署は削除できません)"
      )
    )
      return;
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) {
      setMessage("削除できませんでした(既に回答がある部署は削除できません)");
      return;
    }
    setDepartments((d) => d.filter((x) => x.id !== id));
    setMessage("");
  }

  async function saveExpected() {
    if (!companyId) return;
    const value = expected ? Number(expected) : null;
    const { error } = await supabase
      .from("companies")
      .update({ expected_respondents: value })
      .eq("id", companyId);
    setMessage(error ? "保存に失敗しました" : "保存しました");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-black">部署・サーベイURL設定</h1>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="font-bold">サーベイURL</h2>
        <p className="mt-1 text-sm text-gray-500">
          このURLを社内チャットやメールで展開してください。回答は匿名です。
        </p>
        {surveyUrl ? (
          <>
            <div className="mt-3 break-all rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm font-medium text-brand-800">
              {surveyUrl}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(surveyUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="mt-3 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
            >
              {copied ? "コピーしました ✓" : "URLをコピー"}
            </button>
          </>
        ) : (
          <p className="mt-3 text-sm text-gray-400">読み込み中...</p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="font-bold">部署リスト</h2>
        <p className="mt-1 text-sm text-gray-500">
          回答者は最初に自分の部署を選択します。
        </p>
        <ul className="mt-4 divide-y divide-gray-100">
          {departments.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2.5">
              <span>{d.name}</span>
              <button
                onClick={() => removeDepartment(d.id)}
                className="text-xs text-gray-400 hover:text-red-600"
                aria-label={`${d.name}を削除`}
              >
                削除
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <label htmlFor="newDept" className="sr-only">
            部署名
          </label>
          <input
            id="newDept"
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDepartment()}
            placeholder="部署名を入力"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={addDepartment}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
          >
            追加
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="font-bold">配布想定数(回答率の計算に使用)</h2>
        <div className="mt-3 flex gap-2">
          <label htmlFor="expected" className="sr-only">
            配布想定数
          </label>
          <input
            id="expected"
            type="number"
            min={1}
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
            className="w-40 rounded-lg border border-gray-300 px-3 py-2.5 focus:border-brand-500 focus:outline-none"
          />
          <button
            onClick={saveExpected}
            className="rounded-lg border border-brand-600 px-5 py-2.5 text-sm font-bold text-brand-700 hover:bg-brand-50"
          >
            保存
          </button>
        </div>
      </section>

      {message && (
        <p role="status" className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-800">
          {message}
        </p>
      )}
    </div>
  );
}
