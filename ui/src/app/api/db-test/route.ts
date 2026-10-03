import { NextResponse } from "next/server";

export const runtime = 'nodejs';

export async function GET() {
  try {
    const hasPostgresUrl = !!process.env.POSTGRES_URL;
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    const urlPreview = process.env.POSTGRES_URL || process.env.DATABASE_URL;

    // Try to import and use pool
    const pool = (await import("@/lib/db")).default;
    await pool.query("SELECT 1");

    return NextResponse.json({
      success: true,
      hasPostgresUrl,
      hasDatabaseUrl,
      urlPreview: urlPreview ? `${urlPreview.substring(0, 20)}...` : "none",
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
    }, { status: 500 });
  }
}
