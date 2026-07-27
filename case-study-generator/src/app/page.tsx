"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { exportMarkdownAsPdf } from "@/lib/exportPdf";
import {
  WpOptions,
  WpTerm,
  WpDraftResult,
  extractWpTitle,
  extractCompany,
  stripInstructionComments,
  normalizeTermName,
  findSimilarTerms,
  sortEmployeeTerms,
  visibleImplementationTerms,
} from "@/lib/wordpress";

type Format = "draft" | "wordpress";

// Base64化するとサイズが約37%増えるため、Vercelの関数ボディ制限(4.5MB)に
// 収まるよう、生ファイルの時点で余裕を持った閾値にする(4.5MB / 1.37 ≈ 3.2MB)。
// これを超えるPDFはVercel Blob経由でアップロードしてURLを渡す
const DIRECT_UPLOAD_LIMIT = 2.5 * 1024 * 1024;

const FORMAT_LABEL: Record<Format, string> = {
  draft: "チェック用原稿 (Markdown)",
  wordpress: "WordPress入稿用",
};

const FILE_NAME: Record<Format, string> = {
  draft: "draft.md",
  wordpress: "wordpress.html",
};

// タクソノミーのチェックボックス群(導入サービス/従業員数/所在地で共用)
function CheckGroup({
  terms,
  selected,
  onToggle,
}: {
  terms: WpTerm[];
  selected: number[];
  onToggle: (id: number) => void;
}) {
  return (
    <div className="check-grid">
      {terms.map((t) => (
        <label key={t.id} className={`check-chip${selected.includes(t.id) ? " on" : ""}`}>
          <input
            type="checkbox"
            checked={selected.includes(t.id)}
            onChange={() => onToggle(t.id)}
          />
          {t.name}
        </label>
      ))}
    </div>
  );
}

