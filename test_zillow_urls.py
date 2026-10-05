#!/usr/bin/env python3
"""Test Zillow URL generation with real database addresses."""

import os
os.environ['POSTGRES_URL'] = 'postgresql://postgres.jddbiytluavjidmpkzxq:Poiuqwer%231983@aws-0-us-west-1.pooler.supabase.com:6543/postgres'

from db.connection import get_connection


def generate_zillow_url(address: str, city: str, state: str) -> str:
    """Generate Zillow URL (matches TypeScript implementation)."""
    street_address = address.split(',')[0].strip()
    clean_addr = street_address.replace('.', '').replace(',', '')
    clean_city = city.replace('.', '').replace(',', '')

    url_slug = f"{clean_addr} {clean_city} {state}".replace(' ', '-').replace(',', '')

    return f"https://www.zillow.com/homes/{url_slug}_rb/"


print("=" * 80)
print("ZILLOW URL GENERATION TEST")
print("=" * 80)

conn = get_connection()
cur = conn.cursor()

# Get sample homes from database
cur.execute("""
    SELECT h.address, ci.name as city, ci.state
    FROM homes h
    JOIN communities c ON c.id = h.community_id
    JOIN cities ci ON ci.id = c.city_id
    LIMIT 10
""")

homes = cur.fetchall()

for home in homes:
    addr = home['address']
    city = home['city']
    state = home['state']

    zillow_url = generate_zillow_url(addr, city, state)

    print(f"\nAddress: {addr}")
    print(f"City: {city}, {state}")
    print(f"Zillow: {zillow_url}")
    print("-" * 80)

conn.close()

print("\n" + "=" * 80)
print("TEST COMPLETE - Copy and test these URLs in your browser!")
print("=" * 80)
