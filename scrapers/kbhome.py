"""KB Home scraper — LocalQMIs JS variable parser. City from community config."""

import re
import json
import time
import requests
from scrapers.base import BaseScraper
from scrapers.common import (
    get_browser_headers, get_jittered_delay,
    parse_price, normalize_address, dedup_by_address, build_school_dict
)
from scrapers.schools import lookup

BASE_URL = "https://www.kbhome.com"


class KBHomeScraper(BaseScraper):
    builder_name = "KB Home"

    def scrape(self, communities, schools_cache):
        all_homes = []
        print(f"  [KB Home] Scraping {len(communities)} communities...")
        for i, comm in enumerate(communities):
            if comm.get("status") == "coming_soon":
                print(f"    {comm['name']}: coming soon — monitoring")
                continue
            try:
                if i > 0:
                    time.sleep(get_jittered_delay("KB Home"))
                resp = requests.get(comm["url"], headers=get_browser_headers(), verify=False, timeout=20)
                if resp.status_code != 200:
                    continue
                homes = _parse_qmis(resp.text, comm)
                schools = _parse_schools(resp.text, schools_cache or {})
                for h in homes:
                    h["schools"] = schools
                print(f"    + {comm['name']}: {len(homes)} homes")
                all_homes.extend(homes)
            except Exception as e:
                print(f"    {comm['name']}: {e}")

        result = dedup_by_address(all_homes)
        print(f"  [KB Home] Total: {len(result)} unique homes")
        return result


def _parse_qmis(html, comm):
    """Extract MIR homes from LocalQMIs JavaScript variable."""
    homes = []
    for pat in [r'var\s+LocalQMIs\s*=\s*(\[.*?\]);', r'var\s+QMIHomes\s*=\s*(\[.*?\]);']:
        for m in re.findall(pat, html, re.DOTALL):
            try:
                data = json.loads(m)
                if isinstance(data, list):
                    for h in data:
                        if isinstance(h, dict):
                            home = _normalize(h, comm)
                            if home:
                                homes.append(home)
            except json.JSONDecodeError:
                pass
    return homes


def _normalize(h, comm):
    price = parse_price(h.get("price") or h.get("basePrice"))
    if not price:
        return None

    addr = normalize_address(str(h.get("address") or ""), comm["city"])
    pp = h.get("pageUrl") or ""
    hurl = (BASE_URL + pp) if pp.startswith("/") else pp
    try:
        sqft = float(h.get("size") or h.get("sqft") or 0) or None
    except (ValueError, TypeError):
        sqft = None

    # SOLD detection: check for sold/unavailable status indicators
    status_raw = str(h.get("status", "")).upper()
    is_sold = h.get("sold", False) or h.get("isSold", False) or status_raw in ("SOLD", "UNAVAILABLE", "NOT_AVAILABLE")

    if is_sold:
        status = "SOLD"
        is_available = False
    else:
        status = "MOVE_IN_READY"
        is_available = True

    return {
        "builder": "KB Home", "community": comm["name"], "city": comm["city"],
        "plan_name": str(h.get("planName") or h.get("name") or ""),
        "homesite": str(h.get("homesite") or ""),
        "address": addr, "price": price, "was_price": None,
        "beds": h.get("bedrooms") or h.get("beds"),
        "baths": str(h.get("bathrooms") or ""), "sqft": sqft,
        "status": status, "is_hotw": False, "is_available": is_available,
        "home_url": hurl,
    }


def _parse_schools(html, cache):
    """Parse 'Nearby schools' section from KB Home HTML."""
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"\s+", " ", text)
    start = text.find("Nearby schools")
    if start < 0:
        return []
    section = text[start:]
    for stop in ["Introducing the KB Home App", "Get in touch", "Helpful resources"]:
        idx = section.find(stop)
        if idx > 0:
            section = section[:idx]
            break

    pat = re.compile(
        r"([A-Z][A-Za-z\s\.'-]+?(?:Elementary|Middle|High|School|Academy)[A-Za-z\s\.'-]*?)"
        r"\s+(\d[^,]+,\s*[^,]+,\s*[A-Z]{2}\s*\d{5})"
        r"\s+(\d+\.?\d*)\s+miles?\s+away", re.IGNORECASE)

    schools = []
    seen = set()
    for m in pat.finditer(section):
        name = m.group(1).strip()
        if name.lower() in seen:
            continue
        seen.add(name.lower())
        enriched = lookup(name, cache)
        schools.append(build_school_dict(name, enriched, {"distance": f"{m.group(3)} miles"}))
    return schools
