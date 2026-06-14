"""Daily digest email with cross-city comparison. User-scoped via city subscriptions."""

import os
from datetime import datetime
from pathlib import Path
from emails import sender as email_sender
from emails import loader as email_loader
from emails.styles import (page_wrap, header_block, section_header, home_card,
                            stat_row, cross_city_table, footer_block)


def _compute_stats(homes):
    """Compute market stats from a list of homes."""
    active = [h for h in homes if h.get("price") and h.get("status") not in ("SOLD", "FUTURE", "COMING_SOON")]
    prices = sorted([h["price"] for h in active if h.get("price")])
    return {
        "active": len(active),
        "median": prices[len(prices)//2] if prices else 0,
        "ppsf": int(sum(h["price"]/h["sqft"] for h in active if h.get("sqft") and h.get("price"))
                     / max(1, len([h for h in active if h.get("sqft")]))) if active else 0,
        "mir": len([h for h in active if h.get("status") in ("MOVE_IN_READY", "QUICK_MOVE_IN")]),
        "drops": len([h for h in active if h.get("price_drop")]),
    }


def _top_deals(homes, n=5):
    """Best value homes by $/sqft."""
    eligible = [h for h in homes
                if h.get("price") and h.get("sqft") and h["sqft"] > 0
                and h.get("status") not in ("SOLD", "FUTURE", "COMING_SOON")
                and "55+" not in str(h.get("community", "")).lower()
                and "active adult" not in str(h.get("community", "")).lower()]
    eligible.sort(key=lambda h: h["price"] / h["sqft"])
    return eligible[:n]


def _price_drops(homes, n=10):
    drops = [h for h in homes if h.get("price_drop") and h.get("price_drop_amount", 0) > 0]
    drops.sort(key=lambda h: h.get("price_drop_amount", 0), reverse=True)
    return drops[:n]


def build_and_send(user: dict):
    """Build and send daily digest for one user."""
    homes = email_loader.load_for_user(user)
    if not homes:
        print(f"  No homes for {user['name']} — skipping digest")
        return

    cities = user.get("cities", [])
    now = datetime.now()
    total_active = len([h for h in homes if h.get("status") not in ("SOLD", "FUTURE", "COMING_SOON")])

    body = header_block(
        f"{user['name']}'s Daily Digest",
        f"{total_active} active homes across {len(cities)} {'city' if len(cities)==1 else 'cities'}",
        now.strftime("%A, %B %d, %Y")
    )

    # Cross-city comparison (only if 2+ cities)
    if len(cities) >= 2:
        stats_by_city = {}
        for city in cities:
            city_homes = [h for h in homes if h.get("city") == city]
            stats_by_city[city] = _compute_stats(city_homes)
        body += section_header("Market Comparison", "📊")
        body += cross_city_table(stats_by_city)

    # Overall stats
    overall = _compute_stats(homes)
    body += section_header("Market Dashboard", "📊")
    body += '<tr><td style="padding:8px 32px;"><table width="100%" cellpadding="0" cellspacing="0">'
    body += stat_row("Active Listings", str(overall["active"]))
    body += stat_row("Median Price", f"${overall['median']:,.0f}")
    body += stat_row("Avg $/sqft", f"${overall['ppsf']}")
    body += stat_row("Move-In Ready", str(overall["mir"]))
    body += stat_row("Price Drops", str(overall["drops"]))
    body += '</table></td></tr>'

    # Top deals
    deals = _top_deals(homes)
    if deals:
        body += section_header(f"Top {len(deals)} Best Value", "💎")
        for i, h in enumerate(deals, 1):
            body += home_card(h, rank=i)

    # Price drops
    drops = _price_drops(homes)
    if drops:
        body += section_header(f"{len(drops)} Price Drop(s)", "📉")
        for h in drops:
            body += home_card(h)

    body += footer_block(cities)
    html = page_wrap(body, f"{user['name']} — Home Monitor")

    # Save preview
    preview = Path(os.environ.get("OUTPUT_DIR", "data")) / f"email_preview_{user['name'].lower()}.html"
    with open(preview, "w") as f:
        f.write(html)

    subject = f"Home Monitor — Daily Digest {now.strftime('%m/%d')}"
    email_sender.send(html, subject, user["email"])
