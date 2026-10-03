"""Taylor Morrison scraper — scDataStore parser. scrape_mode from builder_meta."""

import re
import json
import time
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from scrapers.base import BaseScraper
from scrapers.common import (
    get_browser_headers, get_jittered_delay,
    normalize_address, dedup_by_address
)
from scrapers.schools import lookup as school_lookup

BASE_URL = "https://www.taylormorrison.com"


class TaylorMorrisonScraper(BaseScraper):
    builder_name = "Taylor Morrison"

    def scrape(self, communities, schools_cache):
        all_homes = []

        # Group by scrape_mode
        html_comms = [c for c in communities if (c.get("builder_meta") or {}).get("scrape_mode") == "html"]
        coming_comms = [c for c in communities if (c.get("builder_meta") or {}).get("scrape_mode") == "coming_soon"]
        # firecrawl_comms skipped for now (needs API key)

        # Scrape HTML communities in parallel
        if html_comms:
            print(f"  [TM] Scraping {len(html_comms)} HTML communities...")
            with ThreadPoolExecutor(max_workers=3) as ex:
                futs = {ex.submit(_scrape_html, c, schools_cache): c for c in html_comms}
                for f in as_completed(futs):
                    c = futs[f]
                    try:
                        homes = f.result()
                        print(f"    + {c['name']}: {len(homes)} homes")
                        all_homes.extend(homes)
                    except Exception as e:
                        print(f"    x {c['name']}: {e}")

        # Coming Soon placeholders — inherit schools from proxy community
        if coming_comms:
            print(f"  [TM] Adding {len(coming_comms)} coming soon placeholders...")
            schools_by_comm = {}
            for h in all_homes:
                cn = h.get("community", "")
                if cn and h.get("schools") and cn not in schools_by_comm:
                    schools_by_comm[cn] = h["schools"]

            for c in coming_comms:
                meta = c.get("builder_meta") or {}
                proxy = meta.get("school_proxy", "")
                schools = schools_by_comm.get(proxy, [])
                tagged = [{**s, "approximate": True} for s in schools]

                all_homes.append({
                    "builder": "Taylor Morrison", "community": c["name"], "city": c["city"],
                    "plan_name": "", "homesite": "",
                    "address": f"{c['name']}, {c['city']}, CA",
                    "price": 0.0, "was_price": None,
                    "beds": None, "baths": "", "sqft": None,
                    "status": "COMING_SOON", "is_hotw": False, "is_available": False,
                    "home_url": c["url"], "schools": tagged,
                })

        result = dedup_by_address(all_homes, prefer_status="QUICK_MOVE_IN")
        print(f"  [TM] Total: {len(result)} unique homes")
        return result


def _scrape_html(comm, schools_cache):
    """Fetch community page and parse scDataStore."""
    time.sleep(get_jittered_delay("Taylor Morrison"))
    resp = requests.get(comm["url"], headers=get_browser_headers(), verify=False, timeout=20)
    if resp.status_code != 200:
        return []
    return _parse_scDataStore(resp.text, comm, schools_cache)


def _parse_scDataStore(html, comm, schools_cache):
    """Extract homesite data from window.TM.client.scDataStore.data."""
    marker = "window.TM.client.scDataStore.data = "
    idx = html.find(marker)
    if idx < 0:
        return []

    idx += len(marker)
    count, end = 0, idx
    for i, ch in enumerate(html[idx:], idx):
        if ch == "{":
            count += 1
        elif ch == "}":
            count -= 1
            if count == 0:
                end = i + 1
                break

    try:
        data = json.loads(html[idx:end])
    except json.JSONDecodeError:
        return []

    raw_homes = _find_homesite_homes(data)
    schools = _extract_tm_schools(data, schools_cache)

    results = []
    for h in raw_homes:
        n = _normalize(h, comm)
        if n:
            n["schools"] = schools
            results.append(n)
    return results


