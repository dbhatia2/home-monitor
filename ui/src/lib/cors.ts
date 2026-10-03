/**
 * CORS + shared-secret auth for the public API surface.
 *
 * Next has no built-in CORS for route handlers, so every route sets these
 * headers itself and exports an OPTIONS handler for the preflight.
 *
 * The API is reachable from the internet whenever an ngrok or Cloudflare
 * tunnel is running, so requests must carry `x-api-key`. Auth is skipped
 * entirely when API_KEY is unset, which keeps plain local development
 * (localhost:3000 in a browser) friction-free.
 */

import { NextResponse } from "next/server";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, x-api-key, ngrok-skip-browser-warning",
  "Access-Control-Max-Age": "86400",
};

export function corsHeaders(): Record<string, string> {
  return { ...CORS_HEADERS };
}

export function json(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: { ...corsHeaders(), ...init?.headers },
  });
}

export function preflight() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * Returns an error response when the request should be rejected, or null when
 * it may proceed.
 *
 * Same-origin browser requests are allowed through without a key so the
 * dashboard served by this same app keeps working. `Sec-Fetch-Site` is set by
 * the browser and cannot be forged by page scripts, and non-browser clients
 * (the native app, curl) never send it, so they still need the key.
 */
export function requireApiKey(req: Request): NextResponse | null {
  const expected = process.env.API_KEY;
  if (!expected) return null;

  if (req.headers.get("sec-fetch-site") === "same-origin") return null;

  const provided = req.headers.get("x-api-key");
  if (provided !== expected) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** Wraps a handler with the API key check and consistent error shaping. */
export function withApi<T extends unknown[]>(
  handler: (req: Request, ...rest: T) => Promise<NextResponse>,
) {
  return async (req: Request, ...rest: T): Promise<NextResponse> => {
    const denied = requireApiKey(req);
    if (denied) return denied;

    try {
      return await handler(req, ...rest);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.error("[api]", message);
      return json({ error: message }, { status: 500 });
    }
  };
}
