"""Write scraped homes to PostgreSQL. City derived per-home. Per-builder transactions."""

import json
import logging
from datetime import datetime
from db.connection import get_connection
from db.config_reader import get_city_id

log = logging.getLogger(__name__)


def _get_builder_id(cur, name):
    cur.execute("SELECT id FROM builders WHERE name = %s", (name,))
    r = cur.fetchone()
    return r["id"] if r else None


def _get_or_create_community(cur, builder_id, city_id, name, url="", is_55=False, status="active"):
    cur.execute("SELECT id FROM communities WHERE builder_id=%s AND city_id=%s AND name=%s",
                (builder_id, city_id, name))
    r = cur.fetchone()
    if r:
        return r["id"]
    cur.execute("""INSERT INTO communities (builder_id,city_id,name,url,status,is_55_plus)
                   VALUES(%s,%s,%s,%s,%s,%s) RETURNING id""",
                (builder_id, city_id, name, url, status, is_55))
    return cur.fetchone()["id"]


def _upsert_home(cur, home, community_id, ts):
    addr = home.get("address", "")
    cur.execute("SELECT id, price FROM homes WHERE community_id=%s AND address=%s", (community_id, addr))
    ex = cur.fetchone()
    old_p = ex["price"] if ex else None
    new_p = int(home.get("price") or 0)
    changed = ex is not None and old_p != new_p

    sqft = home.get("sqft")
    ppsf = int(new_p / sqft) if sqft and sqft > 0 else None
    sf = home.get("spotlight_features")
    sfj = json.dumps(sf) if isinstance(sf, (list, dict)) else None

    cur.execute("""
        INSERT INTO homes (community_id,address,home_url,beds,baths,sqft,plan_name,homesite,
            price,was_price,price_per_sqft,status,is_hotw,price_drop,price_drop_amt,
            drop_source,prev_price,new_listing,spotlight_features,first_seen_at,last_seen_at)
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (community_id, address)
        DO UPDATE SET
            home_url=EXCLUDED.home_url,
            price=EXCLUDED.price,
            was_price=EXCLUDED.was_price,
            price_per_sqft=EXCLUDED.price_per_sqft,
            status=EXCLUDED.status,
            is_hotw=EXCLUDED.is_hotw,
            price_drop=EXCLUDED.price_drop,
            price_drop_amt=EXCLUDED.price_drop_amt,
            prev_price=EXCLUDED.prev_price,
            new_listing=EXCLUDED.new_listing,
            spotlight_features=EXCLUDED.spotlight_features,
            last_seen_at=EXCLUDED.last_seen_at
        RETURNING id
    """, (
        community_id, addr,
        (home.get("home_url", "")[:499] or None),
        int(home.get("beds") or 0) or None,
        str(home.get("baths") or "")[:19] or None,
        int(sqft) if sqft else None,
        str(home.get("plan_name") or "")[:99] or None,
        str(home.get("homesite") or "")[:19] or None,
        new_p,
        int(home.get("was_price")) if home.get("was_price") else None,
        ppsf,
        str(home.get("status") or "UNKNOWN")[:29],
        bool(home.get("is_hotw")),
        bool(home.get("price_drop")),
        int(home.get("price_drop_amount") or 0),
        str(home.get("drop_source") or "snapshot")[:19],
        int(home.get("prev_price")) if home.get("prev_price") else None,
        bool(home.get("new_listing")),
        sfj, ts, ts,
    ))
    return cur.fetchone()["id"], changed, old_p


def _insert_price_history(cur, hid, old_p, new_p, home, ts):
    da = old_p - new_p if old_p > new_p else 0
    dp = round(da / old_p * 100, 2) if old_p else 0
    cur.execute("INSERT INTO price_history (home_id,old_price,new_price,drop_amt,drop_pct,drop_source,changed_at) "
                "VALUES(%s,%s,%s,%s,%s,%s,%s)",
                (hid, old_p, new_p, da, dp, home.get("drop_source", "snapshot"), ts))


