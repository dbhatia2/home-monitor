#!/usr/bin/env python3
"""
Mark stale homes as SOLD in the database.

This script identifies homes that haven't been seen in the last 45 days
and marks them as SOLD, since they've been removed from builder websites.

Usage:
    python scripts/mark_stale_sold.py --dry-run    # Preview changes
    python scripts/mark_stale_sold.py --execute    # Apply changes
"""

import sys
import argparse
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path so we can import db module
sys.path.insert(0, str(Path(__file__).parent.parent))

from db.connection import get_connection


def get_stale_homes(cursor, days_threshold=45):
    """
    Find homes that haven't been seen in the specified number of days.

    Args:
        cursor: Database cursor
        days_threshold: Number of days to consider a home stale

    Returns:
        List of stale home records
    """
    query = """
        SELECT
            h.id,
            h.address,
            c.name as community_name,
            ci.name as city,
            ci.state,
            h.status,
            h.last_seen_at,
            DATEDIFF(NOW(), h.last_seen_at) as days_stale
        FROM homes h
        JOIN communities c ON h.community_id = c.id
        JOIN cities ci ON c.city_id = ci.id
        WHERE h.last_seen_at < NOW() - INTERVAL %s DAY
          AND h.status NOT IN ('SOLD', 'FUTURE', 'MODEL_HOME')
        ORDER BY ci.name, c.name, h.address
    """

    cursor.execute(query, (days_threshold,))
    return cursor.fetchall()


def print_report(stale_homes):
    """
    Print a detailed report of homes that will be marked as SOLD.

    Args:
        stale_homes: List of stale home records
    """
    if not stale_homes:
        print("\n✓ No stale homes found. All homes are up to date!")
        return

    print(f"\n📊 Found {len(stale_homes)} stale homes to mark as SOLD:\n")
    print("=" * 100)

    # Group by city for better organization
    by_city = {}
    for home in stale_homes:
        city = home['city']
        if city not in by_city:
            by_city[city] = []
        by_city[city].append(home)

    for city, homes in sorted(by_city.items()):
        print(f"\n{city.upper()} ({len(homes)} homes)")
        print("-" * 100)

        for home in homes:
            print(f"  • {home['address']}")
            print(f"    Community: {home['community_name']}")
            print(f"    Current Status: {home['status']}")
            print(f"    Last Seen: {home['last_seen_at']} ({home['days_stale']} days ago)")
            print()

    print("=" * 100)


def mark_homes_sold(cursor, stale_homes, dry_run=True):
    """
    Mark the stale homes as SOLD in the database.

    Args:
        cursor: Database cursor
        stale_homes: List of stale home records to update
        dry_run: If True, don't actually update the database

    Returns:
        Number of homes updated
    """
    if not stale_homes:
        return 0

    if dry_run:
        print("\n🔍 DRY RUN MODE - No changes will be made to the database.")
        return 0

    # Extract home IDs
    home_ids = [home['id'] for home in stale_homes]

    # Update query
    update_query = """
        UPDATE homes
        SET status = 'SOLD',
            updated_at = CURRENT_TIMESTAMP
        WHERE id IN (%s)
    """ % ','.join(['%s'] * len(home_ids))

    cursor.execute(update_query, home_ids)
    rows_updated = cursor.rowcount

    print(f"\n✓ Successfully marked {rows_updated} homes as SOLD")

    return rows_updated


def verify_updates(cursor, sample_size=5):
    """
    Verify recent SOLD updates by showing a sample.

    Args:
        cursor: Database cursor
        sample_size: Number of recent updates to display
    """
    query = """
        SELECT h.address, c.name as community_name, ci.name as city, h.status, h.updated_at
        FROM homes h
        JOIN communities c ON h.community_id = c.id
        JOIN cities ci ON c.city_id = ci.id
        WHERE h.status = 'SOLD'
          AND h.updated_at > NOW() - INTERVAL 1 HOUR
        ORDER BY h.updated_at DESC
        LIMIT %s
    """

    cursor.execute(query, (sample_size,))
    recent_updates = cursor.fetchall()

    if recent_updates:
        print(f"\n📋 Sample of recently marked SOLD homes:")
        print("-" * 80)
        for home in recent_updates:
            print(f"  • {home['address']}, {home['city']}")
            print(f"    Community: {home['community_name']}")
            print(f"    Updated: {home['updated_at']}")
            print()


def confirm_execution(stale_homes_count):
    """
    Ask user to confirm before executing updates.

    Args:
        stale_homes_count: Number of homes to be updated

    Returns:
        True if user confirms, False otherwise
    """
    print(f"\n⚠️  You are about to mark {stale_homes_count} homes as SOLD.")
    print("This action will update the database.")

    response = input("\nDo you want to proceed? (yes/no): ").strip().lower()
    return response in ['yes', 'y']


def main():
    parser = argparse.ArgumentParser(
        description="Mark stale homes as SOLD in the database",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Preview what will be changed (dry run):
    python scripts/mark_stale_sold.py --dry-run

    # Apply the changes:
    python scripts/mark_stale_sold.py --execute

    # Use a custom staleness threshold (default is 45 days):
    python scripts/mark_stale_sold.py --execute --days 60
        """
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without updating the database'
    )

    parser.add_argument(
        '--execute',
        action='store_true',
        help='Execute the updates (will prompt for confirmation)'
    )

    parser.add_argument(
        '--days',
        type=int,
        default=45,
        help='Number of days to consider a home stale (default: 45)'
    )

    args = parser.parse_args()

    # Validate arguments
    if not args.dry_run and not args.execute:
        parser.error("You must specify either --dry-run or --execute")

    if args.dry_run and args.execute:
        parser.error("Cannot specify both --dry-run and --execute")

    if args.days < 1:
        parser.error("Days threshold must be at least 1")

    # Connect to database
    print(f"\n🔗 Connecting to database...")
    conn = None

    try:
        conn = get_connection()
        cursor = conn.cursor()

        print(f"✓ Connected successfully")
        print(f"📅 Using staleness threshold: {args.days} days")

        # Find stale homes
        print(f"\n🔍 Searching for homes not seen in the last {args.days} days...")
        stale_homes = get_stale_homes(cursor, args.days)

        # Print report
        print_report(stale_homes)

        if not stale_homes:
            return 0

        # Execute or preview
        if args.execute:
            # Ask for confirmation
            if not confirm_execution(len(stale_homes)):
                print("\n❌ Operation cancelled by user")
                return 0

            # Mark homes as sold
            print("\n🔄 Updating database...")
            rows_updated = mark_homes_sold(cursor, stale_homes, dry_run=False)

            # Commit the transaction
            conn.commit()
            print("✓ Database transaction committed")

            # Verify updates
            verify_updates(cursor)

            print(f"\n✅ Successfully marked {rows_updated} homes as SOLD")

        else:
            # Dry run mode
            mark_homes_sold(cursor, stale_homes, dry_run=True)
            print(f"\n💡 To apply these changes, run:")
            print(f"   python scripts/mark_stale_sold.py --execute --days {args.days}")

        return 0

    except Exception as e:
        print(f"\n❌ Error: {e}")
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
