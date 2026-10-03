/**
 * TypeScript port of profiles/schema.py.
 *
 * Kept deliberately faithful to the Python so the app and the daily email
 * digests rank the same homes the same way. If you change a weight or a
 * threshold here, change it in profiles/schema.py too.
 */

import type { Filters, Home, ScoringWeights } from "./types";

export const DEFAULT_WEIGHTS: ScoringWeights = {
  value_ppsf: 40,
  price_drop: 30,
  availability: 20,
  sqft_bonus: 5,
  hotw: 5,
};

/** Statuses dropped by filterHomes, matching filter_homes() in Python. */
const EXCLUDED_STATUSES = new Set(["SOLD", "FUTURE", "MODEL_HOME"]);

const MOVE_IN_STATUSES = new Set(["MOVE_IN_READY", "QUICK_MOVE_IN"]);
const IN_PROGRESS_STATUSES = new Set(["AVAILABLE", "UNDER_CONSTRUCTION"]);

/**
 * Builders publish baths as free text. "2" -> 2, "2.5" -> 2.5,
 * "2 + 1 half" -> 2.5. Anything unparseable counts as 0 so it fails a
 * minBaths filter rather than silently passing.
 */
export function parseBaths(val: unknown): number {
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;
  const s = String(val ?? "").toLowerCase().trim();
  if (!s || s === "nan") return 0;

  if (s.includes("half")) {
    const whole = Number.parseFloat(s.split("+")[0].trim());
    if (Number.isFinite(whole)) return whole + 0.5;
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function toNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = typeof val === "number" ? val : Number.parseFloat(String(val));
  return Number.isFinite(n) ? n : 0;
}

function is55Plus(home: Home): boolean {
  if (home.is_55_plus) return true;
  const community = String(home.community ?? "").toLowerCase();
  return community.includes("55+") || community.includes("active adult");
}

/**
 * Hard filters. A home either qualifies or it doesn't — no partial credit.
 * Mirrors filter_homes() including the quirk that COMING_SOON homes are
 * allowed through with a zero price.
 */
export function filterHomes(homes: Home[], filters: Filters): Home[] {
  const cities = filters.cities?.length
    ? filters.cities
    : filters.city && filters.city !== "all"
      ? [filters.city]
      : [];

  const minBeds = filters.minBeds ?? 0;
  const minBaths = filters.minBaths ?? 0;
  const builders = filters.builders?.length ? new Set(filters.builders) : null;
  const communities = filters.communities?.length ? new Set(filters.communities) : null;
  const statuses = filters.status?.length
    ? new Set(filters.status.map((s) => s.toUpperCase()))
    : null;

  return homes.filter((h) => {
    if (cities.length && h.city && !cities.includes(h.city)) return false;

    if (filters.address) {
      const addressLower = filters.address.toLowerCase();
      const homeLower = String(h.address ?? "").toLowerCase();
      if (!homeLower.includes(addressLower)) return false;
    }

    if (filters.exclude55 && is55Plus(h)) return false;

    const status = String(h.status ?? "").toUpperCase();
    if (EXCLUDED_STATUSES.has(status)) return false;
    if (statuses && !statuses.has(status)) return false;

    if (toNumber(h.beds) < minBeds) return false;
    if (parseBaths(h.baths) < minBaths) return false;

    const price = toNumber(h.price);
    if (price <= 0 && status !== "COMING_SOON") return false;
    if (filters.maxPrice && price > filters.maxPrice) return false;
    if (filters.minPrice && price > 0 && price < filters.minPrice) return false;

    const sqft = toNumber(h.sqft);
    if (filters.minSqft && sqft > 0 && sqft < filters.minSqft) return false;

    if (builders && !builders.has(h.builder)) return false;
    if (communities && !communities.has(h.community)) return false;

    if (filters.priceDropOnly && !(h.price_drop && h.price_drop_amt > 0)) return false;
    if (filters.newOnly && !h.new_listing) return false;

    return true;
  });
}

/**
 * value_ppsf is scored relative to the rest of the result set, so the spread
 * has to be computed once over all candidates before scoring any of them.
 */
export interface PpsfSpread {
  best: number;
  spread: number;
}

export function computePpsfSpread(homes: Home[]): PpsfSpread | null {
  let best = Number.POSITIVE_INFINITY;
  let worst = Number.NEGATIVE_INFINITY;
  let seen = false;

  for (const h of homes) {
    const sqft = toNumber(h.sqft);
    const price = toNumber(h.price);
    if (sqft <= 0 || price <= 0) continue;
    const ppsf = price / sqft;
    if (ppsf < best) best = ppsf;
    if (ppsf > worst) worst = ppsf;
    seen = true;
  }

  if (!seen) return null;
  // Python uses a spread of 1 when every home has the same $/sqft, which
  // makes the term collapse to full marks rather than divide by zero.
  return { best, spread: worst !== best ? worst - best : 1 };
}

/**
 * Score a home 0-100. `spread` should come from computePpsfSpread() over the
 * same filtered set, matching how score_home() receives all_homes in Python.
 */
export function scoreHome(
  home: Home,
  filters: Filters,
  spread: PpsfSpread | null,
): number {
  const w: ScoringWeights = { ...DEFAULT_WEIGHTS, ...(filters.weights ?? {}) };
  let total = 0;

  const sqft = toNumber(home.sqft);
  const price = toNumber(home.price);

  if (sqft > 0 && price > 0 && spread) {
    const ppsf = price / sqft;
    total += (1 - (ppsf - spread.best) / spread.spread) * w.value_ppsf;
  }

  if (home.price_drop) total += w.price_drop;

  const status = String(home.status ?? "").toUpperCase();
  if (MOVE_IN_STATUSES.has(status)) total += w.availability;
  else if (IN_PROGRESS_STATUSES.has(status)) total += w.availability * 0.6;

  if (sqft >= 2500) total += w.sqft_bonus;
  else if (sqft >= 2000) total += w.sqft_bonus * 0.5;

  if (home.is_hotw) total += w.hotw;

  const community = String(home.community ?? "").toLowerCase();
  const preferredCommunities = filters.preferredCommunities ?? [];
  if (preferredCommunities.some((p) => community.includes(p.toLowerCase()))) {
    total += 5;
  }

  if (filters.preferredBuilders?.includes(home.builder)) total += 3;

  return Math.min(Math.round(total * 10) / 10, 100);
}

/** Attach a `score` to every home, using one shared $/sqft spread. */
export function scoreAll(homes: Home[], filters: Filters): Home[] {
  const spread = computePpsfSpread(homes);
  return homes.map((h) => ({ ...h, score: scoreHome(h, filters, spread) }));
}

function ppsfOf(h: Home): number {
  const sqft = toNumber(h.sqft);
  const price = toNumber(h.price);
  return sqft > 0 && price > 0 ? price / sqft : Number.POSITIVE_INFINITY;
}

/** Sorts in place and returns the array. */
export function sortHomes(homes: Home[], sort: Filters["sort"] = "score"): Home[] {
  switch (sort) {
    case "price_drop":
      return homes.sort(
        (a, b) => b.price_drop_amt - a.price_drop_amt || a.price - b.price,
      );
    case "ppsf":
      return homes.sort((a, b) => ppsfOf(a) - ppsfOf(b));
    case "price":
      return homes.sort((a, b) => a.price - b.price);
    case "price_desc":
      return homes.sort((a, b) => b.price - a.price);
    case "sqft":
      return homes.sort((a, b) => toNumber(b.sqft) - toNumber(a.sqft));
    case "newest":
      return homes.sort(
        (a, b) => Number(b.new_listing) - Number(a.new_listing) || (b.score ?? 0) - (a.score ?? 0),
      );
    case "score":
    default:
      return homes.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }
}
