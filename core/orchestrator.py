"""Main orchestrator — load DB config, discover scrapers, run, merge, persist."""

import os
import logging
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger(__name__)

OUTPUT_DIR = Path(os.environ.get("OUTPUT_DIR", "data"))
DB_WRITE = os.environ.get("DB_WRITE", "false").lower() == "true"
SNAPSHOT_PATH = OUTPUT_DIR / "snapshot_latest.json"


def run() -> list:
    """
    Full scrape cycle:
    1. Load config from DB (cities, communities)
    2. Build school cache
    3. Auto-discover scrapers
    4. Run each builder's scraper with its communities
    5. Detect changes vs yesterday
    6. Write to MySQL (if DB_WRITE=true)
    7. Save JSON snapshots
    """
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now()

    # 1. Load config from DB
    try:
        from db.config_reader import get_active_cities, get_active_communities
        cities = get_active_cities()
        communities = get_active_communities()
        print(f"Config: {len(cities)} cities, {len(communities)} communities")
    except Exception as e:
        print(f"WARNING: Cannot read DB config ({e}). Using empty config.")
        cities, communities = [], []

    # 2. Build school cache
    from scrapers.schools import load_or_build
    cache_path = str(OUTPUT_DIR / "schools_cache.json")
    schools_cache = load_or_build(cities, cache_path) if cities else {}
    print(f"Schools cache: {len(schools_cache)} schools\n")

    # 3. Discover scrapers
    from scrapers.registry import discover
    scrapers = discover()
    print(f"Scrapers: {', '.join(scrapers.keys())}\n")

    # 4. Run each builder
    all_homes = []
    for builder_name, scraper_cls in scrapers.items():
        builder_comms = [c for c in communities if c["builder"] == builder_name]
        if not builder_comms:
            continue
        active = [c for c in builder_comms if c.get("status") != "coming_soon"]
        coming = [c for c in builder_comms if c.get("status") == "coming_soon"]
        print(f"Scraping {builder_name} ({len(active)} active, {len(coming)} coming soon)...")
        try:
            homes = scraper_cls().scrape(builder_comms, schools_cache)
            all_homes.extend(homes)
        except Exception as e:
            print(f"  ERROR: {builder_name} scraper failed: {e}")

    if not all_homes:
        print("\nWARNING: No homes returned from any builder.")
        return []

    print(f"\nTotal scraped: {len(all_homes)}")

    # 5. Detect changes
    from core.changes import detect_changes
    from core import snapshot
    yesterday_map = snapshot.load(str(SNAPSHOT_PATH))
    first_run = not yesterday_map
    all_homes = detect_changes(all_homes, yesterday_map)

    # 6. Write to MySQL
    if DB_WRITE:
        print("\nWriting to MySQL...")
        try:
            from db.writer import write_all
            stats = {
                "homes_total": len(all_homes),
                "homes_active": len([h for h in all_homes if h.get("status") not in ("SOLD", "COMING_SOON")]),
                "drops_count": len([h for h in all_homes if h.get("price_drop")]),
                "new_listings": len([h for h in all_homes if h.get("new_listing")]),
            }
            db_result = write_all(all_homes, timestamp, stats)
            print(f"  + MySQL: {db_result['homes_written']} homes | "
                  f"{db_result['prices_tracked']} price events | "
                  f"{db_result['schools_written']} schools")
            if db_result.get("errors"):
                print(f"  ! {len(db_result['errors'])} warning(s)")
        except Exception as e:
            print(f"  x MySQL failed (continuing): {e}")

    # 7. Save snapshots
    snapshot.save(all_homes, str(SNAPSHOT_PATH))
    snapshot.save_per_builder(all_homes, str(OUTPUT_DIR))

    # Summary
    _print_summary(all_homes, first_run, timestamp)
    return all_homes


def _print_summary(homes, first_run, timestamp):
    sep = "=" * 70
    drops = [h for h in homes if h.get("price_drop")]
    new = [h for h in homes if h.get("new_listing")]
    cities = {}
    builders = {}
    for h in homes:
        c = h.get("city", "?")
        b = h.get("builder", "?")
        cities[c] = cities.get(c, 0) + 1
        builders.setdefault(b, {"total": 0, "drops": 0})
        builders[b]["total"] += 1
        if h.get("price_drop"):
            builders[b]["drops"] += 1

    print(f"\n{sep}")
    print(f"  Home Monitor — {timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
    print(sep)
    print(f"  Total  : {len(homes)} homes")
    print(f"  Cities : {', '.join(f'{c} ({n})' for c, n in sorted(cities.items()))}")
    print(f"  Drops  : {len(drops)} | New : {len(new)}")
    if first_run:
        print("  Note   : First run — drops use builder wasPrice")
    print(f"\n  By Builder:")
    for b, s in builders.items():
        print(f"    {b:<20} {s['total']:>5} homes  {s['drops']:>3} drops")
    if drops:
        print(f"\n  Top Drops:")
        for h in sorted(drops, key=lambda x: x.get("price_drop_amount", 0), reverse=True)[:5]:
            prev = h.get("prev_price", 0) or 0
            curr = h.get("price", 0) or 0
            diff = h.get("price_drop_amount", 0)
            print(f"    {h.get('community','?')[:20]:<20} ${prev:>9,.0f} -> ${curr:>9,.0f} (-${diff:,.0f})")
    print(sep)
