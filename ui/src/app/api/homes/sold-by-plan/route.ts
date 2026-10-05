import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { SoldHomesResponse, SoldHome } from "@/lib/types";

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const planName = searchParams.get("plan_name");
  const communityId = searchParams.get("community_id");
  const limit = parseInt(searchParams.get("limit") || "20", 10);

  if (!planName) {
    return NextResponse.json(
      { error: "plan_name parameter is required" },
      { status: 400 }
    );
  }

  try {
    let query = `
      SELECT
        h.id, h.address, h.plan_name, h.price, h.last_seen_at, h.updated_at,
        h.homesite, h.beds, h.baths, h.sqft,
        h.sold_price, h.sold_date, h.sold_price_source, h.sold_price_verified,
        h.apn, h.sale_transaction_type, h.lot_size_acres, h.fips_code,
        h.sale_doc_number, h.attom_id, h.sale_recording_date,
        co.name AS community,
        ci.name AS city,
        ci.state
      FROM homes h
      JOIN communities co ON co.id = h.community_id
      JOIN cities ci ON ci.id = co.city_id
      WHERE h.status = 'SOLD'
        AND LOWER(h.plan_name) = LOWER($1)
    `;

    const params: (string | number)[] = [planName];
    let paramIndex = 2;

    if (communityId) {
      query += ` AND h.community_id = $${paramIndex}`;
      params.push(parseInt(communityId, 10));
      paramIndex++;
    }

    query += ` ORDER BY h.last_seen_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const { rows } = await pool.query(query, params);
    const soldHomes = rows as SoldHome[];

    if (soldHomes.length === 0) {
      return NextResponse.json(
        { error: "No sold homes found for this plan" },
        { status: 404 }
      );
    }

    const response: SoldHomesResponse = {
      plan_name: planName,
      total: soldHomes.length,
      sold_homes: soldHomes,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching sold homes:", error);
    return NextResponse.json(
      { error: "Failed to fetch sold homes" },
      { status: 500 }
    );
  }
}
