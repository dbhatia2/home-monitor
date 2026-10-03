/**
 * Query-string -> Filters parsing, shared by the API routes.
 */

import type { Filters, ScoringWeights, SortKey } from "./types";

const SORT_KEYS: SortKey[] = [
  "score",
  "price_drop",
  "ppsf",
  "price",
  "price_desc",
  "sqft",
  "newest",
];

const WEIGHT_KEYS: (keyof ScoringWeights)[] = [
  "value_ppsf",
  "price_drop",
  "availability",
  "sqft_bonus",
  "hotw",
];

function num(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (raw === null || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function bool(params: URLSearchParams, key: string): boolean | undefined {
  const raw = params.get(key);
  if (raw === null) return undefined;
  return raw === "1" || raw.toLowerCase() === "true";
}

/** Accepts both `?builders=a,b` and repeated `?builders=a&builders=b`. */
function list(params: URLSearchParams, key: string): string[] | undefined {
  const values = params
    .getAll(key)
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
  return values.length ? values : undefined;
}

export function parseFilters(params: URLSearchParams): Filters {
  const city = params.get("city");
  const cities = list(params, "cities") ?? (city && city !== "all" ? [city] : undefined);

  const sortRaw = params.get("sort") as SortKey | null;
  const sort = sortRaw && SORT_KEYS.includes(sortRaw) ? sortRaw : "score";

  let weights: Partial<ScoringWeights> | undefined;
  for (const key of WEIGHT_KEYS) {
    const value = num(params, `w_${key}`);
    if (value !== undefined) weights = { ...weights, [key]: value };
  }

  const limit = num(params, "limit");
  const offset = num(params, "offset");

  const address = params.get("address");

  return {
    cities,
    address: address && address.trim() !== "" ? address.trim() : undefined,
    minBeds: num(params, "minBeds"),
    minBaths: num(params, "minBaths"),
    minPrice: num(params, "minPrice"),
    maxPrice: num(params, "maxPrice"),
    minSqft: num(params, "minSqft"),
    builders: list(params, "builders"),
    communities: list(params, "communities"),
    status: list(params, "status")?.map((s) => s.toUpperCase()),
    exclude55: bool(params, "exclude55") ?? false,
    priceDropOnly: bool(params, "priceDropOnly") ?? false,
    newOnly: bool(params, "newOnly") ?? false,
    preferredBuilders: list(params, "preferredBuilders"),
    preferredCommunities: list(params, "preferredCommunities"),
    weights,
    sort,
    limit: limit !== undefined ? Math.min(Math.max(limit, 1), 200) : 50,
    offset: offset !== undefined ? Math.max(offset, 0) : 0,
  };
}
