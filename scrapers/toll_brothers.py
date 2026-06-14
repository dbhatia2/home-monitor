"""Toll Brothers scraper — Next.js __NEXT_DATA__ + HTML fallback. City from config."""

import re
import json
import time
import requests
from scrapers.base import BaseScraper
from scrapers.common import BROWSER_HEADERS, POLITE_DELAY, parse_price, normalize_address


class TollBrothersScraper(BaseScraper):
    builder_name = "Toll Brothers"

    def scrape(self, communities, schools_cache):
        all_homes = []
        print(f"  [Toll Brothers] Scraping {len(communities)} communities...")
        for comm in communities:
            if comm.get("status") == "coming_soon":
                print(f"    {comm['name']}: coming soon — monitoring")
                continue
            print(f"    Fetching: {comm['name']} ({comm['city']})")
            try:
                time.sleep(POLITE_DELAY)
                resp = requests.get(comm["url"], headers=BROWSER_HEADERS, verify=False, timeout=15)
                if resp.status_code != 200:
                    print(f"      HTTP {resp.status_code}")
                    continue
                homes = _parse_page(resp.text, comm)
                print(f"      {len(homes)} homes/collections")
                all_homes.extend(homes)
            except Exception as e:
                print(f"      Error: {e}")

        print(f"  [Toll Brothers] Total: {len(all_homes)}")
        return all_homes


def _parse_page(html, comm):
    """Parse __NEXT_DATA__ for QMI homes, fall back to HTML price extraction."""
    homes = []
    city = comm["city"]
    community_name = comm["name"]
    url = comm["url"]
    is_55 = comm.get("is_55_plus", False)

    # Try __NEXT_DATA__
    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL)
    if m:
        try:
            pp = json.loads(m.group(1)).get("props", {}).get("pageProps", {})
            for qmi in (pp.get("qmiHomes") or pp.get("quickMoveInHomes") or []):
                if not isinstance(qmi, dict):
                    continue
                price = parse_price(qmi.get("price") or qmi.get("priceValue"))
                if not price:
                    continue
                addr = normalize_address(qmi.get("address") or qmi.get("streetAddress") or "", city)
                try:
                    sqft = float(qmi.get("sqft") or qmi.get("squareFeet") or 0) or None
                except (ValueError, TypeError):
                    sqft = None
                homes.append({
                    "builder": "Toll Brothers", "community": community_name, "city": city,
                    "plan_name": qmi.get("modelName") or qmi.get("planName") or "",
                    "homesite": str(qmi.get("lotNumber") or ""),
                    "address": addr, "price": price, "was_price": None,
                    "beds": qmi.get("bedrooms") or qmi.get("beds"),
                    "baths": str(qmi.get("bathrooms") or qmi.get("baths") or ""),
                    "sqft": sqft, "status": "MOVE_IN_READY",
                    "is_hotw": False, "is_available": True, "is_55_plus": is_55,
                    "home_url": url, "schools": [],
                })
        except Exception:
            pass

    # HTML fallback: extract prices from rendered text
    if not homes:
        text = re.sub(r"<[^>]+>", "\n", html)
        prices = re.findall(r'(?:From|Starting|Priced)\s*(?:from\s*)?\$([\d,]+)', text, re.IGNORECASE)
        for pm in prices[:3]:
            price = parse_price(pm)
            if not price or price < 100000:
                continue
            homes.append({
                "builder": "Toll Brothers", "community": community_name, "city": city,
                "plan_name": "", "homesite": "",
                "address": f"{community_name}, {city}, CA",
                "price": price, "was_price": None,
                "beds": None, "baths": "", "sqft": None,
                "status": "AVAILABLE", "is_hotw": False, "is_available": True,
                "is_55_plus": is_55, "home_url": url, "schools": [],
            })

    return homes
