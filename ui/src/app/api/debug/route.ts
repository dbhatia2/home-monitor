import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/lib/cors";

export const GET = withApi(async (req) => {
  return NextResponse.json({
    hasNextUrl: 'nextUrl' in req,
    nextUrlType: typeof (req as any).nextUrl,
    url: req.url,
    searchParams: 'nextUrl' in req ? Array.from((req as NextRequest).nextUrl.searchParams.entries()) : 'no nextUrl',
    constructor: req.constructor.name,
  });
});
