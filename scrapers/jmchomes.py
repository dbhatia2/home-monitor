"""JMC Homes scraper — Redux __PRELOADED_STATE__ stream parser. Config-driven."""

import re
import json
import time
import requests
from scrapers.base import BaseScraper
from scrapers.common import BROWSER_HEADERS, normalize_address, dedup_by_address
from scrapers.schools import lookup

BASE_URL = "https://www.jmchomes.com"
READ_LIMIT = 12 * 1024 * 1024  # 12MB


class JMCHomesScraper(BaseScraper):
    builder_name = "JMC Homes"

    def scrape(self, communities, schools_cache):
        if not communities:
            return []

        # JMC serves ALL communities from a single city listing page
        # Determine the city from the first community
        city = communities[0]["city"]
        city_slug = city.lower().replace(" ", "-")
        known_slugs = {c["slug"]: c["name"] for c in communities}

        all_url = f"{BASE_URL}/homes/{city_slug}"
        print(f"  [JMC] Fetching {city} listings: {all_url}")

        state = _fetch_preloaded_state(all_url, f"{city} — all")
        if not state:
            print(f"  [JMC] No Redux state found")
            return []

        raw_homes = _extract_homes(state)
        comm_id_map = _extract_communities(state)
        print(f"  [JMC] Raw: {len(raw_homes)} homes, {len(comm_id_map)} communities")

        all_homes = []
        for raw in raw_homes:
            community = _community_from_home(raw, comm_id_map, known_slugs)
            if not community:
                continue

            # Match to a known community config
            comm_config = None
            for c in communities:
                if c["name"].lower() == community.lower():
                    comm_config = c
                    break

            home = _normalize(raw, community, city)
            if not home:
                continue

            # Schools from builder_meta or cache
            school_proxies = []
            if comm_config:
                meta = comm_config.get("builder_meta") or {}
                school_proxies = meta.get("school_proxies", [])

            schools = []
            for sname in school_proxies:
                enriched = lookup(sname, schools_cache or {})
                if enriched:
                    s = dict(enriched)
                    s["approximate"] = True
                    schools.append(s)
            home["schools"] = schools

            all_homes.append(home)

        result = dedup_by_address(all_homes)
        print(f"  [JMC] Total: {len(result)} unique homes ({city})")
        return result


def _fetch_preloaded_state(url, label=""):
    """Stream JMC page and extract __PRELOADED_STATE__ sections."""
    try:
        resp = requests.get(url, headers={**BROWSER_HEADERS, "Connection": "keep-alive"},
                            verify=False, timeout=60, stream=True)
        if resp.status_code != 200:
            return {}
        buf = b""
        for chunk in resp.iter_content(chunk_size=65536):
            buf += chunk
            if len(buf) > READ_LIMIT:
                break

        text = buf.decode("utf-8", errors="replace")
        m = re.search(r'window\.__PRELOADED_STATE__\s*=\s*', text)
        if not m:
            return {}

        start = m.end()
        # Extract targeted sections instead of full JSON parse
        state = {}
        for key in ("homes", "communities"):
            section = _extract_json_section(text[start:], f'"{key}"')
            if section:
                state[key] = section
        return state
    except Exception as e:
        print(f"  [JMC] Fetch error: {e}")
        return {}


def _extract_json_section(text, key):
    """Extract a JSON array/object for a given key from the Redux state text."""
    idx = text.find(key)
    if idx < 0:
        return None
    # Find the colon after the key
    colon = text.find(":", idx + len(key))
    if colon < 0:
        return None
    # Find start of array/object
    start = colon + 1
    while start < len(text) and text[start] in " \t\n\r":
        start += 1
    if start >= len(text):
        return None

    opener = text[start]
    if opener == "[":
        closer = "]"
    elif opener == "{":
        closer = "}"
    else:
        return None

    depth = 0
    for i in range(start, min(start + 5_000_000, len(text))):
        if text[i] == opener:
            depth += 1
        elif text[i] == closer:
            depth -= 1
            if depth == 0:
                try:
                    return json.loads(text[start:i + 1])
                except json.JSONDecodeError:
                    return None
    return None


def _extract_homes(state):
    """Extract homes data array from state."""
    homes = state.get("homes")
    if isinstance(homes, list):
        return homes
    if isinstance(homes, dict):
        for v in homes.values():
            if isinstance(v, list) and v and isinstance(v[0], dict):
                return v
    return []


def _extract_communities(state):
    """Extract community ID → name map from state."""
    comms = state.get("communities")
    result = {}
    if isinstance(comms, list):
        for c in comms:
            if isinstance(c, dict):
                cid = str(c.get("id") or c.get("containedInPlaceId") or "")
                name = c.get("name") or c.get("bd_commname") or ""
                if cid and name:
                    result[cid] = name
    return result


def _community_from_home(raw, comm_id_map, known_slugs):
    """Resolve community name from raw home data."""
    # 1. bd_commname
    bd = (raw.get("bd_commname") or "").strip()
    if bd:
        for slug, display in known_slugs.items():
            if bd.lower() == display.lower() or display.lower() in bd.lower():
                return display
        return bd

    # 2. viewHomeLink URL slug
    vhl = raw.get("viewHomeLink")
    if isinstance(vhl, dict):
        url = vhl.get("Url") or vhl.get("url") or ""
        parts = url.strip("/").split("/")
        for i, p in enumerate(parts):
            if p in known_slugs:
                return known_slugs[p]

    # 3. containedIn ID
    cid = str(raw.get("containedIn") or raw.get("containedInPlaceId") or "")
    if cid and cid in comm_id_map:
        return comm_id_map[cid]

    return None


def _normalize(raw, community, city):
    price = raw.get("price") or raw.get("bd_price") or 0
    try:
        price = float(str(price).replace("$", "").replace(",", ""))
    except (ValueError, TypeError):
        return None
    if not price:
        return None

    addr = str(raw.get("address") or raw.get("streetAddress") or "")
    addr = normalize_address(addr, city)

    status_raw = str(raw.get("bd_status") or raw.get("status") or "").strip()
    if status_raw.lower() in ("active", "move-in ready"):
        status = "MOVE_IN_READY"
    elif "under construction" in status_raw.lower() or "construction" in status_raw.lower():
        status = "UNDER_CONSTRUCTION"
    elif status_raw.lower() == "sold":
        status = "SOLD"
    else:
        status = "AVAILABLE"

    beds = raw.get("bd_totalbeds") or raw.get("beds")
    baths = raw.get("bd_totalbaths") or raw.get("baths")
    sqft_raw = raw.get("bd_totalsqft") or raw.get("sqft")
    try:
        sqft = float(sqft_raw) if sqft_raw else None
    except (ValueError, TypeError):
        sqft = None

    plan = raw.get("bd_planname") or raw.get("name") or ""
    homesite = str(raw.get("bd_homesite") or raw.get("homesite") or "")

    vhl = raw.get("viewHomeLink")
    url_path = ""
    if isinstance(vhl, dict):
        url_path = vhl.get("Url") or vhl.get("url") or ""
    home_url = (BASE_URL + url_path) if url_path and url_path.startswith("/") else (url_path or "")

    return {
        "builder": "JMC Homes", "community": community, "city": city,
        "plan_name": plan, "homesite": homesite,
        "address": addr, "price": price, "was_price": None,
        "beds": beds, "baths": str(baths or ""), "sqft": sqft,
        "status": status, "is_hotw": False,
        "is_available": status not in ("SOLD", "FUTURE"),
        "home_url": home_url,
    }
