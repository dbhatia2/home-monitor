#!/usr/bin/env python3
"""
Fetch actual sold prices from ATTOM API for homes marked as SOLD.

This script queries the ATTOM Property Data API to get actual sold prices from
county records for homes that are marked as SOLD but don't have a verified sold price yet.

Requirements:
    - ATTOM_API_KEY environment variable
    - requests library (pip install requests)

Usage:
    python scripts/fetch_sold_prices.py --dry-run    # Preview API calls
    python scripts/fetch_sold_prices.py --execute    # Fetch and store prices
    python scripts/fetch_sold_prices.py --execute --limit 10  # Process only 10 homes
"""

import sys
import argparse
import os
import time
from datetime import datetime
from pathlib import Path

try:
    import requests
    from requests.packages.urllib3.exceptions import InsecureRequestWarning
    requests.packages.urllib3.disable_warnings(InsecureRequestWarning)
except ImportError:
    print("❌ Error: requests library not installed")
    print("   Install with: pip install requests")
    sys.exit(1)

# Disable SSL verification for macOS certificate issues
# TODO: Fix SSL certificates properly later
SSL_VERIFY = False

from dotenv import load_dotenv

# Add parent directory to path so we can import db module
sys.path.insert(0, str(Path(__file__).parent.parent))

from db.connection import get_connection

# Load environment variables
load_dotenv()

# API Configuration
ATTOM_API_KEY = os.getenv('ATTOM_API_KEY')
ATTOM_BASE_URL = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0'


def get_sold_homes_needing_lookup(cursor, limit=None):
    """
    Find SOLD homes that don't have verified sold prices yet.

    Args:
        cursor: Database cursor
        limit: Maximum number of homes to fetch (None for all)

    Returns:
        List of sold home records needing price lookup
    """
    query = """
        SELECT
            h.id,
            h.address,
            h.price as builder_price,
            ci.name as city,
            ci.state,
            co.name as community,
            h.last_seen_at
        FROM homes h
        JOIN communities co ON h.community_id = co.id
        JOIN cities ci ON co.city_id = ci.id
        WHERE h.status = 'SOLD'
          AND (h.sold_price IS NULL OR h.sold_price_verified = FALSE)
        ORDER BY h.last_seen_at DESC
    """

    if limit:
        query += f" LIMIT {limit}"

    cursor.execute(query)
    return cursor.fetchall()


