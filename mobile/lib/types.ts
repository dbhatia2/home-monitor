/**
 * Mirrors ui/src/lib/types.ts. Kept as a standalone copy so the Expo bundler
 * does not have to reach outside the mobile/ project root.
 */

export interface Home {
  id: number;
  address: string;
  home_url: string | null;
  beds: number | null;
  baths: string | null;
  sqft: number | null;
  plan_name: string | null;
  homesite: string | null;
  price: number;
  was_price: number | null;
  price_per_sqft: number | null;
  status: string;
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
  community_url?: string | null;
  builder_url?: string | null;
  first_seen_at?: string;
  last_seen_at?: string;
}

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
  statuses: string[];
  ranges: {
    minPrice: number;
    maxPrice: number;
    minSqft: number;
    maxSqft: number;
    maxBeds: number;
  };
}

export type SortKey =
  | "score"
  | "price_drop"
  | "ppsf"
  | "price"
  | "price_desc"
  | "sqft"
  | "newest";

/**
 * The user's saved search. This is the app-side equivalent of a row in
 * user_preferences / a file in profiles/.
 */
export interface Prefs {
  city: string;
  minBeds: number;
  minBaths: number;
  maxPrice: number | null;
  minSqft: number | null;
  builders: string[];
  exclude55: boolean;
  priceDropOnly: boolean;
  mirOnly: boolean;
  newOnly: boolean;
  preferredBuilders: string[];
  preferredCommunities: string[];
  sort: SortKey;
}

export const DEFAULT_PREFS: Prefs = {
  city: "all",
  minBeds: 0,
  minBaths: 0,
  maxPrice: null,
  minSqft: null,
  builders: [],
  exclude55: true,
  priceDropOnly: false,
  mirOnly: false,
  newOnly: false,
  preferredBuilders: [],
  preferredCommunities: [],
  sort: "score",
};
