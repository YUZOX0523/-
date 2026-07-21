"use client";

import { useCallback, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { exportMarkdownAsPdf } from "@/lib/exportPdf";

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
      </main>
    </>
  );
}
