"""Load homes for a user based on their city subscriptions. DB -> JSON fallback."""

import os
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

DB_WRITE = os.environ.get("DB_WRITE", "false").lower() == "true"
OUTPUT_DIR = Path(os.environ.get("OUTPUT_DIR", "data"))


def load_for_user(user: dict) -> list:
    """
    Load homes for a user based on their city subscriptions.
    Primary: MySQL. Fallback: snapshot_latest.json.
    """
    cities = user.get("cities", [])

    if DB_WRITE:
        try:
            from db.reader import load_homes
            homes = load_homes(cities=cities if cities else None, include_55_plus=True)
            if homes:
                print(f"  Loaded {len(homes)} homes from MySQL for {user['name']} (cities: {', '.join(cities)})")
                return homes
        except Exception as e:
            print(f"  MySQL fallback: {e}")

    # JSON fallback
    snap = OUTPUT_DIR / "snapshot_latest.json"
    if snap.exists():
        with open(snap) as f:
            all_homes = json.load(f)
        if cities:
            all_homes = [h for h in all_homes if h.get("city") in cities]
        print(f"  Loaded {len(all_homes)} homes from JSON (cities: {', '.join(cities) if cities else 'all'})")
        return all_homes

    return []
