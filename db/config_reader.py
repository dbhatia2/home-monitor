"""Read cities, builders, communities config from DB."""

import json
from db.connection import get_connection


def get_active_cities() -> list:
    """Return all active cities with schools_url."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, state, county, schools_url FROM cities WHERE active = true")
            return cur.fetchall()
    finally:
        conn.close()


def get_active_communities() -> list:
    """Return all active communities with builder and city names joined."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT c.id, c.name, c.slug, c.url, c.status, c.is_55_plus, c.builder_meta,
                       b.name AS builder, ci.name AS city
                FROM communities c
                JOIN builders b ON b.id = c.builder_id
                JOIN cities ci  ON ci.id = c.city_id
                WHERE c.status != 'sold_out' AND b.active = true AND ci.active = true
                ORDER BY ci.name, b.name, c.name
            """)
            rows = cur.fetchall()
        for r in rows:
            meta = r.get("builder_meta")
            if isinstance(meta, str):
                try:
                    r["builder_meta"] = json.loads(meta)
                except Exception:
                    r["builder_meta"] = None
        return rows
    finally:
        conn.close()


def get_builders() -> dict:
    """Return {builder_name: {color_hex, base_url}}."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT name, color_hex, base_url FROM builders WHERE active = true")
            return {r["name"]: r for r in cur.fetchall()}
    finally:
        conn.close()


def get_city_id(cur, city_name: str, state: str = "CA"):
    cur.execute("SELECT id FROM cities WHERE name = %s AND state = %s", (city_name, state))
    r = cur.fetchone()
    return r["id"] if r else None
