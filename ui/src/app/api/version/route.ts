import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    commit: "483f7cf",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
}
