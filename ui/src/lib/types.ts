/**
 * Shared types for the Home Monitor API and clients.
 *
 * Field names mirror the MySQL columns returned by the /api/homes query so a
 * row can be passed straight through without remapping.
 */

export type HomeStatus =
  | "MOVE_IN_READY"
  | "QUICK_MOVE_IN"
  | "AVAILABLE"
  | "UNDER_CONSTRUCTION"
  | "COMING_SOON"
  | "MODEL_HOME"
  | "SOLD"
  | "FUTURE"
  | (string & {});

export interface Home {
  id: number;
  address: string;
  home_url: string | null;
  beds: number | null;
  /** Free text from builders, e.g. "2", "2.5", "2 + 1 half". */
  baths: string | null;
  sqft: number | null;
  plan_name: string | null;
  homesite: string | null;
  price: number;
  was_price: number | null;
  price_per_sqft: number | null;
  status: HomeStatus;
  is_hotw: number;
  price_drop: number;
  price_drop_amt: number;
  prev_price: number | null;
  new_listing: number;
  builder: string;
  builder_color: string | null;
  community: string;
  is_55_plus: number;
  city: string;
  drop_source: string | null;
  spotlight_features: Record<string, unknown> | null;
  builder_meta: Record<string, unknown> | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  updated_at: string | null;
  /** Computed by scoring.ts, 0-100. Absent on non-scored endpoints. */
  score?: number;
}

export interface School {
  name: string;
  grades: string | null;
  type: string | null;
  district: string | null;
  rating_gs: number | null;
  rating_niche: string | null;
  url: string | null;
  distance: string | null;
  approximate: number;
}

export interface PricePoint {
  old_price: number | null;
  new_price: number;
  drop_amt: number | null;
  drop_pct: number | null;
  drop_source: string | null;
  changed_at: string;
}

export interface HomeDetail extends Home {
  schools: School[];
  price_history: PricePoint[];
}

/**
 * Scoring weights. Mirrors DEFAULTS_WEIGHTS in profiles/schema.py.
 */
export interface ScoringWeights {
  value_ppsf: number;
  price_drop: number;
  availability: number;
  sqft_bonus: number;
  hotw: number;
}

/**
 * The client-side equivalent of profiles/schema.py Profile.
 * Everything is optional so the API can be called with no filters at all.
 */
export interface Filters {
  city?: string;
  cities?: string[];
  minBeds?: number;
  minBaths?: number;
  minPrice?: number;
  maxPrice?: number;
  minSqft?: number;
  builders?: string[];
  communities?: string[];
  status?: string[];
  exclude55?: boolean;
  priceDropOnly?: boolean;
  newOnly?: boolean;
  preferredBuilders?: string[];
  preferredCommunities?: string[];
  weights?: Partial<ScoringWeights>;
  sort?: SortKey;
  limit?: number;
  offset?: number;
}

export type SortKey =
  | "score"
  | "price_drop"
  | "ppsf"
  | "price"
  | "price_desc"
  | "sqft"
  | "newest";

export interface CityStats {
  city: string;
  total: number;
  mir: number;
  drops: number;
  avg_price: number;
  avg_ppsf: number;
}

export interface HomesResponse {
  homes: Home[];
  stats: CityStats[];
  cities: string[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface BuilderFacet {
  name: string;
  color_hex: string | null;
}

export interface CommunityFacet {
  name: string;
  city: string;
  builder: string;
  is_55_plus: number;
}

export interface FiltersResponse {
  cities: string[];
  builders: BuilderFacet[];
  communities: CommunityFacet[];
  ranges: {
    minPrice: number;
    maxPrice: number;
    minSqft: number;
    maxSqft: number;
    maxBeds: number;
  };
  statuses: string[];
}