def _upsert_school(cur, school, city_id):
    name = str(school.get("name") or "")[:149]
    if not name:
        return None
    cur.execute("""INSERT INTO schools (name,grades,type,district,rating_gs,rating_niche,url,city_id)
        VALUES(%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (name, city_id)
        DO UPDATE SET
            grades=EXCLUDED.grades,
            rating_gs=EXCLUDED.rating_gs,
            updated_at=NOW()
        RETURNING id""",
        (name, str(school.get("grades") or "")[:19], str(school.get("type") or "")[:19],
         str(school.get("district") or "")[:149],
         int(school.get("rating_gs")) if school.get("rating_gs") is not None else None,
         str(school.get("rating_niche") or "")[:4],
         str(school.get("url") or "")[:499], city_id))
    r = cur.fetchone()
    return r["id"] if r else None


def write_all(homes: list, scraped_at: datetime, stats: dict) -> dict:
    """Write all homes to PostgreSQL. Per-builder transactions. City from home['city']."""
    t0 = datetime.now()
    summary = {"homes_written": 0, "prices_tracked": 0, "schools_written": 0,
               "communities_seen": 0, "errors": []}

    conn = get_connection()
    try:
        # Snapshot row
        with conn.cursor() as cur:
            cur.execute("INSERT INTO snapshots (run_at,homes_total,homes_active,drops_count,new_listings) "
                        "VALUES(%s,%s,%s,%s,%s)",
                        (scraped_at, stats.get("homes_total", 0), stats.get("homes_active", 0),
                         stats.get("drops_count", 0), stats.get("new_listings", 0)))
            conn.commit()

        # Group by builder
        by_builder = {}
        for h in homes:
            by_builder.setdefault(h.get("builder", "Unknown"), []).append(h)

        city_cache = {}
        comm_cache = {}

        for builder_name, builder_homes in by_builder.items():
            try:
                with conn.cursor() as cur:
                    bid = _get_builder_id(cur, builder_name)
                    if not bid:
                        summary["errors"].append(f"Unknown builder: {builder_name}")
                        continue

                    for home in builder_homes:
                        cn = home.get("community", "")
                        city_name = home.get("city", "")
                        if not cn or not city_name:
                            continue

                        # City ID — cached per run
                        if city_name not in city_cache:
                            city_cache[city_name] = get_city_id(cur, city_name)
                        cid = city_cache[city_name]
                        if not cid:
                            continue

                        # Community — cached per run
                        ck = (bid, cid, cn)
                        if ck not in comm_cache:
                            is55 = bool(home.get("is_55_plus")) or "55+" in cn.lower()
                            st = "coming_soon" if str(home.get("status", "")).upper() == "COMING_SOON" else "active"
                            comm_cache[ck] = _get_or_create_community(cur, bid, cid, cn, home.get("home_url", ""), is55, st)
                        community_id = comm_cache[ck]
                        summary["communities_seen"] = len(comm_cache)

                        if str(home.get("status", "")).upper() == "COMING_SOON" and not home.get("price"):
                            continue

                        try:
                            hid, changed, old_p = _upsert_home(cur, home, community_id, scraped_at)
                            summary["homes_written"] += 1
                            if changed and old_p is not None:
                                _insert_price_history(cur, hid, old_p, int(home.get("price") or 0), home, scraped_at)
                                summary["prices_tracked"] += 1
                        except Exception as e:
                            summary["errors"].append(str(e)[:200])
                            continue

                        for sch in (home.get("schools") or []):
                            if not isinstance(sch, dict):
                                continue
                            try:
                                sid = _upsert_school(cur, sch, cid)
                                if sid:
                                    cur.execute("""INSERT INTO community_schools (community_id,school_id,distance,approximate)
                                                   VALUES(%s,%s,%s,%s)
                                                   ON CONFLICT (community_id, school_id)
                                                   DO UPDATE SET distance=EXCLUDED.distance""",
                                                (community_id, sid, sch.get("distance", ""),
                                                 bool(sch.get("approximate"))))
                                    summary["schools_written"] += 1
                            except Exception:
                                pass

                conn.commit()
                log.info(f"  + {builder_name}: {len(builder_homes)} homes committed")
            except Exception as e:
                conn.rollback()
                summary["errors"].append(f"{builder_name}: {e}")
    finally:
        conn.close()

    summary["duration_sec"] = int((datetime.now() - t0).total_seconds())
    return summary
