import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const DEFAULT_TITLE = "Giải Mã Nhân Số Học";
const DEFAULT_SUMMARY =
  "Khám phá bản thân, tính cách, điểm mạnh và hành trình phát triển của chính bạn.";

export async function GET(request: NextRequest) {
  const logoUrl = new URL("/assets/images/logo2.png", request.url).href;
  const title = (
    request.nextUrl.searchParams.get("title") || DEFAULT_TITLE
  ).trim().slice(0, 120) || DEFAULT_TITLE;
  const summary = (
    request.nextUrl.searchParams.get("summary") || DEFAULT_SUMMARY
  ).trim().slice(0, 190) || DEFAULT_SUMMARY;
  const titleSize = title.length > 72 ? 48 : title.length > 45 ? 56 : 64;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          color: "#ffffff",
          background:
            "linear-gradient(135deg, #071f24 0%, #0d353b 57%, #123f44 100%)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: 540,
            height: 540,
            position: "absolute",
            right: -150,
            top: -190,
            display: "flex",
            borderRadius: 270,
            background: "rgba(240, 201, 106, 0.13)",
            border: "2px solid rgba(240, 201, 106, 0.2)",
          }}
        />
        <div
          style={{
            width: 390,
            height: 390,
            position: "absolute",
            left: -180,
            bottom: -205,
            display: "flex",
            borderRadius: 195,
            background: "rgba(217, 78, 31, 0.16)",
          }}
        />

        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            padding: "62px 76px",
            gap: 58,
          }}
        >
          <div
            style={{
              width: 260,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 218,
                height: 218,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 14,
                borderRadius: 109,
                background: "rgba(255, 255, 255, 0.96)",
                border: "4px solid #f0c96a",
                boxShadow: "0 22px 60px rgba(0, 0, 0, 0.35)",
              }}
            >
              <img
                alt=""
                height={190}
                src={logoUrl}
                style={{ objectFit: "contain", borderRadius: 95 }}
                width={190}
              />
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 24,
                color: "#f0c96a",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 2,
                textAlign: "center",
              }}
            >
              CLOW CAT PATRONUS
            </div>
          </div>

          <div
            style={{
              minWidth: 0,
              display: "flex",
              flex: 1,
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                marginBottom: 24,
                padding: "10px 18px",
                borderRadius: 999,
                color: "#f0c96a",
                background: "rgba(240, 201, 106, 0.11)",
                border: "1px solid rgba(240, 201, 106, 0.4)",
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: 2.5,
              }}
            >
              GIẢI MÃ NHÂN SỐ HỌC
            </div>
            <div
              style={{
                maxHeight: 225,
                display: "flex",
                overflow: "hidden",
                fontFamily: "Georgia, serif",
                fontSize: titleSize,
                fontWeight: 700,
                letterSpacing: -1.5,
                lineHeight: 1.08,
              }}
            >
              {title}
            </div>
            <div
              style={{
                maxHeight: 78,
                display: "flex",
                overflow: "hidden",
                marginTop: 24,
                color: "rgba(255, 255, 255, 0.76)",
                fontSize: 23,
                lineHeight: 1.45,
              }}
            >
              {summary}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: 30,
                color: "#f0c96a",
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              nhanso.clowcat.com.vn
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
      },
    },
  );
}
