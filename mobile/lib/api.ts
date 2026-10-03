/**
 * Thin client for the Next.js API in ../ui.
 */

import Constants from "expo-constants";
import type {
  FiltersResponse,
  HomeDetail,
  HomesResponse,
  Prefs,
} from "./types";

/**
 * On a phone, "localhost" is the phone itself — not the Mac running the API.
 * When the app was loaded from a Metro dev server we already know that Mac's
 * LAN address, so reuse its host and just swap in the API port. An explicit
 * non-loopback EXPO_PUBLIC_API_URL (a tunnel, say) always wins.
 */
function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");
  const port = explicit?.match(/:(\d+)$/)?.[1] ?? "3200";

  const isLoopback =
    !explicit || /^https?:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(explicit);
  if (!isLoopback) return explicit;

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;
  const host = hostUri?.split("/")[0]?.split(":")[0];

  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:${port}`;
  }
  return explicit ?? "http://localhost:3200";
}

const BASE_URL = resolveBaseUrl();
const API_KEY = process.env.EXPO_PUBLIC_API_KEY ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function headers(): Record<string, string> {
  return {
    Accept: "application/json",
    ...(API_KEY ? { "x-api-key": API_KEY } : {}),
    // Free ngrok tunnels serve an HTML interstitial to anything that looks
    // like a browser. This header opts out of it.
    "ngrok-skip-browser-warning": "true",
  };
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { headers: headers(), signal });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw e;
    throw new ApiError(
      `Can't reach the API at ${BASE_URL}. Is the Next.js server running, and is EXPO_PUBLIC_API_URL correct?`,
    );
  }

  if (res.status === 401) {
    throw new ApiError("Unauthorized — EXPO_PUBLIC_API_KEY does not match the server.", 401);
  }
  if (!res.ok) {
    throw new ApiError(`Request failed (${res.status})`, res.status);
  }

  const text = await res.text();
  if (text.trimStart().startsWith("<")) {
    throw new ApiError(
      "Got HTML instead of JSON — the tunnel is probably showing its warning page.",
    );
  }
  return JSON.parse(text) as T;
}

/** Statuses considered "move in ready" by the digest and the API. */
const MIR_STATUSES = ["MOVE_IN_READY", "QUICK_MOVE_IN"];

export function prefsToQuery(
  prefs: Prefs,
  page: { limit: number; offset: number },
): string {
  const q = new URLSearchParams();

  if (prefs.city && prefs.city !== "all") q.set("city", prefs.city);
  if (prefs.minBeds > 0) q.set("minBeds", String(prefs.minBeds));
  if (prefs.minBaths > 0) q.set("minBaths", String(prefs.minBaths));
  if (prefs.maxPrice) q.set("maxPrice", String(prefs.maxPrice));
  if (prefs.minSqft) q.set("minSqft", String(prefs.minSqft));
  if (prefs.builders.length) q.set("builders", prefs.builders.join(","));
  if (prefs.exclude55) q.set("exclude55", "1");
  if (prefs.priceDropOnly) q.set("priceDropOnly", "1");
  if (prefs.newOnly) q.set("newOnly", "1");
  if (prefs.mirOnly) q.set("status", MIR_STATUSES.join(","));
  if (prefs.preferredBuilders.length) {
    q.set("preferredBuilders", prefs.preferredBuilders.join(","));
  }
  if (prefs.preferredCommunities.length) {
    q.set("preferredCommunities", prefs.preferredCommunities.join(","));
  }

  q.set("sort", prefs.sort);
  q.set("limit", String(page.limit));
  q.set("offset", String(page.offset));

  return q.toString();
}

export function fetchHomes(
  prefs: Prefs,
  page: { limit: number; offset: number },
  signal?: AbortSignal,
): Promise<HomesResponse> {
  return get<HomesResponse>(`/api/homes?${prefsToQuery(prefs, page)}`, signal);
}

export function fetchFacets(signal?: AbortSignal): Promise<FiltersResponse> {
  return get<FiltersResponse>("/api/filters", signal);
}

export function fetchHome(id: number, signal?: AbortSignal): Promise<HomeDetail> {
  return get<HomeDetail>(`/api/homes/${id}`, signal);
}

export const apiBaseUrl = BASE_URL;
