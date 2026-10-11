import pool from "@/lib/db";
import { json, preflight, withApi } from "@/lib/cors";
import type { NextRequest } from "next/server";

export const GET = withApi(async (req: NextRequest) => {
  const communityIds = req.nextUrl.searchParams.get("community_ids");

  if (!communityIds) {
    return json({ error: "community_ids is required" }, { status: 400 });
  }

  const ids = communityIds
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (ids.length === 0) {
    return json({ error: "No valid community_ids provided" }, { status: 400 });
  }

  if (ids.length > 50) {
    return json({ error: "Maximum 50 community_ids allowed" }, { status: 400 });
  }

  // Check if the schools tables exist before querying
  const { rows: tableCheck } = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'community_schools'
     ) AS exists`,
  );

  if (!tableCheck[0]?.exists) {
    return json({});
  }

  const { rows } = await pool.query(
    `SELECT s.name, s.grades, s.type, s.district, s.rating_gs,
            s.rating_niche, s.url, cs.distance, cs.approximate,
            cs.community_id
     FROM community_schools cs
     JOIN schools s ON s.id = cs.school_id
     WHERE cs.community_id = ANY($1)
     ORDER BY s.rating_gs DESC NULLS LAST, s.name`,
    [ids],
  );

  const grouped: Record<number, typeof rows> = {};
  for (const row of rows) {
    const cid = row.community_id;
    if (!grouped[cid]) grouped[cid] = [];
    const { community_id: _cid, ...school } = row;
    grouped[cid].push(school);
  }

  return json(grouped);
});

export async function OPTIONS() {
  return preflight();
}
