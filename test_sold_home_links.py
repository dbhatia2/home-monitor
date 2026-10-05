#!/usr/bin/env python3
"""Test different platforms for sold home links."""

import urllib.parse


def generate_zillow_url(address: str, city: str, state: str) -> str:
    """
    Generate Zillow search URL.
    Format: https://www.zillow.com/homes/{address}-{city}-{state}_rb/
    """
    # Clean and format address
    clean_addr = address.replace(',', '').replace('.', '').strip()
    clean_city = city.replace(',', '').strip()

    # Create slug-like format
    search_string = f"{clean_addr} {clean_city} {state}"
    url_slug = search_string.replace(' ', '-').replace(',', '')

    return f"https://www.zillow.com/homes/{url_slug}_rb/"


def generate_realtor_url(address: str, city: str, state: str) -> str:
    """
    Generate Realtor.com search URL.
    Format: https://www.realtor.com/realestateandhomes-search/{City}_{ST}/{address}
    """
    # Clean address
    clean_addr = address.replace(',', '').replace('.', '').strip()
    clean_city = city.replace(',', '').replace(' ', '-').strip()

    # Create URL
    url_slug = clean_addr.replace(' ', '-')
    return f"https://www.realtor.com/realestateandhomes-search/{clean_city}_{state}/{url_slug}"


def generate_trulia_url(address: str, city: str, state: str) -> str:
    """
    Generate Trulia search URL.
    Format: https://www.trulia.com/sold/{city},{state}/{address}
    """
    # Clean and format
    clean_addr = address.replace(',', '').replace('.', '').strip()
    clean_city = city.replace(',', '').strip()

    url_slug = clean_addr.replace(' ', '-')
    return f"https://www.trulia.com/sold/{clean_city},{state}/{url_slug}"


def generate_homescom_url(address: str, city: str, state: str) -> str:
    """
    Generate Homes.com search URL.
    Format: https://www.homes.com/search/{city}-{state}/{address}
    """
    clean_addr = address.replace(',', '').replace('.', '').strip()
    clean_city = city.replace(',', '').replace(' ', '-').strip()

    url_slug = clean_addr.replace(' ', '-')
    return f"https://www.homes.com/search/{clean_city}-{state}/{url_slug}/"


def generate_redfin_search_url(address: str, city: str, state: str) -> str:
    """
    Generate Redfin search URL (current implementation).
    """
    street_address = address.split(',')[0].strip()
    search_query = urllib.parse.quote(f"{street_address}, {city}, {state}")
    return f"https://www.redfin.com/?searchQuery={search_query}"


# Test addresses from database
test_addresses = [
    ("7000 Dragon Stone Drive", "Roseville", "CA"),
    ("8065 Winterfell Way", "Roseville", "CA"),
    ("1355 Lassen Street", "Tracy", "CA"),
]

print("=" * 80)
print("TESTING SOLD HOME LINK PLATFORMS")
print("=" * 80)

for addr, city, state in test_addresses:
    print(f"\nAddress: {addr}, {city}, {state}")
    print("-" * 80)

    print(f"Zillow:     {generate_zillow_url(addr, city, state)}")
    print(f"Realtor:    {generate_realtor_url(addr, city, state)}")
    print(f"Trulia:     {generate_trulia_url(addr, city, state)}")
    print(f"Homes.com:  {generate_homescom_url(addr, city, state)}")
    print(f"Redfin:     {generate_redfin_search_url(addr, city, state)}")

print("\n" + "=" * 80)
print("Please test these URLs in your browser to see which platform works best!")
print("=" * 80)
