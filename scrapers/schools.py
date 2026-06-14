"""GreatSchools cache — city-parameterized, reads schools_url from DB."""

import re
import json
import time
import difflib
import requests
from datetime import datetime, timezone
from pathlib import Path
from scrapers.common import BROWSER_HEADERS

CACHE_TTL_DAYS = 7


def _fetch_city(city_name: str, url: str) -> dict:
    """Fetch schools for one city from GreatSchools."""
    try:
        time.sleep(1.0)
        resp = requests.get(url, headers=BROWSER_HEADERS, verify=False, timeout=20)
        if resp.status_code != 200:
            print(f"  [Schools] {city_name}: HTTP {resp.status_code}")
            return {}
    except Exception as e:
        print(f"  [Schools] {city_name}: {e}")
        return {}

    scripts = re.findall(r"<script[^>]*>(.*?)</script>", resp.text, re.DOTALL)
    blob = None
    for s in scripts:
        if '"data":[{"title":"Elementary"' in s or '"gradeLevels"' in s:
            blob = s.strip()
            break
    if not blob:
        return {}

    try:
        data = json.loads(blob)
    except json.JSONDecodeError:
        return {}

    cache = {}
    for cat in data.get("data", []):
        for s in cat.get("values", []):
            name = s.get("name") or s.get("schoolName")
            if not name or name == "?":
                continue
            try:
                rating = int(s.get("rating")) if s.get("rating") is not None else None
            except (ValueError, TypeError):
                rating = None
            url_gs = s.get("links", {}).get("profile", "")
            if url_gs and not url_gs.startswith("http"):
                url_gs = "https://www.greatschools.org" + url_gs

            grades_raw = s.get("gradeLevels", "")
            grades = _parse_grades(grades_raw)

            cache[name.lower().strip()] = {
                "name": name, "grades": grades,
                "type": str(s.get("schoolType", "public")).title(),
                "district": s.get("districtName", ""),
                "rating_gs": rating, "rating_max": 10,
                "url": url_gs, "city": city_name,
            }
    print(f"  [Schools] {city_name}: {len(cache)} schools")
    return cache


def _parse_grades(raw: str) -> str:
    if not raw:
        return ""
    raw = re.sub(r"Grades?\s*:\s*", "", raw, flags=re.IGNORECASE).strip()
    raw = raw.replace("KG", "K").replace("PK", "PreK")
    if "," in raw:
        parts = [p.strip() for p in raw.split(",") if p.strip()]
        return f"{parts[0]}-{parts[-1]}" if parts else raw
    m = re.match(r"^([K\d]+)\s*[-–]\s*([K\d]+)$", raw.strip())
    return f"{m.group(1)}-{m.group(2)}" if m else raw.strip()


def load_or_build(cities: list, cache_path: str = "data/schools_cache.json") -> dict:
    """Load from file cache if fresh, else build from all active cities."""
    cached = _load_file(cache_path)
    if cached is not None:
        return cached

    print("  [Schools] Building cache from GreatSchools...")
    combined = {}
    for city in cities:
        url = city.get("schools_url")
        if not url:
            continue
        city_cache = _fetch_city(city["name"], url)
        combined.update(city_cache)

    print(f"  [Schools] Combined: {len(combined)} schools across {len(cities)} cities")
    _save_file(combined, cache_path)
    return combined


def lookup(name: str, cache: dict) -> dict:
    """Look up a school by name. Exact match first, then fuzzy (cutoff 0.75)."""
    if not name or not cache:
        return {}
    key = name.lower().strip()
    if key in cache:
        return dict(cache[key])
    matches = difflib.get_close_matches(key, cache.keys(), n=1, cutoff=0.75)
    return dict(cache[matches[0]]) if matches else {}


def _save_file(cache: dict, path: str):
    data = dict(cache)
    data["_meta"] = {"_built_at": datetime.now(timezone.utc).isoformat(), "_count": len(cache)}
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def _load_file(path: str) -> "dict | None":
    p = Path(path)
    if not p.exists():
        return None
    age = (datetime.now(timezone.utc) - datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc)).days
    if age >= CACHE_TTL_DAYS:
        print(f"  [Schools] Cache {age}d old — rebuilding")
        return None
    with open(p) as f:
        data = json.load(f)
    data.pop("_meta", None)
    print(f"  [Schools] Loaded cache: {len(data)} schools (age: {age}d)")
    return data
