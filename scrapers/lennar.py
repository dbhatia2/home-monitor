"""Lennar scraper — __NEXT_DATA__ Apollo cache parser. City from community config."""

import re
import json
import time
import requests
from scrapers.base import BaseScraper
from scrapers.common import BROWSER_HEADERS, POLITE_DELAY, normalize_address, dedup_by_address, build_school_dict
from scrapers.schools import lookup

BASE_URL = "https://www.lennar.com"


class LennarScraper(BaseScraper):
    builder_name = "Lennar"

    def scrape(self, communities, schools_cache):
        all_homes = []
        for i, comm in enumerate(communities):
            if comm.get("status") == "coming_soon":
                print(f"  [Lennar] {comm['name']} ({comm['city']}): coming soon — monitoring")
                continue
            print(f"  [Lennar] {comm['name']} ({comm['city']})")
            try:
                if i > 0:
                    time.sleep(POLITE_DELAY)
                resp = requests.get(comm["url"], headers=BROWSER_HEADERS, verify=False, timeout=30)
                if resp.status_code != 200:
                    print(f"    HTTP {resp.status_code}")
                    continue
                homes = _parse_next_data(resp.text, comm)
                # Attach schools
                school_data = _fetch_schools(comm["url"], schools_cache)
                for h in homes:
                    h["schools"] = school_data
                print(f"    {len(homes)} homes")
                all_homes.extend(homes)
            except Exception as e:
                print(f"    Error: {e}")

        result = dedup_by_address(all_homes)
        print(f"  [Lennar] Total: {len(result)} unique homes")
        return result


def _fetch_schools(community_url, cache):
    """Fetch /nearby-schools and parse SchoolType from Apollo cache."""
    try:
        time.sleep(POLITE_DELAY)
        resp = requests.get(community_url.rstrip("/") + "/nearby-schools",
                            headers=BROWSER_HEADERS, verify=False, timeout=20)
        if resp.status_code != 200:
            return []
        m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', resp.text, re.DOTALL)
        if not m:
            return []
        apollo = json.loads(m.group(1)).get("props", {}).get("pageProps", {}).get("initialApolloState", {})
        schools = []
        for v in apollo.values():
            if isinstance(v, dict) and v.get("__typename") == "SchoolType":
                enriched = lookup(v.get("name", ""), cache or {})
                schools.append(build_school_dict(v.get("name", ""), enriched, v))
        return schools
    except Exception:
        return []


def _parse_next_data(html, comm):
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
    if not m:
        return []
    try:
        data = json.loads(m.group(1))
    except json.JSONDecodeError:
        return []

    apollo = data.get("props", {}).get("pageProps", {}).get("initialApolloState", {})
    if not apollo:
        return []

    plans = {k: v for k, v in apollo.items() if isinstance(v, dict) and v.get("__typename") == "PlanType"}
    comms = {k: v for k, v in apollo.items() if isinstance(v, dict) and v.get("__typename") in ("CommunityType", "CollectionType")}

    homes = []
    for k, hs in apollo.items():
        if not isinstance(hs, dict) or hs.get("__typename") != "HomesiteType":
            continue
        home = _extract(hs, plans, comms, comm)
        if home:
            homes.append(home)
    return homes


def _extract(hs, plans, comms, comm):
    price = hs.get("price")
    try:
        price = float(price) if price else None
    except (ValueError, TypeError):
        price = None
    if not price:
        return None

    was = hs.get("wasPrice")
    try:
        was = float(was) if was and was != 0 else None
    except (ValueError, TypeError):
        was = None

    status = str(hs.get("status") or "Unknown")
    hid = str(hs.get("number") or hs.get("lotid") or hs.get("id") or "")
    hotw = bool(hs.get("isHotw", False))

    pref = hs.get("plan", {})
    pk = pref.get("__ref", "") if isinstance(pref, dict) else ""
    plan = plans.get(pk, {})

    cref = plan.get("community", {})
    ck = cref.get("__ref", "") if isinstance(cref, dict) else ""
    cobj = comms.get(ck, {})
    collection = cobj.get("name") or cobj.get("collectionName") or comm["name"]

    addr = normalize_address(str(hs.get("address") or ""), comm["city"])
    beds = hs.get("beds") or plan.get("beds")
    baths = hs.get("baths") or plan.get("baths")
    half = hs.get("halfBaths") or plan.get("halfBaths") or 0
    try:
        sqft = float(hs.get("sqft") or plan.get("sqft") or 0) or None
    except (ValueError, TypeError):
        sqft = None

    bdisp = str(baths or "") + ("" if not half else f" + {half} half")
    upath = hs.get("url") or plan.get("url") or ""
    hurl = (BASE_URL + upath) if upath and upath.startswith("/") else upath
    ulast = upath.rstrip("/").split("/")[-1] if upath else ""
    has_url = ulast.isdigit() and len(ulast) >= 8

    if status in ("UNDEFINED", "Unknown", "None"):
        status = "AVAILABLE" if has_url else "FUTURE"
    is_avail = has_url or status in ("AVAILABLE", "MOVE_IN_READY", "UNDER_CONSTRUCTION", "MODEL_HOME")

    return {
        "builder": "Lennar", "community": collection, "city": comm["city"],
        "plan_name": plan.get("name") or plan.get("planName") or "",
        "homesite": hid, "address": addr, "price": price, "was_price": was,
        "beds": beds, "baths": bdisp, "sqft": sqft, "status": status,
        "is_hotw": hotw, "is_available": is_avail, "home_url": hurl,
    }
