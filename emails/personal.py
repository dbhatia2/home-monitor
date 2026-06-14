"""Personalized scored email + MIR mode. Profile from DB user preferences."""

import os
from datetime import datetime
from pathlib import Path
from emails import sender as email_sender
from emails import loader as email_loader
from emails.styles import (page_wrap, header_block, section_header, home_card,
                            footer_block, GREEN, TEXT_PRI, TEXT_MUT)
from profiles.schema import Profile, filter_homes, score_home


def _user_to_profile(user: dict) -> Profile:
    """Convert DB user dict to Profile dataclass."""
    return Profile(
        name=user["name"],
        email=user["email"],
        cities=user.get("cities", []),
        min_beds=user.get("min_beds") or 1,
        min_baths=float(user.get("min_baths") or 1),
        max_price=user.get("max_price"),
        min_sqft=user.get("min_sqft"),
        exclude_55_plus=bool(user.get("exclude_55_plus", True)),
        preferred_neighborhoods=user.get("preferred_neighborhoods") or [],
        preferred_builders=user.get("preferred_builders") or [],
        weights=user.get("scoring_weights") or {},
    )


def _scored_card(home, rank):
    """Home card with score bar."""
    score = home.get("score", 0)
    base = home_card(home, rank=rank)
    score_html = f"""<p style="margin:8px 0 0;">
<span style="font-size:11px;color:{TEXT_MUT};font-weight:600;">MATCH SCORE</span><br>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:2px;">
<tr><td style="background:#E2E8F0;border-radius:4px;height:8px;">
<div style="width:{min(score,100):.0f}%;height:8px;background:{GREEN};border-radius:4px;"></div>
</td><td width="40" style="text-align:right;font-size:12px;font-weight:700;color:{TEXT_PRI};padding-left:8px;">
{score:.0f}</td></tr></table></p>"""
    insert = base.rfind("</td></tr></table>")
    if insert > 0:
        base = base[:insert] + score_html + base[insert:]
    return base


def build_and_send(user: dict, mode: str = "personal"):
    """Build and send personalized email. mode: 'personal' or 'mir'."""
    homes = email_loader.load_for_user(user)
    if not homes:
        print(f"  No homes for {user['name']} — skipping")
        return

    profile = _user_to_profile(user)
    filtered = filter_homes(homes, profile)

    if mode == "mir":
        filtered = [h for h in filtered if h.get("status") in ("MOVE_IN_READY", "QUICK_MOVE_IN")]

    # Score
    for h in filtered:
        h["score"] = score_home(h, profile, filtered)
    filtered.sort(key=lambda h: h["score"], reverse=True)
    top = filtered[:5]

    now = datetime.now()
    cities = user.get("cities", [])

    if mode == "mir":
        title = f"{user['name']}'s Move-In Ready"
        subtitle = "Homes you can move into NOW"
    else:
        title = f"{user['name']}'s Top Picks"
        subtitle = " · ".join(cities) if cities else "All Cities"

    body = header_block(title, subtitle, now.strftime("%A, %B %d, %Y"))

    if top:
        label = f"Top {len(top)} {'MIR' if mode == 'mir' else 'Matches'}"
        body += section_header(label, "🎯" if mode == "personal" else "🏠")
        for i, h in enumerate(top, 1):
            body += _scored_card(h, rank=i)
    else:
        body += f'<tr><td style="padding:20px 32px;color:{TEXT_MUT};">No homes match your criteria.</td></tr>'

    body += footer_block(cities)
    html = page_wrap(body, f"{user['name']} — Home Monitor")

    suffix = "mir" if mode == "mir" else "personal"
    preview = Path(os.environ.get("OUTPUT_DIR", "data")) / f"email_{suffix}_{user['name'].lower()}.html"
    with open(preview, "w") as f:
        f.write(html)

    subject_type = "MIR Report" if mode == "mir" else "Top Picks"
    subject = f"{user['name']} — {subject_type} {now.strftime('%m/%d')}"
    email_sender.send(html, subject, user["email"])