export default function Home() {
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [statusText, setStatusText] = useState("");
  const [outputs, setOutputs] = useState<Record<Format, string>>({
    draft: "",
    wordpress: "",
  });
  const [pending, setPending] = useState<Record<Format, boolean>>({
    draft: false,
    wordpress: false,
  });
  const [activeTab, setActiveTab] = useState<Format>("draft");
  const [reviseText, setReviseText] = useState("");
  const [lastPayload, setLastPayload] = useState<{
    pdfBase64?: string;
    pdfUrl?: string;
  } | null>(null);
  const [history, setHistory] = useState<Record<Format, string[]>>({
    draft: [],
    wordpress: [],
  });
  const fileInput = useRef<HTMLInputElement>(null);

  // --- WordPress下書き保存(自動投稿API連携)用の状態 ---
  const [wpOptions, setWpOptions] = useState<WpOptions | null>(null);
  const [wpOptionsLoading, setWpOptionsLoading] = useState(false);
  const [wpOptionsError, setWpOptionsError] = useState("");
  const [wpTitle, setWpTitle] = useState("");
  const [wpCompany, setWpCompany] = useState("");
  const [wpIndustry, setWpIndustry] = useState("");
  const [wpCorpUrl, setWpCorpUrl] = useState("");
  const [wpImplementation, setWpImplementation] = useState<number[]>([]);
  const [wpEmployees, setWpEmployees] = useState<number[]>([]);
  const [wpLocation, setWpLocation] = useState<number[]>([]);
  const [wpSaving, setWpSaving] = useState(false);
  const [wpError, setWpError] = useState("");
  const [wpResult, setWpResult] = useState<WpDraftResult | null>(null);

  const pickFile = useCallback((f: File | undefined | null) => {
    setError("");
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("PDFファイルを選択してください");
      return;
    }
    if (f.size > 32 * 1024 * 1024) {
      setError("PDFが大きすぎます(上限32MB)");
      return;
    }
    setFile(f);
  }, []);

  const readAsBase64 = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        resolve(url.slice(url.indexOf(",") + 1));
      };
      reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
      reader.readAsDataURL(f);
    });

  const streamGenerate = async (
    format: Format,
    payload: {
      pdfBase64?: string;
      pdfUrl?: string;
      currentText?: string;
      reviseInstruction?: string;
    }
  ) => {
    setPending((p) => ({ ...p, [format]: true }));
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-password": password,
        },
        body: JSON.stringify({ format, ...payload }),
      });
      if (!res.ok || !res.body) {
        throw new Error((await res.text()) || `生成に失敗しました (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setOutputs((o) => ({ ...o, [format]: o[format] + chunk }));
      }
    } finally {
      setPending((p) => ({ ...p, [format]: false }));
    }
  };

  const generate = async () => {
    if (!file || !password || running) return;
    setRunning(true);
    setError("");
    setOutputs({ draft: "", wordpress: "" });
    try {
      let payload: { pdfBase64?: string; pdfUrl?: string };
      if (file.size <= DIRECT_UPLOAD_LIMIT) {
        setStatusText("PDFを読み込んでいます…");
        payload = { pdfBase64: await readAsBase64(file) };
      } else {
        setStatusText("PDFをアップロードしています…(サイズが大きいため)");
        const blob = await upload(`case-study-pdfs/${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
          clientPayload: password,
        });
        payload = { pdfUrl: blob.url };
      }
      setLastPayload(payload);
      setHistory({ draft: [], wordpress: [] });
      setStatusText(
        "原稿を生成しています…(2形式を同時生成。3〜5分ほどかかります。画面を閉じないでください)"
      );
      await Promise.all([
        streamGenerate("draft", payload),
        streamGenerate("wordpress", payload),
      ]);
      setStatusText("生成が完了しました。内容がPDFと一致しているか必ず確認してください。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました");
      setStatusText("");
    } finally {
      setRunning(false);
    }
  };

  const copyOutput = async () => {
    await navigator.clipboard.writeText(outputs[activeTab]);
    setStatusText(`${FORMAT_LABEL[activeTab]} をコピーしました`);
  };

  const downloadOutput = () => {
    const blob = new Blob([outputs[activeTab]], {
      type: "text/plain;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = FILE_NAME[activeTab];
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const downloadAsPdf = () => {
    exportMarkdownAsPdf(outputs.draft, "導入事例原稿");
    setStatusText(
      "印刷画面が開きました。「PDFとして保存」を選んでダウンロードしてください。"
    );
  };

  const requestRevision = async () => {
    const format = activeTab;
    const instruction = reviseText.trim();
    if (!instruction || !password || pending[format] || running) return;

    const before = outputs[format];
    setHistory((h) => ({ ...h, [format]: [...h[format], before] }));
    setOutputs((o) => ({ ...o, [format]: "" }));
    setError("");
    setStatusText("修正を反映しています…");
    try {
      await streamGenerate(format, {
        ...(lastPayload ?? {}),
        currentText: before,
        reviseInstruction: instruction,
      });
      setReviseText("");
      setStatusText("修正が完了しました。内容を確認してください。");
    } catch (e) {
      // 失敗時は直前の内容に戻す
      setOutputs((o) => ({ ...o, [format]: before }));
      setHistory((h) => ({ ...h, [format]: h[format].slice(0, -1) }));
      setError(e instanceof Error ? e.message : "修正に失敗しました");
      setStatusText("");
    }
  };

  const undoRevision = () => {
    const format = activeTab;
    const stack = history[format];
    if (stack.length === 0) return;
    const previous = stack[stack.length - 1];
    setOutputs((o) => ({ ...o, [format]: previous }));
    setHistory((h) => ({ ...h, [format]: h[format].slice(0, -1) }));
    setStatusText("修正前の内容に戻しました");
  };

  // タームIDはWordPress管理画面での追加・削除で変わるため、ハードコードせず
  // 表示のたびに options APIから最新を取得する(API仕様書の指示)
  const loadWpOptions = useCallback(async () => {
    if (!password) return;
    setWpOptionsError("");
    setWpOptionsLoading(true);
    try {
      const res = await fetch("/api/wordpress/options", {
        headers: { "x-app-password": password },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || `選択肢の取得に失敗しました (${res.status})`);
      }
      const data = body.data as WpOptions;
      setWpOptions(data);
      // このGeneratorは法人リスキリングの事例専用なので、導入サービスは既定で選択しておく
      setWpImplementation((cur) =>
        cur.length > 0
          ? cur
          : data.implementation.filter((t) => t.name === "法人リスキリング").map((t) => t.id)
      );
    } catch (e) {
      setWpOptionsError(e instanceof Error ? e.message : "選択肢の取得に失敗しました");
    } finally {
      setWpOptionsLoading(false);
    }
  }, [password]);

  // 生成が完了したら、タイトル・企業名を原稿から自動入力し、選択肢を読み込む。
  // 既に入力済みの欄は上書きしない(手修正を消さないため)。
  useEffect(() => {
    if (running || pending.wordpress || pending.draft || !outputs.wordpress) return;
    setWpTitle((t) => t || extractWpTitle(outputs.wordpress, outputs.draft));
    setWpCompany((c) => c || extractCompany(outputs.draft));
    if (!wpOptions && !wpOptionsLoading && !wpOptionsError) {
      loadWpOptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, pending.wordpress, pending.draft, outputs.wordpress, outputs.draft]);

  const toggleTerm =
    (setter: React.Dispatch<React.SetStateAction<number[]>>) => (id: number) =>
      setter((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const implementationTerms = useMemo(
    () => (wpOptions ? visibleImplementationTerms(wpOptions.implementation) : []),
    [wpOptions]
  );
  const employeeTerms = useMemo(
    () => (wpOptions ? sortEmployeeTerms(wpOptions.employees) : []),
    [wpOptions]
  );
  const locationTerms = useMemo(
    () =>
      wpOptions
        ? [...wpOptions.location].sort((a, b) => a.name.localeCompare(b.name, "ja"))
        : [],
    [wpOptions]
  );
  // 業種の表記ゆれによるターム重複作成を防ぐためのサジェスト(仕様書7.1の推奨対応)
  const industrySuggestions = useMemo(
    () => (wpOptions ? findSimilarTerms(wpIndustry, wpOptions.industry) : []),
    [wpOptions, wpIndustry]
  );
  const industryExactMatch = useMemo(() => {
    if (!wpOptions || !wpIndustry.trim()) return null;
    const key = normalizeTermName(wpIndustry);
    return wpOptions.industry.find((t) => normalizeTermName(t.name) === key) ?? null;
  }, [wpOptions, wpIndustry]);

  const saveToWordPress = async () => {
    if (wpSaving) return;
    setWpError("");
    setWpResult(null);

    const title = wpTitle.trim();
    const industryInput = wpIndustry.trim();
    const corpUrl = wpCorpUrl.trim();
    const content = stripInstructionComments(outputs.wordpress);

    const missing: string[] = [];
    if (!title) missing.push("タイトル");
    if (!industryInput) missing.push("業種");
    if (wpImplementation.length === 0) missing.push("導入サービス");
    if (wpEmployees.length === 0) missing.push("従業員数");
    if (wpLocation.length === 0) missing.push("所在地");
    if (missing.length > 0) {
      setWpError(`必須項目が未入力です: ${missing.join(" / ")}`);
      return;
    }
    if (!content.includes("wp:")) {
      setWpError(
        "WordPress入稿用の原稿がGutenberg形式になっていません。「WordPress入稿用」タブの内容を確認してください。"
      );
      return;
    }
    if (corpUrl && !/^https?:\/\/.+/.test(corpUrl)) {
      setWpError("企業ホームページURLは https:// から始まる形式で入力してください");
      return;
    }

    // 正規化して一致する既存タームがあれば、その表記をそのまま使う(重複ターム防止)
    const industry = industryExactMatch ? industryExactMatch.name : industryInput;

    setWpSaving(true);
    try {
      const res = await fetch("/api/wordpress/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-password": password,
        },
        body: JSON.stringify({
          title,
          content,
          company_name: wpCompany.trim() || undefined,
          corp_url: corpUrl || undefined,
          implementation: wpImplementation,
          employees: wpEmployees,
          location: wpLocation,
          industry,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || `下書きの作成に失敗しました (${res.status})`);
      }
      setWpResult(body.data as WpDraftResult);
      if (industryExactMatch && industryExactMatch.name !== industryInput) {
        setWpIndustry(industryExactMatch.name);
      }
      setStatusText("WordPressに下書きを作成しました。写真の挿入と最終確認はWordPress側で行ってください。");
    } catch (e) {
      setWpError(e instanceof Error ? e.message : "下書きの作成に失敗しました");
    } finally {
      setWpSaving(false);
    }
  };

  return (
    <>
      <header className="site-head">
        <div className="wrap">
          <span className="brand-mark">D</span>
          <span className="brand-name">DigiRise</span>
          <span className="head-tag">導入事例 原稿ジェネレーター(社内用)</span>
        </div>
      </header>

      <main className="wrap">
        <h1>最終報告MTG資料 → 導入事例原稿</h1>
        <p className="lead">
          法人リスキリングの最終報告MTG資料(PDF)をアップロードすると、導入企業チェック用の原稿(Markdown)と
          WordPress入稿用ファイルを自動生成します。個人名・動画視聴状況は自動的に除外されます。
        </p>

        <div className="panel">
          <label htmlFor="pw">社内パスワード</label>
          <input
            id="pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="共有されているパスワードを入力"
            autoComplete="current-password"
          />
        </div>

        <div className="panel">
          <label>最終報告MTG資料(PDF)</label>
          <div
            className={`dropzone${drag ? " drag" : ""}`}
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              pickFile(e.dataTransfer.files?.[0]);
            }}
          >
            {file ? (
              <span className="file-name">📄 {file.name}({(file.size / 1024 / 1024).toFixed(1)}MB)</span>
            ) : (
              <>ここにPDFをドラッグ&ドロップ、またはクリックして選択</>
            )}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <div style={{ marginTop: 18 }}>
            <button
              className="gen-btn"
              onClick={generate}
              disabled={!file || !password || running}
            >
              {running ? "生成中…" : "原稿を生成する"}
            </button>
          </div>
          {statusText && (
            <p className="status">
              {running && <span className="spinner" />} {statusText}
            </p>
          )}
          {error && <p className="status error">{error}</p>}
        </div>

        {(outputs.draft || outputs.wordpress || running) && (
          <div className="panel">
            <div className="tabs">
              {(["draft", "wordpress"] as Format[]).map((f) => (
                <button
                  key={f}
                  className={`tab${activeTab === f ? " active" : ""}`}
                  onClick={() => setActiveTab(f)}
                >
                  {FORMAT_LABEL[f]}
                  {pending[f] && (
                    <span className="spin">
                      <span className="spinner" />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="out-actions">
              <button className="mini-btn" onClick={copyOutput} disabled={!outputs[activeTab]}>
                📋 コピー
              </button>
              <button className="mini-btn" onClick={downloadOutput} disabled={!outputs[activeTab]}>
                ⬇️ {FILE_NAME[activeTab]} をダウンロード
              </button>
              {activeTab === "draft" && (
                <button
                  className="mini-btn primary"
                  onClick={downloadAsPdf}
                  disabled={!outputs.draft}
                >
                  🖨️ PDFで書き出す(お客様送付用)
                </button>
              )}
            </div>
            <textarea
              className="output editable"
              value={outputs[activeTab]}
              onChange={(e) =>
                setOutputs((o) => ({ ...o, [activeTab]: e.target.value }))
              }
              placeholder="(生成待ち…)"
              spellCheck={false}
            />

            <div className="revise-box">
              <label htmlFor="revise">AIに修正指示を出す(このタブの原稿が対象)</label>
              <div className="revise-row">
                <input
                  id="revise"
                  type="text"
                  value={reviseText}
                  onChange={(e) => setReviseText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") requestRevision();
                  }}
                  placeholder="例: ROIの前提を注記の直前に移動して/受講者の声を1件差し替えて/もっと簡潔にして"
                  disabled={pending[activeTab] || running}
                />
                <button
                  className="mini-btn primary"
                  onClick={requestRevision}
                  disabled={
                    !reviseText.trim() ||
                    !outputs[activeTab] ||
                    pending[activeTab] ||
                    running
                  }
                >
                  🪄 この指示で修正する
                </button>
                <button
                  className="mini-btn"
                  onClick={undoRevision}
                  disabled={history[activeTab].length === 0}
                >
                  ↩️ 修正前に戻す
                </button>
              </div>
              <p className="note">
                上のテキストボックスは直接編集もできます(数値の細かい修正や誤字はそのまま書き換えてOK)。
              </p>
            </div>

            {activeTab === "draft" && (
              <p className="note">
                💡 お客様への確認依頼には「PDFで書き出す」を使ってください(.mdファイルはお客様の環境で開けないことがあります)。
              </p>
            )}
            <p className="note">
              ⚠️ 公開前に必ず確認: ①数値がPDFと一致しているか ②個人名が入っていないか
              ③導入企業の掲載承諾を得てから公開すること(承諾依頼と同時にロゴ・宣材写真の支給を依頼)
            </p>
          </div>
        )}

        {outputs.wordpress && !running && !pending.wordpress && (
          <div className="panel">
            <h2 className="panel-title">📤 WordPressへ下書き保存</h2>
            <p className="panel-sub">
              下の項目を入力して保存すると、digirise.ai
              に事例記事の下書きが自動作成されます(公開はされません)。
              写真のアップロード・挿入と最終確認・公開はWordPress側で行います。
            </p>

            {wpOptionsError && (
              <p className="status error">
                {wpOptionsError}{" "}
                <button className="mini-btn" onClick={loadWpOptions} disabled={wpOptionsLoading}>
                  🔄 選択肢を再読み込み
                </button>
              </p>
            )}
            {wpOptionsLoading && (
              <p className="status">
                <span className="spinner" /> WordPressから選択肢を読み込んでいます…
              </p>
            )}

            <div className="field">
              <label htmlFor="wp-title">
                タイトル<span className="req">必須</span>
              </label>
              <div className="title-row">
                <input
                  id="wp-title"
                  className="text-input"
                  type="text"
                  value={wpTitle}
                  onChange={(e) => setWpTitle(e.target.value)}
                  placeholder="原稿の生成が完了すると自動入力されます(編集OK)"
                />
                <button
                  type="button"
                  className="mini-btn"
                  onClick={() => {
                    const t = extractWpTitle(outputs.wordpress, outputs.draft);
                    if (t) {
                      setWpTitle(t);
                      setStatusText("原稿からタイトルを取得しました");
                    } else {
                      setWpError("原稿からタイトルを取得できませんでした。手入力してください。");
                    }
                  }}
                  disabled={!outputs.wordpress && !outputs.draft}
                  title="生成済みの原稿からタイトルを取り直します(修正指示でタイトルが変わったときに)"
                >
                  🔄 原稿から再取得
                </button>
              </div>
            </div>

            <div className="field-grid">
              <div className="field">
                <label htmlFor="wp-company">企業名</label>
                <input
                  id="wp-company"
                  className="text-input"
                  type="text"
                  value={wpCompany}
                  onChange={(e) => setWpCompany(e.target.value)}
                  placeholder="例: 株式会社トップ"
                />
              </div>
              <div className="field">
                <label htmlFor="wp-url">企業ホームページURL</label>
                <input
                  id="wp-url"
                  className="text-input"
                  type="text"
                  value={wpCorpUrl}
                  onChange={(e) => setWpCorpUrl(e.target.value)}
                  placeholder="https://example.com/"
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="wp-industry">
                業種<span className="req">必須</span>
              </label>
              <input
                id="wp-industry"
                className="text-input"
                type="text"
                value={wpIndustry}
                onChange={(e) => setWpIndustry(e.target.value)}
                placeholder="例: 製造業"
              />
              {industryExactMatch && industryExactMatch.name !== wpIndustry.trim() && (
                <p className="suggest">
                  💡 保存時は既存の「{industryExactMatch.name}」として登録されます(表記ゆれによる重複防止)
                </p>
              )}
              {!industryExactMatch && industrySuggestions.length > 0 && (
                <p className="suggest">
                  似た名前が既に登録されています。同じ業種なら既存の表記に揃えてください(クリックで入力):
                  {industrySuggestions.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="sug-chip"
                      onClick={() => setWpIndustry(t.name)}
                    >
                      {t.name}
                    </button>
                  ))}
                </p>
              )}
            </div>

            {wpOptions && (
              <>
                <div className="field">
                  <label>
                    導入サービス<span className="req">必須</span>
                  </label>
                  <CheckGroup
                    terms={implementationTerms}
                    selected={wpImplementation}
                    onToggle={toggleTerm(setWpImplementation)}
                  />
                </div>
                <div className="field">
                  <label>
                    従業員数<span className="req">必須</span>
                  </label>
                  <CheckGroup
                    terms={employeeTerms}
                    selected={wpEmployees}
                    onToggle={toggleTerm(setWpEmployees)}
                  />
                </div>
                <div className="field">
                  <label>
                    所在地<span className="req">必須</span>
                  </label>
                  <CheckGroup
                    terms={locationTerms}
                    selected={wpLocation}
                    onToggle={toggleTerm(setWpLocation)}
                  />
                </div>
              </>
            )}

            <div style={{ marginTop: 18 }}>
              <button
                className="gen-btn"
                onClick={saveToWordPress}
                disabled={wpSaving || wpOptionsLoading || !wpOptions}
              >
                {wpSaving ? "保存中…" : "📤 WordPressへ下書き保存"}
              </button>
            </div>
            {wpError && <p className="status error">{wpError}</p>}
            {wpResult && (
              <div className="wp-success">
                ✅ WordPressに下書きを作成しました(投稿ID: {wpResult.post_id})
                <div style={{ marginTop: 6 }}>
                  {wpResult.edit_url && (
                    <a href={wpResult.edit_url} target="_blank" rel="noreferrer">
                      📝 WordPressで編集画面を開く
                    </a>
                  )}
                  {wpResult.edit_url && wpResult.preview_url && " / "}
                  {wpResult.preview_url && (
                    <a href={wpResult.preview_url} target="_blank" rel="noreferrer">
                      👀 プレビューを見る
                    </a>
                  )}
                </div>
                <p className="note" style={{ marginTop: 8 }}>
                  残りの作業(WordPress側): 写真のアップロード →
                  記事内の【画像挿入位置①/②】を画像ブロックに差し替え → アイキャッチ設定 →
                  最終確認 → 公開。
                  <br />※ もう一度保存ボタンを押すと、同じ内容の下書きがもう1件作成されるので注意。
                </p>
              </div>
            )}
            <p className="note">
              🔒 保存されるのは「下書き」のみで、このアプリから公開はできません。掲載承諾を得てから公開してください。
            </p>
          </div>
        )}
      </main>
    </>
  );
}