def fetch_sold_price_from_attom(address, city, state):
    """
    Fetch sold price from ATTOM Property API.

    ATTOM API endpoints:
    - /property/detail - Property details including sale history
    - /sale/detail - Detailed sale transaction history
    - /sale/snapshot - Latest sale information

    Args:
        address: Street address (e.g., "123 Main St, City, ST" - may include city)
        city: City name
        state: State code (e.g., 'CA')

    Returns:
        Dictionary with sold_price, sold_date, and source, or None if not found
    """
    if not ATTOM_API_KEY:
        raise ValueError("ATTOM_API_KEY environment variable not set")

    # Clean up address - remove city/state if present in address field
    # Database stores "123 Main St, City, ST" but API needs just street address
    street_addr = address.split(',')[0].strip() if ',' in address else address

    # Try the sale/snapshot endpoint first (most likely to have recent sale data)
    endpoint = f"{ATTOM_BASE_URL}/sale/snapshot"

    headers = {
        'apikey': ATTOM_API_KEY,
        'Accept': 'application/json'
    }

    params = {
        'address1': street_addr,
        'address2': f"{city}, {state}"
    }

    try:
        response = requests.get(endpoint, headers=headers, params=params, timeout=10, verify=SSL_VERIFY)

        # Check for rate limiting or quota exceeded
        if response.status_code == 429:
            print(f"    ⚠️  Rate limit exceeded. Waiting 60s...")
            time.sleep(60)
            return None

        if response.status_code == 403:
            print(f"    ⚠️  API quota exceeded or invalid key")
            return None

        # ATTOM returns 400 with "SuccessWithoutResult" when no data found
        if response.status_code == 400:
            try:
                error_data = response.json()
                if error_data.get('status', {}).get('msg') == 'SuccessWithoutResult':
                    # This is normal - no sale data available for this property
                    return None
                else:
                    print(f"    ⚠️  Bad Request - {error_data.get('status', {}).get('msg', 'Unknown error')}")
                    return None
            except:
                print(f"    ⚠️  Bad Request - Response: {response.text[:200]}")
                return None

        response.raise_for_status()
        data = response.json()

        # Parse ATTOM response
        # The structure varies by endpoint, but typically:
        # {
        #   "status": {...},
        #   "property": [{
        #     "sale": {
        #       "saleTransDate": "2024-01-15",
        #       "saleAmtActual": 850000,
        #       "salePrice": 850000
        #     }
        #   }]
        # }

        if data.get('status', {}).get('code') == 0 and 'property' in data:
            properties = data['property']
            if properties and len(properties) > 0:
                property_data = properties[0]

                # Try to find sale information
                sale_info = property_data.get('sale')
                if sale_info:
                    # ATTOM API structure: sale.amount.saleamt
                    amount_info = sale_info.get('amount', {})
                    sale_price = (
                        amount_info.get('saleamt') if isinstance(amount_info, dict) else amount_info or
                        sale_info.get('saleAmtActual') or
                        sale_info.get('salePrice')
                    )
                    sale_date = (
                        sale_info.get('saleTransDate') or
                        sale_info.get('transactionDate') or
                        sale_info.get('date')
                    )

                    if sale_price:
                        # Extract additional property data from ATTOM API
                        identifier = property_data.get('identifier', {})
                        lot_info = property_data.get('lot', {})

                        return {
                            # Existing fields
                            'sold_price': int(sale_price),
                            'sold_date': sale_date,
                            'source': 'attom_api',

                            # NEW: Additional property data captured during 30-day trial
                            'apn': identifier.get('apn'),
                            'fips_code': identifier.get('fips'),
                            'attom_id': identifier.get('attomId'),
                            'lot_size_acres': lot_info.get('lotSize1'),
                            'sale_transaction_type': amount_info.get('saletranstype') if isinstance(amount_info, dict) else None,
                            'sale_doc_number': amount_info.get('saledocnum') if isinstance(amount_info, dict) else None,
                            'sale_recording_date': amount_info.get('salerecdate') if isinstance(amount_info, dict) else None,
                        }

        # If sale/snapshot didn't work, try property/detail endpoint
        endpoint2 = f"{ATTOM_BASE_URL}/property/detail"
        response2 = requests.get(endpoint2, headers=headers, params=params, timeout=10, verify=SSL_VERIFY)

        if response2.status_code == 200:
            data2 = response2.json()
            if data2.get('property') and len(data2['property']) > 0:
                prop = data2['property'][0]

                # Check for sale history in different possible locations
                sale_data = (
                    prop.get('sale') or
                    prop.get('lastSale') or
                    prop.get('mostRecentSale')
                )

                if sale_data:
                    amount_info = sale_data.get('amount', {})
                    sale_price = (
                        amount_info.get('saleamt') if isinstance(amount_info, dict) else amount_info or
                        sale_data.get('saleAmtActual') or
                        sale_data.get('salePrice')
                    )
                    sale_date = (
                        sale_data.get('saleTransDate') or
                        sale_data.get('transactionDate')
                    )

                    if sale_price:
                        # Extract additional property data
                        identifier = prop.get('identifier', {})
                        lot_info = prop.get('lot', {})

                        return {
                            # Existing fields
                            'sold_price': int(sale_price),
                            'sold_date': sale_date,
                            'source': 'attom_api',

                            # NEW: Additional property data
                            'apn': identifier.get('apn'),
                            'fips_code': identifier.get('fips'),
                            'attom_id': identifier.get('attomId'),
                            'lot_size_acres': lot_info.get('lotSize1'),
                            'sale_transaction_type': amount_info.get('saletranstype') if isinstance(amount_info, dict) else None,
                            'sale_doc_number': amount_info.get('saledocnum') if isinstance(amount_info, dict) else None,
                            'sale_recording_date': amount_info.get('salerecdate') if isinstance(amount_info, dict) else None,
                        }

        return None

    except requests.exceptions.RequestException as e:
        print(f"    ⚠️  API request failed: {e}")
        return None
    except Exception as e:
        print(f"    ⚠️  Error parsing response: {e}")
        # Debug: print response if available
        if 'data' in locals():
            import json
            print(f"    📋 Response structure: {json.dumps(data, indent=2)[:500]}")
        return None


