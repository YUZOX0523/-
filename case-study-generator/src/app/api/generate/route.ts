import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import {
  SYSTEM_PROMPT,
  DRAFT_INSTRUCTION,
  WORDPRESS_INSTRUCTION,
} from "@/lib/prompt";

// 原稿生成は数分かかるため、Vercelの関数実行時間を最大まで延長する
export const maxDuration = 300;

type GenerateBody = {
  format: "draft" | "wordpress";
  // どちらか一方を指定する。
  // pdfBase64: 小さいPDF(〜3.5MB)を直接送る場合
  // pdfUrl: Vercel Blobにアップロード済みの大きいPDFのURL
  pdfBase64?: string;
  pdfUrl?: string;
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

  const { format, pdfBase64, pdfUrl } = body;
  if (format !== "draft" && format !== "wordpress") {
    return new Response("format は draft か wordpress を指定してください", { status: 400 });
  }
  if (!pdfBase64 && !pdfUrl) {
    return new Response("PDFが指定されていません", { status: 400 });
  }

  const source = pdfUrl
    ? ({ type: "url", url: pdfUrl } as const)
    : ({ type: "base64", media_type: "application/pdf", data: pdfBase64! } as const);

  const instruction = format === "draft" ? DRAFT_INSTRUCTION : WORDPRESS_INSTRUCTION;

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 32000,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source },
          { type: "text", text: instruction },
        ],
      },
    ],
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
