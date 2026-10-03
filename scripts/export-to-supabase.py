#!/usr/bin/env python3
"""
Export data from local PostgreSQL to Supabase-compatible SQL
"""
import psycopg2
from psycopg2.extras import RealDictCursor

# Local PostgreSQL connection
pg_conn = psycopg2.connect(
    host='localhost',
    port=5432,
    user='dbhatia',
    database='home_monitor_prod'
)

def quote_value(val):
    """Quote and escape SQL value"""
    if val is None:
        return 'NULL'
    elif isinstance(val, bool):
        return 'true' if val else 'false'
    elif isinstance(val, (int, float)):
        return str(val)
    else:
        # Escape single quotes
        escaped = str(val).replace("'", "''")
        return f"'{escaped}'"

with open('/Users/dbhatia/github_personal/home-monitor/supabase-data.sql', 'w') as f:
    cur = pg_conn.cursor(cursor_factory=RealDictCursor)

    # Export builders
    print("Exporting builders...")
    cur.execute("SELECT * FROM builders ORDER BY id")
    rows = cur.fetchall()
    if rows:
        f.write("-- Builders\n")
        f.write("INSERT INTO builders (id, name, color_hex, base_url, active, created_at) VALUES\n")
        values = []
        for row in rows:
            values.append(f"({row['id']}, {quote_value(row['name'])}, {quote_value(row['color_hex'])}, {quote_value(row['base_url'])}, {quote_value(row['active'])}, {quote_value(row['created_at'])})")
        f.write(',\n'.join(values) + ';\n\n')

    # Export cities
    print("Exporting cities...")
    cur.execute("SELECT * FROM cities ORDER BY id")
    rows = cur.fetchall()
    if rows:
        f.write("-- Cities\n")
        f.write("INSERT INTO cities (id, name, state, county, zip_codes, schools_url, active, created_at) VALUES\n")
        values = []
        for row in rows:
            values.append(f"({row['id']}, {quote_value(row['name'])}, {quote_value(row['state'])}, {quote_value(row['county'])}, {quote_value(row['zip_codes'])}, {quote_value(row['schools_url'])}, {quote_value(row['active'])}, {quote_value(row['created_at'])})")
        f.write(',\n'.join(values) + ';\n\n')

    # Export communities
    print("Exporting communities...")
    cur.execute("SELECT * FROM communities ORDER BY id")
    rows = cur.fetchall()
    if rows:
        f.write("-- Communities\n")
        f.write("INSERT INTO communities (id, builder_id, city_id, name, slug, url, status, active, is_55_plus, meta, created_at, updated_at) VALUES\n")
        values = []
        for row in rows:
            values.append(f"({row['id']}, {row['builder_id']}, {row['city_id']}, {quote_value(row['name'])}, {quote_value(row['slug'])}, {quote_value(row['url'])}, {quote_value(row['status'])}, {quote_value(row['active'])}, {quote_value(row['is_55_plus'])}, {quote_value(row['meta'])}, {quote_value(row['created_at'])}, {quote_value(row['updated_at'])})")
        f.write(',\n'.join(values) + ';\n\n')

    # Export homes (in batches due to size)
    print("Exporting homes...")
    cur.execute("SELECT COUNT(*) as count FROM homes")
    total = cur.fetchone()['count']
    print(f"Total homes: {total}")

    batch_size = 500
    offset = 0

    while offset < total:
        cur.execute(f"SELECT * FROM homes ORDER BY id LIMIT {batch_size} OFFSET {offset}")
        rows = cur.fetchall()

        if rows:
            f.write(f"-- Homes (batch {offset//batch_size + 1})\n")
            f.write("INSERT INTO homes (id, community_id, address, home_url, beds, baths, sqft, plan_name, homesite, price, was_price, price_per_sqft, status, is_hotw, price_drop, price_drop_amt, prev_price, new_listing, drop_source, spotlight_features, builder_meta, first_seen_at, last_seen_at, updated_at) VALUES\n")
            values = []
            for row in rows:
                values.append(f"({row['id']}, {quote_value(row['community_id'])}, {quote_value(row['address'])}, {quote_value(row['home_url'])}, {quote_value(row['beds'])}, {quote_value(row['baths'])}, {quote_value(row['sqft'])}, {quote_value(row['plan_name'])}, {quote_value(row['homesite'])}, {quote_value(row['price'])}, {quote_value(row['was_price'])}, {quote_value(row['price_per_sqft'])}, {quote_value(row['status'])}, {quote_value(row['is_hotw'])}, {quote_value(row['price_drop'])}, {quote_value(row['price_drop_amt'])}, {quote_value(row['prev_price'])}, {quote_value(row['new_listing'])}, {quote_value(row['drop_source'])}, {quote_value(row['spotlight_features'])}, {quote_value(row['builder_meta'])}, {quote_value(row['first_seen_at'])}, {quote_value(row['last_seen_at'])}, {quote_value(row['updated_at'])})")
            f.write(',\n'.join(values) + ';\n\n')

        offset += batch_size
        print(f"Exported {min(offset, total)}/{total} homes")

pg_conn.close()
print("\n✅ Export complete: supabase-data.sql")