def _extract_tm_schools(data, cache):
    """Extract schools from scDataStore EDUCATION category."""
    for model in data.values():
        if not isinstance(model, dict) or "categories" not in model:
            continue
        for cat in model["categories"]:
            if cat.get("categoryName", "").upper() != "EDUCATION":
                continue
            schools = []
            for place in cat.get("places", []):
                name = place.get("name", "")
                if not name:
                    continue
                cat_str = place.get("category", "")
                type_, grades = "Public", ""
                if "|" in cat_str:
                    parts = cat_str.split("|", 1)
                    type_ = parts[0].strip()
                    grade_raw = re.sub(r"Grades?\s*:\s*", "", parts[1].strip(), flags=re.IGNORECASE)
                    grades = _parse_grades(grade_raw)

                try:
                    tm_rating = int(place.get("rating")) if place.get("rating") is not None else None
                except (ValueError, TypeError):
                    tm_rating = None

                try:
                    distance = f"{float(place.get('distance')):.2f} mi" if place.get("distance") is not None else ""
                except (ValueError, TypeError):
                    distance = ""

                enriched = school_lookup(name, cache) if cache else {}
                schools.append({
                    "name": enriched.get("name") or name,
                    "grades": enriched.get("grades") or grades,
                    "type": enriched.get("type") or type_,
                    "district": enriched.get("district", ""),
                    "rating_gs": enriched.get("rating_gs") if enriched else tm_rating,
                    "rating_niche": "", "rating_max": 10,
                    "distance": distance,
                    "url": enriched.get("url") or place.get("url", ""),
                })
            return schools
    return []


def _parse_grades(raw):
    if not raw:
        return ""
    raw = raw.replace("KG", "K")
    if "," in raw:
        parts = [p.strip() for p in raw.split(",") if p.strip()]
        return f"{parts[0]}-{parts[-1]}" if parts else raw
    return raw.strip()


def _find_homesite_homes(obj, depth=0):
    if depth > 12:
        return []
    if isinstance(obj, dict):
        if ("homes" in obj and isinstance(obj["homes"], list)
                and obj["homes"] and isinstance(obj["homes"][0], dict)
                and "homeSite" in obj["homes"][0]):
            return obj["homes"]
        for v in obj.values():
            r = _find_homesite_homes(v, depth + 1)
            if r:
                return r
    elif isinstance(obj, list):
        for item in obj:
            r = _find_homesite_homes(item, depth + 1)
            if r:
                return r
    return []


def _normalize(h, comm):
    price = h.get("price", 0) or 0
    if not price:
        return None

    was_raw = h.get("wasPrice", 0) or 0
    was = float(was_raw) if was_raw and was_raw != price else None

    # SOLD detection: check for sold/unavailable indicators
    status_raw = str(h.get("availabilityStatus", ""))
    sold_indicator = h.get("isSold", False) or h.get("sold", False) or h.get("status", "").upper() == "SOLD"

    if sold_indicator:
        status = "SOLD"
        is_available = False
    elif status_raw == "0":
        status = "QUICK_MOVE_IN"
        is_available = True
    else:
        status = "UNDER_CONSTRUCTION"
        is_available = True

    addr = normalize_address(str(h.get("address") or "").strip(), comm["city"])

    view_link = h.get("viewHomeLink", {})
    url_path = (view_link.get("Url") or view_link.get("url") or "") if isinstance(view_link, dict) else ""
    home_url = (BASE_URL + url_path) if url_path and url_path.startswith("/") else (url_path or comm["url"])

    plan_data = h.get("planData", {}) or {}
    beds = plan_data.get("bedrooms") or h.get("beds")
    baths = plan_data.get("bathrooms") or h.get("baths")
    sqft_raw = plan_data.get("squareFeet") or h.get("sqft")
    try:
        sqft = float(sqft_raw) if sqft_raw else None
    except (ValueError, TypeError):
        sqft = None

    return {
        "builder": "Taylor Morrison", "community": comm["name"], "city": comm["city"],
        "plan_name": plan_data.get("name") or h.get("planName") or "",
        "homesite": str(h.get("homeSite") or ""),
        "address": addr, "price": float(price), "was_price": was,
        "beds": beds, "baths": str(baths or ""), "sqft": sqft,
        "status": status, "is_hotw": False, "is_available": is_available,
        "home_url": home_url,
    }
