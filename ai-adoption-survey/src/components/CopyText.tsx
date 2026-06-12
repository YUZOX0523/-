"use client";

import { useState } from "react";

/** テキストをクリップボードにコピーする汎用ボタン */
export default function CopyText({
  text,
  label = "コピー",
  copiedLabel = "コピーしました ✓",
  className = "rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700",
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }}
      className={className}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
