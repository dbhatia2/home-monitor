"""Profile dataclass + filter + scorer. City filter enforced."""

import re
from dataclasses import dataclass, field
from typing import Optional

DEFAULTS_WEIGHTS = {"value_ppsf": 40, "price_drop": 30, "availability": 20, "sqft_bonus": 5, "hotw": 5}


@dataclass
class Profile:
    name: str = ""
    email: str = ""
    cities: list = field(default_factory=list)
    min_beds: int = 1
    min_baths: float = 1.0
    max_price: Optional[float] = None
    min_sqft: Optional[float] = None
    exclude_55_plus: bool = True
    preferred_neighborhoods: list = field(default_factory=list)
    preferred_builders: list = field(default_factory=list)
    weights: dict = field(default_factory=lambda: dict(DEFAULTS_WEIGHTS))


def _parse_baths(val) -> float:
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).lower().strip()
    if not s or s == "nan":
        return 0.0
    if "half" in s:
        try:
            return float(s.split("+")[0].strip()) + 0.5
        except Exception:
            pass
    try:
        return float(s)
    except Exception:
        return 0.0


def filter_homes(homes: list, profile: Profile) -> list:
    """Apply profile hard filters. City filter enforced."""
    result = []
    for h in homes:
        # City filter — THE FIX that was missing in roseville-monitor
        if profile.cities and h.get("city") and h["city"] not in profile.cities:
            continue

        # 55+ exclusion
        if profile.exclude_55_plus:
            comm = str(h.get("community", "")).lower()
            if "55+" in comm or "active adult" in comm:
                continue
            if h.get("is_55_plus"):
                continue

        # Status exclusion
        status = str(h.get("status", "")).upper()
        if status in ("SOLD", "FUTURE", "MODEL_HOME"):
            continue

        # Beds
        try:
            beds = int(h.get("beds") or 0)
        except (ValueError, TypeError):
            beds = 0
        if beds < profile.min_beds:
            continue

        # Baths
        if _parse_baths(h.get("baths")) < profile.min_baths:
            continue

        # Price
        price = h.get("price") or 0
        if price <= 0 and status != "COMING_SOON":
            continue
        if profile.max_price and price > profile.max_price:
            continue

        # Sqft
        sqft = h.get("sqft") or 0
        if profile.min_sqft and sqft > 0 and sqft < profile.min_sqft:
            continue

        result.append(h)
    return result


def score_home(home: dict, profile: Profile, all_homes: list) -> float:
    """Score a home 0-100 based on profile weights."""
    w = profile.weights or DEFAULTS_WEIGHTS
    total = 0.0

    sqft = home.get("sqft") or 0
    price = home.get("price") or 0

    # Value per sqft (lower = better)
    if sqft > 0 and price > 0:
        ppsf = price / sqft
        all_ppsf = [h["price"]/h["sqft"] for h in all_homes if h.get("sqft") and h.get("price") and h["sqft"] > 0]
        if all_ppsf:
            worst, best = max(all_ppsf), min(all_ppsf)
            spread = worst - best if worst != best else 1
            total += (1 - (ppsf - best) / spread) * w.get("value_ppsf", 40)

    # Price drop
    if home.get("price_drop"):
        total += w.get("price_drop", 30)

    # Availability
    status = str(home.get("status", "")).upper()
    if status in ("MOVE_IN_READY", "QUICK_MOVE_IN"):
        total += w.get("availability", 20)
    elif status in ("AVAILABLE", "UNDER_CONSTRUCTION"):
        total += w.get("availability", 20) * 0.6

    # Sqft bonus
    if sqft >= 2500:
        total += w.get("sqft_bonus", 5)
    elif sqft >= 2000:
        total += w.get("sqft_bonus", 5) * 0.5

    # HOTW
    if home.get("is_hotw"):
        total += w.get("hotw", 5)

    # Neighborhood bonus (+5)
    community = str(home.get("community", "")).lower()
    if any(p.lower() in community for p in profile.preferred_neighborhoods):
        total += 5

    # Builder bonus (+3)
    if home.get("builder") in profile.preferred_builders:
        total += 3

    return min(round(total, 1), 100)
