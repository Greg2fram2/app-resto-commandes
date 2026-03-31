import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

// GET /api/admin/qr?url=<encoded-url>
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "url param required" }, { status: 400 });
  }

  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 2,
    color: { dark: "#1f2937", light: "#ffffff" },
    width: 200,
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
