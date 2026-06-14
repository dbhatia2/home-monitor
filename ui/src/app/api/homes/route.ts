import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");           // "Tracy" or null=all
  const minBeds = searchParams.get("minBeds");     // "4" or null
  const sort = searchParams.get("sort") || "price_drop"; // "price_drop" | "sqft" | "ppsf"
  const limit = Number(searchParams.get("limit") || 50);

  let where = "WHERE h.price > 0 AND h.status NOT IN ('SOLD','FUTURE')";
  const params: (string | number)[] = [];

  if (city && city !== "all") {
    where += " AND ci.name = ?";
    params.push(city);
  }
  if (minBeds) {
    where += " AND h.beds >= ?";
    params.push(Number(minBeds));
  }

  let orderBy = "ORDER BY h.price_drop_amt DESC, h.price ASC";
  if (sort === "sqft") orderBy = "ORDER BY h.sqft DESC";
  if (sort === "ppsf") orderBy = "ORDER BY (h.price / NULLIF(h.sqft, 0)) ASC";
  if (sort === "price") orderBy = "ORDER BY h.price ASC";

  const sql = `
    SELECT
      h.id, h.address, h.home_url, h.beds, h.baths, h.sqft,
      h.plan_name, h.price, h.was_price, h.price_per_sqft,
      h.status, h.is_hotw, h.price_drop, h.price_drop_amt,
      h.prev_price, h.new_listing,
      b.name AS builder, b.color_hex AS builder_color,
      co.name AS community, co.is_55_plus,
      ci.name AS city
    FROM homes h
    JOIN communities co ON co.id = h.community_id
    JOIN builders b ON b.id = co.builder_id
    JOIN cities ci ON ci.id = co.city_id
    ${where}
    ${orderBy}
    LIMIT ?
  `;
  params.push(limit);

  try {
    const [rows] = await pool.query<RowDataPacket[]>(sql, params);

    // Stats
    const [statsRows] = await pool.query<RowDataPacket[]>(`
      SELECT ci.name AS city,
             COUNT(*) AS total,
             SUM(h.status IN ('MOVE_IN_READY','QUICK_MOVE_IN')) AS mir,
             SUM(h.price_drop = 1) AS drops,
             ROUND(AVG(h.price)) AS avg_price,
             ROUND(AVG(h.price / NULLIF(h.sqft, 0))) AS avg_ppsf
      FROM homes h
      JOIN communities co ON co.id = h.community_id
      JOIN cities ci ON ci.id = co.city_id
      WHERE h.price > 0 AND h.status NOT IN ('SOLD','FUTURE')
      GROUP BY ci.name
    `);

    // Cities list
    const [cityRows] = await pool.query<RowDataPacket[]>(
      "SELECT name FROM cities WHERE active = 1 ORDER BY name"
    );

    return NextResponse.json({
      homes: rows,
      stats: statsRows,
      cities: cityRows.map((r) => r.name),
      total: rows.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
