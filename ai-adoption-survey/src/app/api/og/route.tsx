import { ImageResponse } from "next/og";

export const runtime = "edge";

/** SNSシェア用のOGP画像(スコア+レベル入り) */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const score = searchParams.get("score") ?? "—";
  const level = searchParams.get("level") ?? "";
  const name = searchParams.get("name") ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 700, color: "#1d4ed8" }}>
          AI活用レベル診断
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            marginTop: 24,
            color: "#1e3a8a",
          }}
        >
          <div style={{ fontSize: 180, fontWeight: 900 }}>{score}</div>
          <div style={{ fontSize: 48, color: "#9ca3af" }}>/100</div>
        </div>
        {level && (
          <div
            style={{
              marginTop: 16,
              background: "#2563eb",
              color: "white",
              borderRadius: 9999,
              padding: "12px 40px",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            Lv.{level} {name}
          </div>
        )}
        <div style={{ marginTop: 32, fontSize: 24, color: "#6b7280" }}>
          株式会社デジライズ
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
