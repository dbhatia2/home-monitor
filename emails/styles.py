"""Design tokens + HTML email components. No city names anywhere."""

# ── Colors ────────────────────────────────────────────────────
BG_LIGHT    = "#F8FAFC"
BG_WHITE    = "#FFFFFF"
BG_DARK     = "#0F172A"
TEXT_PRI    = "#1E293B"
TEXT_MUT    = "#64748B"
GREEN       = "#10B981"
RED         = "#EF4444"
AMBER       = "#F59E0B"
BORDER      = "#E2E8F0"

# Builder colors — can be extended dynamically from DB
BUILDER_COLORS = {
    "Lennar": "#1D4ED8", "KB Home": "#DC2626", "Toll Brothers": "#6D28D9",
    "Taylor Morrison": "#059669", "JMC Homes": "#7C2D12",
    "Brookfield Residential": "#374151", "Century Communities": "#B45309",
}

GS_COLORS = {10:"#166534",9:"#15803D",8:"#16A34A",7:"#65A30D",6:"#CA8A04",
             5:"#D97706",4:"#EA580C",3:"#DC2626",2:"#B91C1C",1:"#991B1B"}

def _gs_color(r):
    try: return GS_COLORS.get(int(r), TEXT_MUT)
    except: return TEXT_MUT


