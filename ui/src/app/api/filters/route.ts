import pool from "@/lib/db";
import { json, preflight, withApi } from "@/lib/cors";
import type { BuilderFacet, CommunityFacet } from "@/lib/types";

/**
 * Facets used to populate the filter UI: which cities, builders, communities
 * and statuses actually have listings, plus the real price/sqft bounds so the
 * sliders never span empty ranges.
 */
export const GET = withApi(async () => {
  const { rows: cityRows } = await pool.query(
    "SELECT name FROM cities WHERE is_active = true ORDER BY name",
  );

  const { rows: builderRows } = await pool.query(`
    SELECT DISTINCT b.name, b.color_hex
    FROM builders b
    JOIN communities co ON co.builder_id = b.id
    JOIN homes h ON h.community_id = co.id
    WHERE b.is_active = true AND h.status NOT IN ('SOLD','FUTURE','MODEL_HOME')
    ORDER BY b.name
  `);

  const { rows: communityRows } = await pool.query(`
    SELECT DISTINCT co.name, ci.name AS city, b.name AS builder, co.is_55_plus
    FROM communities co
    JOIN cities ci ON ci.id = co.city_id
    JOIN builders b ON b.id = co.builder_id
    JOIN homes h ON h.community_id = co.id
    WHERE h.status NOT IN ('SOLD','FUTURE','MODEL_HOME')
    ORDER BY ci.name, co.name
  `);

  const { rows: statusRows } = await pool.query(`
    SELECT DISTINCT status
    FROM homes
    WHERE status NOT IN ('SOLD','FUTURE','MODEL_HOME')
    ORDER BY status
  `);

  const { rows: rangeRows } = await pool.query(`
    SELECT
      MIN(NULLIF(price, 0))  AS "minPrice",
      MAX(price)             AS "maxPrice",
      MIN(NULLIF(sqft, 0))   AS "minSqft",
      MAX(sqft)              AS "maxSqft",
      MAX(beds)              AS "maxBeds"
    FROM homes
    WHERE status NOT IN ('SOLD','FUTURE','MODEL_HOME')
  `);

  const r = rangeRows[0] ?? {};

  return json({
    cities: cityRows.map((row: any) => row.name as string),
    builders: builderRows.map((row: any) => ({
      name: row.name,
      color_hex: row.color_hex,
    })) as BuilderFacet[],
    communities: communityRows as unknown as CommunityFacet[],
    statuses: statusRows.map((row: any) => row.status as string),
    ranges: {
      minPrice: Number(r.minPrice ?? 0),
      maxPrice: Number(r.maxPrice ?? 0),
      minSqft: Number(r.minSqft ?? 0),
      maxSqft: Number(r.maxSqft ?? 0),
      maxBeds: Number(r.maxBeds ?? 0),
    },
  }, {
    headers: {
      // Cache for 1 hour, revalidate stale content for up to 24 hours
      // Filters change rarely (only during scraper runs, typically daily)
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
});

export async function OPTIONS() {
  return preflight();
}
