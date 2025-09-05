import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const fastapi = process.env.FASTAPI_URL!;
  const r = await fetch(`${fastapi}/reply`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: await req.text(),
  });
  const body = await r.text();
  return new NextResponse(body, {
    status: r.status,
    headers: {
      "content-type": r.headers.get("content-type") || "application/json",
    },
  });
}
