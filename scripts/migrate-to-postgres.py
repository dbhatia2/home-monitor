#!/usr/bin/env python3
"""
Migrate data from MySQL to local PostgreSQL
"""
import mysql.connector
import psycopg2
from psycopg2.extras import execute_values

# MySQL connection
mysql_conn = mysql.connector.connect(
    host='127.0.0.1',
    port=3310,
    user='monitor',
    password='monitor123',
    database='home_monitor'
)

# PostgreSQL connection (local)
pg_conn = psycopg2.connect(
    host='localhost',
    port=5432,
    user='dbhatia',
    database='home_monitor_prod'
)

mysql_cur = mysql_conn.cursor(dictionary=True)
pg_cur = pg_conn.cursor()

print("Migrating communities...")
mysql_cur.execute("""
    SELECT id, builder_id, city_id, name, slug, url, status,
           community_live as active, is_55_plus, builder_meta,
           created_at, updated_at
    FROM communities
    ORDER BY id
""")

communities = []
for row in mysql_cur.fetchall():
    communities.append((
        row['id'],
        row['builder_id'],
        row['city_id'],
        row['name'],
        row['slug'],
        row['url'],
        row['status'],
        bool(row['active']),
        bool(row['is_55_plus']),
        row['builder_meta'],
        row['created_at'],
        row['updated_at']
    ))

execute_values(pg_cur, """
    INSERT INTO communities (id, builder_id, city_id, name, slug, url, status, active, is_55_plus, meta, created_at, updated_at)
    VALUES %s
""", communities)
print(f"✅ Migrated {len(communities)} communities")

print("Migrating homes...")
mysql_cur.execute("""
    SELECT id, community_id, address, home_url, beds, baths, sqft,
           plan_name, homesite, price, was_price, price_per_sqft,
           status, is_hotw, price_drop, price_drop_amt,
           prev_price, new_listing, drop_source,
           spotlight_features, builder_meta,
           first_seen_at, last_seen_at, updated_at
    FROM homes
    ORDER BY id
""")

homes = []
for row in mysql_cur.fetchall():
    # Convert baths to numeric - handle text values
    baths = row['baths']
    if isinstance(baths, str):
        # Try to extract first number
        import re
        match = re.search(r'(\d+\.?\d*)', baths)
        baths = float(match.group(1)) if match else None
    elif baths is not None:
        baths = float(baths)

    homes.append((
        row['id'],
        row['community_id'],
        row['address'],
        row['home_url'],
        row['beds'],
        baths,
        row['sqft'],
        row['plan_name'],
        row['homesite'],
        row['price'],
        row['was_price'],
        row['price_per_sqft'],
        row['status'],
        bool(row['is_hotw']) if row['is_hotw'] is not None else False,
        bool(row['price_drop']) if row['price_drop'] is not None else False,
        row['price_drop_amt'],
        row['prev_price'],
        bool(row['new_listing']) if row['new_listing'] is not None else False,
        row['drop_source'],
        row['spotlight_features'],
        row['builder_meta'],
        row['first_seen_at'],
        row['last_seen_at'],
        row['updated_at']
    ))

execute_values(pg_cur, """
    INSERT INTO homes (id, community_id, address, home_url, beds, baths, sqft,
                      plan_name, homesite, price, was_price, price_per_sqft,
                      status, is_hotw, price_drop, price_drop_amt,
                      prev_price, new_listing, drop_source,
                      spotlight_features, builder_meta,
                      first_seen_at, last_seen_at, updated_at)
    VALUES %s
""", homes)
print(f"✅ Migrated {len(homes)} homes")

pg_conn.commit()
mysql_cur.close()
pg_cur.close()
mysql_conn.close()
pg_conn.close()

print("\n✅ Migration complete!")
print(f"   {len(communities)} communities")
print(f"   {len(homes)} homes")
