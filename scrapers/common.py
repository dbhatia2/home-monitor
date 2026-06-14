"""Shared scraper utilities — one source of truth for common patterns."""

import re
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

POLITE_DELAY = 1.5  # seconds between requests (per builder)


def parse_price(raw) -> "float | None":
    """'$1,234,567' → 1234567.0. Returns None on failure."""
    if raw is None:
        return None
    try:
        return float(str(raw).replace("$", "").replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def normalize_address(addr: str, city: str, state: str = "CA") -> str:
    """Append city/state if missing. '123 Main St' → '123 Main St, Tracy, CA'."""
    if not addr:
        return addr
    if city and city not in addr and state not in addr:
        return f"{addr}, {city}, {state}"
    return addr


def dedup_by_address(homes: list, prefer_status: str = "MOVE_IN_READY") -> list:
    """Deduplicate homes by lowercased address, preferring prefer_status."""
    homes_sorted = sorted(homes, key=lambda h: 0 if h.get("status") == prefer_status else 1)
    seen = set()
    unique = []
    for h in homes_sorted:
        key = h.get("address", "").strip().lower()
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        unique.append(h)
    return unique


def build_school_dict(name: str, enriched: dict, fallback: dict = None) -> dict:
    """Build a standardized school dict from a cache lookup + fallback data."""
    fb = fallback or {}
    return {
        "name":         enriched.get("name") or name,
        "grades":       enriched.get("grades") or fb.get("grades", ""),
        "type":         enriched.get("type") or fb.get("schoolType", "Public"),
        "district":     enriched.get("district") or fb.get("district", ""),
        "rating_gs":    enriched.get("rating_gs"),
        "rating_niche": fb.get("nicheGrade", ""),
        "rating_max":   10,
        "distance":     fb.get("distance", ""),
        "url":          enriched.get("url") or fb.get("nicheUrl", ""),
    }
