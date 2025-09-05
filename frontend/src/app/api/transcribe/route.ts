import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // ensure node runtime

export async function POST(req: NextRequest) {
  const fastapi = process.env.FASTAPI_URL!;
  const formData = await req.formData(); // contains 'file'
  const r = await fetch(`${fastapi}/transcribe`, {
    method: "POST",
    body: formData,
    // No need to set headers; fetch will set proper multipart boundary
  });
  const body = await r.text();
  return new NextResponse(body, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") || "application/json",
    },
  });
}
