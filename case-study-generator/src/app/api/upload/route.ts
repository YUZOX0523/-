import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";

// 4.5MBを超えるPDFはVercelの関数ボディ制限に収まらないため、
// Vercel Blobへのクライアントアップロードを経由させる。
// 利用にはVercelダッシュボードで Blob ストアを作成しておくこと
// (BLOB_READ_WRITE_TOKEN が自動設定される)。

export async function POST(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return new Response(
      "Blobストアが未設定です。VercelのStorageタブでBlobストアを作成してください(小さいPDFはそのまま生成できます)",
      { status: 500 }
    );
  }

  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // clientPayload にアプリのパスワードを載せて認可する
        const expected = process.env.APP_PASSWORD;
        if (!expected || clientPayload !== expected) {
          throw new Error("パスワードが違います");
        }
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: 32 * 1024 * 1024, // Claude APIのPDF上限に合わせる
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // 生成後のPDFはBlob上に残る。定期的に手動削除するか、必要なら削除処理を追加する。
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "アップロードに失敗しました" },
      { status: 400 }
    );
  }
}