def page_wrap(body, title="Home Monitor"):
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>{title}</title></head>
<body style="margin:0;padding:0;background:{BG_LIGHT};font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:{BG_LIGHT};">
<tr><td align="center" style="padding:20px 10px;">
<table width="640" cellpadding="0" cellspacing="0" style="background:{BG_WHITE};border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
{body}
</table></td></tr></table></body></html>"""


def header_block(title, subtitle="", date_str=""):
    sub = f'<p style="margin:4px 0 0;font-size:14px;color:rgba(255,255,255,0.8);">{subtitle}</p>' if subtitle else ""
    dt = f'<p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.6);">{date_str}</p>' if date_str else ""
    return f'<tr><td style="background:linear-gradient(135deg,{BG_DARK} 0%,#1E40AF 100%);padding:28px 32px;color:white;"><h1 style="margin:0;font-size:24px;font-weight:700;">{title}</h1>{sub}{dt}</td></tr>'


def section_header(title, icon=""):
    return f'<tr><td style="padding:24px 32px 8px;"><h2 style="margin:0;font-size:18px;font-weight:700;color:{TEXT_PRI};border-bottom:2px solid {GREEN};padding-bottom:8px;">{icon} {title}</h2></td></tr>'


def builder_badge(name):
    c = BUILDER_COLORS.get(name, TEXT_MUT)
    return f'<span style="display:inline-block;background:{c};color:white;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;">{name}</span>'


def status_badge(status):
    colors = {"MOVE_IN_READY":GREEN,"QUICK_MOVE_IN":GREEN,"AVAILABLE":"#3B82F6",
              "UNDER_CONSTRUCTION":AMBER,"COMING_SOON":TEXT_MUT,"MODEL_HOME":"#8B5CF6"}
    c = colors.get(status, TEXT_MUT)
    label = status.replace("_"," ").title()
    return f'<span style="display:inline-block;background:{c}22;color:{c};padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600;">{label}</span>'


def home_card(home, rank=0):
    price = home.get("price",0); was = home.get("was_price") or home.get("prev_price")
    drop = home.get("price_drop_amount",0)
    sqft = home.get("sqft",0)
    ppsf = f"${int(price/sqft)}/sqft" if sqft and price else ""
    city = home.get("city","")

    rank_html = f'<span style="display:inline-block;background:{GREEN};color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;margin-right:6px;">#{rank}</span>' if rank else ""

    price_html = f'<span style="font-weight:700;font-size:20px;color:{TEXT_PRI};">${price:,.0f}</span>' if price else "TBD"
    if drop and was:
        price_html = (f'<span style="color:{RED};font-weight:700;font-size:20px;">${price:,.0f}</span>'
                      f'<br><span style="text-decoration:line-through;color:{TEXT_MUT};font-size:13px;">${was:,.0f}</span>'
                      f' <span style="color:{RED};font-size:12px;">-${drop:,.0f}</span>')

    specs = []
    if home.get("beds"): specs.append(f"{home['beds']} bed")
    if home.get("baths"): specs.append(f"{home['baths']} bath")
    if sqft: specs.append(f"{sqft:,.0f} sqft")
    specs_str = " &bull; ".join(specs)

    schools_html = ""
    for s in (home.get("schools") or [])[:3]:
        r = s.get("rating_gs")
        c = _gs_color(r)
        badge = f' <span style="color:{c};font-weight:700;">{r}/10</span>' if r else ""
        schools_html += f'{s.get("name","")[:30]}{badge}<br>'
    if schools_html:
        schools_html = f'<p style="margin:8px 0 0;font-size:12px;color:{TEXT_MUT};">Schools: {schools_html}</p>'

    return f"""<tr><td style="padding:8px 32px;">
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid {BORDER};border-radius:10px;overflow:hidden;">
<tr><td style="padding:16px 20px;">
<p style="margin:0 0 4px;">{rank_html}{builder_badge(home.get('builder',''))}</p>
<p style="margin:0;font-size:13px;color:{TEXT_MUT};">{home.get('community','')} &mdash; {city}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
<tr><td width="50%" valign="top">{price_html}<p style="margin:4px 0 0;font-size:12px;color:{TEXT_MUT};">{ppsf}</p></td>
<td width="50%" valign="top" style="text-align:right;">
<p style="margin:0;font-size:14px;color:{TEXT_PRI};">{specs_str}</p>
<p style="margin:4px 0 0;">{status_badge(home.get('status',''))}</p></td></tr></table>
<p style="margin:8px 0 0;font-size:12px;color:{TEXT_MUT};">{home.get('address','')}</p>
{schools_html}
</td></tr></table></td></tr>"""


def stat_row(label, value):
    return f'<tr><td style="padding:4px 0;font-size:13px;color:{TEXT_MUT};">{label}</td><td style="padding:4px 0;font-size:13px;font-weight:600;color:{TEXT_PRI};text-align:right;">{value}</td></tr>'


def cross_city_table(stats_by_city):
    """Render cross-city comparison table. stats_by_city = {city: {active, median, ppsf, mir, drops}}."""
    if not stats_by_city:
        return ""
    cities = list(stats_by_city.keys())
    header = "".join(f'<th style="padding:8px;font-size:12px;color:{TEXT_PRI};border-bottom:2px solid {BORDER};">{c}</th>' for c in cities)
    rows_data = [
        ("Active Homes", "active"), ("Median Price", "median"),
        ("Avg $/sqft", "ppsf"), ("Move-In Ready", "mir"), ("Price Drops", "drops"),
    ]
    rows_html = ""
    for label, key in rows_data:
        cells = ""
        for c in cities:
            val = stats_by_city[c].get(key, 0)
            if key == "median":
                display = f"${val:,.0f}" if val else "—"
            elif key == "ppsf":
                display = f"${val}" if val else "—"
            else:
                display = str(val) if val else "0"
            cells += f'<td style="padding:6px 8px;font-size:13px;text-align:center;border-bottom:1px solid {BORDER};">{display}</td>'
        rows_html += f'<tr><td style="padding:6px 8px;font-size:13px;font-weight:600;color:{TEXT_PRI};border-bottom:1px solid {BORDER};">{label}</td>{cells}</tr>'

    return f"""<tr><td style="padding:8px 32px;">
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid {BORDER};border-radius:8px;overflow:hidden;">
<tr><th style="padding:8px;font-size:12px;color:{TEXT_MUT};border-bottom:2px solid {BORDER};text-align:left;"></th>{header}</tr>
{rows_html}</table></td></tr>"""


def footer_block(cities=None):
    city_str = " &bull; ".join(cities) if cities else "Multi-City"
    return f'<tr><td style="padding:20px 32px;background:{BG_LIGHT};text-align:center;"><p style="margin:0;font-size:11px;color:{TEXT_MUT};">Home Monitor &mdash; {city_str}, CA<br>Automated daily report</p></td></tr>'