def update_sold_price(cursor, home_id, data):
    """
    Update home record with verified sold price and additional ATTOM property data.

    Args:
        cursor: Database cursor
        home_id: Home ID to update
        data: Dictionary containing sold price and additional property data

    Returns:
        True if successful, False otherwise
    """
    update_query = """
        UPDATE homes
        SET sold_price = %s,
            sold_date = %s,
            sold_price_source = %s,
            sold_price_verified = TRUE,
            apn = %s,
            fips_code = %s,
            attom_id = %s,
            lot_size_acres = %s,
            sale_transaction_type = %s,
            sale_doc_number = %s,
            sale_recording_date = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
    """

    try:
        cursor.execute(update_query, (
            data['sold_price'],
            data.get('sold_date'),
            data['source'],
            data.get('apn'),
            data.get('fips_code'),
            data.get('attom_id'),
            data.get('lot_size_acres'),
            data.get('sale_transaction_type'),
            data.get('sale_doc_number'),
            data.get('sale_recording_date'),
            home_id
        ))
        return True
    except Exception as e:
        print(f"    ❌ Database update failed: {e}")
        return False


def format_price_diff(builder_price, sold_price):
    """
    Format the difference between builder price and actual sold price.

    Args:
        builder_price: Last listed price from builder
        sold_price: Actual sold price

    Returns:
        Formatted string showing the difference
    """
    if sold_price > builder_price:
        diff = sold_price - builder_price
        return f"+${diff:,} ({((diff / builder_price) * 100):.1f}% higher)"
    elif sold_price < builder_price:
        diff = builder_price - sold_price
        return f"-${diff:,} ({((diff / builder_price) * 100):.1f}% lower)"
    else:
        return "Exact match"


def print_summary(results):
    """
    Print a summary of the fetch operation.

    Args:
        results: Dictionary with success/failure counts
    """
    total = results['success'] + results['not_found'] + results['failed']

    print("\n" + "=" * 80)
    print("📊 SUMMARY")
    print("=" * 80)
    print(f"Total homes processed: {total}")
    print(f"✓ Successfully fetched: {results['success']}")
    print(f"⚠️  Not found in API: {results['not_found']}")
    print(f"❌ Failed/Error: {results['failed']}")
    print(f"💰 Total API calls made: {results['api_calls']}")

    if results['price_differences']:
        print("\n📈 Price Analysis:")
        avg_diff = sum(results['price_differences']) / len(results['price_differences'])
        print(f"   Average difference: ${avg_diff:,.0f}")
        print(f"   Max difference: ${max(results['price_differences']):,}")
        print(f"   Min difference: ${min(results['price_differences']):,}")

    print("=" * 80)


