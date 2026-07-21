import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import {
  SYSTEM_PROMPT,
  DRAFT_INSTRUCTION,
  WORDPRESS_INSTRUCTION,
  buildReviseInstruction,
} from "@/lib/prompt";

// 原稿生成は数分かかるため、Vercelの関数実行時間を最大まで延長する
export const maxDuration = 300;

type GenerateBody = {
  format: "draft" | "wordpress";
  // 新規生成時: どちらか一方を指定する。
  // pdfBase64: 小さいPDF(〜2.5MB)を直接送る場合
  // pdfUrl: Vercel Blobにアップロード済みの大きいPDFのURL
  pdfBase64?: string;
  pdfUrl?: string;
  // 修正指示モード: 両方指定すると、PDFの再指定は任意(あれば事実確認に使う)
  currentText?: string;
  reviseInstruction?: string;
};

export async function POST(req: NextRequest) {
  const password = req.headers.get("x-app-password") ?? "";
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    return new Response("サーバーに APP_PASSWORD が設定されていません", { status: 500 });
  }
  if (password !== expected) {
    return new Response("パスワードが違います", { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response("サーバーに ANTHROPIC_API_KEY が設定されていません", { status: 500 });
  }

  let body: GenerateBody;
  try {
    body = await req.json();
  } catch {
    return new Response("リクエストが不正です", { status: 400 });
  }

  const { format, pdfBase64, pdfUrl, currentText, reviseInstruction } = body;
  if (format !== "draft" && format !== "wordpress") {
    return new Response("format は draft か wordpress を指定してください", { status: 400 });
  }

  const isRevision = Boolean(currentText && reviseInstruction);
  if (!isRevision && !pdfBase64 && !pdfUrl) {
    return new Response("PDFが指定されていません", { status: 400 });
  }

  const content: Anthropic.Messages.ContentBlockParam[] = [];

  if (pdfBase64 || pdfUrl) {
    const source = pdfUrl
      ? ({ type: "url", url: pdfUrl } as const)
      : ({ type: "base64", media_type: "application/pdf", data: pdfBase64! } as const);
    content.push({ type: "document", source });
  }

  if (isRevision) {
    content.push({
      type: "text",
      text: buildReviseInstruction(format, currentText!, reviseInstruction!),
    });
  } else {
    content.push({
      type: "text",
      text: format === "draft" ? DRAFT_INSTRUCTION : WORDPRESS_INSTRUCTION,
    });
  }

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on("text", (delta) => {
        controller.enqueue(encoder.encode(delta));
      });
      stream.on("error", (err) => {
        controller.enqueue(
          encoder.encode(`\n\n[エラー] 生成に失敗しました: ${err.message}`)
        );
        controller.close();
      });
      stream.on("end", () => {
        controller.close();
      });
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
