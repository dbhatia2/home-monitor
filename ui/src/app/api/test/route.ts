import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const test = searchParams.get("test") || "no-param";

    return NextResponse.json({
      success: true,
      test,
      url: req.url,
      pathname: req.nextUrl.pathname,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
