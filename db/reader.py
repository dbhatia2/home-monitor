"""Read homes from MySQL for email generation. Multi-city parameterized."""

import json
from db.connection import get_connection


def load_homes(cities: list = None, include_sold: bool = False,
               include_55_plus: bool = True) -> list:
    """Load homes from MySQL. cities=None → all cities."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sf = "" if include_sold else 'AND h.status NOT IN ("SOLD")'
            pf = "" if include_55_plus else "AND co.is_55_plus = 0"

            if cities:
                placeholders = ",".join(["%s"] * len(cities))
                cf = f"AND ci.name IN ({placeholders})"
                params = tuple(cities)
            else:
                cf = ""
                params = ()

            cur.execute(f"""
                SELECT b.name AS builder, co.name AS community, co.is_55_plus,
                       ci.name AS city, h.id, h.address, h.home_url,
                       h.beds, h.baths, h.sqft, h.plan_name, h.homesite,
                       h.price, h.was_price, h.price_per_sqft AS ppsf,
                       h.status, h.is_hotw, h.price_drop,
                       h.price_drop_amt AS price_drop_amount,
                       h.prev_price, h.new_listing,
                       h.spotlight_features, h.first_seen_at, h.last_seen_at
                FROM homes h
                JOIN communities co ON co.id = h.community_id
                JOIN builders b    ON b.id  = co.builder_id
                JOIN cities ci     ON ci.id = co.city_id
                WHERE h.price > 0 {sf} {pf} {cf}
                ORDER BY ci.name, b.name, co.name, h.price
            """, params)
            rows = cur.fetchall()

            # Schools per community
            cur.execute("""
                SELECT co.name AS community, s.name AS school_name, s.grades,
                       s.type, s.district, s.rating_gs, s.rating_niche, s.url,
                       cs.distance, cs.approximate
                FROM community_schools cs
                JOIN schools s     ON s.id  = cs.school_id
                JOIN communities co ON co.id = cs.community_id
            """)
            srows = cur.fetchall()

        smap = {}
        for sr in srows:
            smap.setdefault(sr["community"], []).append({
                "name": sr["school_name"], "grades": sr["grades"] or "",
                "type": sr["type"] or "", "district": sr["district"] or "",
                "rating_gs": sr["rating_gs"], "rating_niche": sr["rating_niche"] or "",
                "rating_max": 10, "distance": sr["distance"] or "",
                "url": sr["url"] or "",
            })

        homes = []
        for r in rows:
            sf = r.get("spotlight_features")
            if isinstance(sf, str):
                try:
                    sf = json.loads(sf)
                except Exception:
                    sf = []

            homes.append({
                "builder": r["builder"], "community": r["community"], "city": r["city"],
                "address": r["address"] or "", "home_url": r["home_url"] or "",
                "beds": int(r["beds"] or 0), "baths": str(r["baths"] or ""),
                "sqft": float(r["sqft"] or 0), "plan_name": r["plan_name"] or "",
                "homesite": r["homesite"] or "",
                "price": float(r["price"] or 0),
                "was_price": float(r["was_price"]) if r["was_price"] else None,
                "price_drop": bool(r["price_drop"]),
                "price_drop_amount": float(r["price_drop_amount"] or 0),
                "prev_price": float(r["prev_price"]) if r["prev_price"] else None,
                "status": r["status"] or "", "is_hotw": bool(r["is_hotw"]),
                "is_available": True, "new_listing": bool(r["new_listing"]),
                "is_55_plus": bool(r["is_55_plus"]),
                "spotlight_features": sf or [],
                "schools": smap.get(r["community"], []),
            })
        return homes
    finally:
        conn.close()
