"""Shared scraper utilities — one source of truth for common patterns."""

import re
import random
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Static headers (deprecated - use get_browser_headers() instead)
BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

POLITE_DELAY = 1.5  # seconds between requests (per builder)

# Builder-specific rate limits (some builders are more strict)
BUILDER_DELAYS = {
    "Lennar": 2.0,
    "KB Home": 2.0,
    "Taylor Morrison": 1.5,
    "Toll Brothers": 1.5,
}

# User agent rotation pool (appears like different browsers/systems)
USER_AGENTS = [
    # Chrome on Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    # Chrome on Mac
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    # Firefox on Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
    # Safari on Mac
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
    # Chrome on Linux
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
]

ACCEPT_LANGUAGES = [
    "en-US,en;q=0.9",
    "en-US,en;q=0.8,es;q=0.6",
    "en-GB,en;q=0.9,en-US;q=0.8",
]


def get_jittered_delay(builder_name=None, base_delay=None):
    """
    Get a randomized delay with jitter to avoid predictable timing patterns.

    Args:
        builder_name: Optional builder name to use builder-specific delay
        base_delay: Optional override for base delay (seconds)

    Returns:
        Float: delay in seconds with 0.8-1.5x random jitter
    """
    if base_delay is None:
        base_delay = BUILDER_DELAYS.get(builder_name, POLITE_DELAY)
    return base_delay * random.uniform(0.8, 1.5)


def get_random_user_agent():
    """Get a random user agent from the pool."""
    return random.choice(USER_AGENTS)


def get_browser_headers():
    """
    Generate realistic browser headers with randomization.

    Returns:
        Dict: HTTP headers that mimic a real browser
    """
    return {
        "User-Agent": get_random_user_agent(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": random.choice(ACCEPT_LANGUAGES),
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
    }


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