def main():
    parser = argparse.ArgumentParser(
        description="Fetch actual sold prices from ATTOM Property API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Preview what will be fetched (dry run):
    python scripts/fetch_sold_prices.py --dry-run

    # Fetch and store sold prices:
    python scripts/fetch_sold_prices.py --execute

    # Process only first 10 homes:
    python scripts/fetch_sold_prices.py --execute --limit 10
        """
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview homes that need lookup without calling API'
    )

    parser.add_argument(
        '--execute',
        action='store_true',
        help='Execute API calls and update database'
    )

    parser.add_argument(
        '--limit',
        type=int,
        help='Maximum number of homes to process'
    )

    args = parser.parse_args()

    # Validate arguments
    if not args.dry_run and not args.execute:
        parser.error("You must specify either --dry-run or --execute")

    if args.dry_run and args.execute:
        parser.error("Cannot specify both --dry-run and --execute")

    # Check API key if executing
    if args.execute and not ATTOM_API_KEY:
        print("❌ Error: ATTOM_API_KEY environment variable not set")
        print("   Get your API key from ATTOM Data Solutions")
        return 1

    # Connect to database
    print(f"\n🔗 Connecting to database...")
    conn = None

    try:
        conn = get_connection()
        cursor = conn.cursor()
        print(f"✓ Connected successfully")

        # Find homes needing lookup
        print(f"\n🔍 Finding SOLD homes without verified prices...")
        sold_homes = get_sold_homes_needing_lookup(cursor, args.limit)

        if not sold_homes:
            print("\n✓ No homes need sold price lookup. All up to date!")
            return 0

        print(f"\nFound {len(sold_homes)} homes needing price lookup")

        if args.dry_run:
            print("\n" + "=" * 80)
            print("DRY RUN - Homes that would be looked up:")
            print("=" * 80)

            for home in sold_homes[:10]:  # Show first 10
                print(f"\n📍 {home['address']}, {home['city']}, {home['state']}")
                print(f"   Community: {home['community']}")
                print(f"   Builder Price: ${home['builder_price']:,}")
                print(f"   Last Seen: {home['last_seen_at']}")

            if len(sold_homes) > 10:
                print(f"\n... and {len(sold_homes) - 10} more")

            print("\n" + "=" * 80)
            print(f"\n💡 To fetch prices, run:")
            print(f"   python scripts/fetch_sold_prices.py --execute")
            if args.limit:
                print(f"   (with --limit {args.limit})")

            return 0

        # Execute mode - fetch from API
        print("\n" + "=" * 80)
        print("🚀 FETCHING SOLD PRICES FROM ATTOM API")
        print("=" * 80)

        results = {
            'success': 0,
            'not_found': 0,
            'failed': 0,
            'api_calls': 0,
            'price_differences': []
        }

        for i, home in enumerate(sold_homes, 1):
            print(f"\n[{i}/{len(sold_homes)}] {home['address']}, {home['city']}, {home['state']}")
            print(f"    Builder Price: ${home['builder_price']:,}")

            # Fetch from API
            result = fetch_sold_price_from_attom(
                home['address'],
                home['city'],
                home['state']
            )
            results['api_calls'] += 1

            if result:
                print(f"    ✓ Found: ${result['sold_price']:,}")
                if result.get('sold_date'):
                    print(f"    📅 Sold Date: {result['sold_date']}")
                if result.get('apn'):
                    print(f"    🏷️  APN: {result['apn']}")
                if result.get('sale_transaction_type'):
                    print(f"    📋 Type: {result['sale_transaction_type']}")
                if result.get('lot_size_acres'):
                    print(f"    📏 Lot: {result['lot_size_acres']} acres")

                # Calculate difference
                diff = result['sold_price'] - home['builder_price']
                results['price_differences'].append(abs(diff))
                print(f"    📊 Difference: {format_price_diff(home['builder_price'], result['sold_price'])}")

                # Update database with all captured data
                if update_sold_price(cursor, home['id'], result):
                    results['success'] += 1
                    print(f"    💾 Updated in database")
                else:
                    results['failed'] += 1
            else:
                results['not_found'] += 1
                print(f"    ⚠️  No sold price found in API")

            # Commit every 100 records to prevent connection timeout
            if i % 100 == 0:
                conn.commit()
                print(f"    ✅ Committed batch (100 records)")

            # Rate limiting - be respectful to the API
            if i < len(sold_homes):
                time.sleep(1)  # 1 second between requests

        # Commit transaction
        conn.commit()
        print("\n✓ Database transaction committed")

        # Print summary
        print_summary(results)

        return 0

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        if conn:
            conn.rollback()
            print("🔄 Database transaction rolled back")
        return 1

    finally:
        if conn:
            conn.close()
            print("\n🔗 Database connection closed")


if __name__ == "__main__":
    sys.exit(main())
