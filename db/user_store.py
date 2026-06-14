"""CRUD for users and their preferences/city subscriptions."""

import json
from db.connection import get_connection


def get_active_users(frequency: str = None) -> list:
    """
    Get active users with their city subscriptions and preferences.
    If frequency is set, only return users with that alert_frequency.
    """
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            freq_filter = "AND up.alert_frequency = %s" if frequency else ""
            params = (frequency,) if frequency else ()

            cur.execute(f"""
                SELECT u.id, u.name, u.email,
                       up.min_beds, up.min_baths, up.max_price, up.min_sqft,
                       up.exclude_55_plus, up.preferred_neighborhoods,
                       up.preferred_builders, up.scoring_weights,
                       up.alert_frequency, up.alert_price_drops,
                       up.alert_new_listings, up.alert_coming_soon
                FROM users u
                JOIN user_preferences up ON up.user_id = u.id
                WHERE u.is_active = 1 {freq_filter}
                ORDER BY u.name
            """, params)
            users = cur.fetchall()

            # Get city subscriptions for each user
            for user in users:
                cur.execute("""
                    SELECT ci.name FROM user_cities uc
                    JOIN cities ci ON ci.id = uc.city_id
                    WHERE uc.user_id = %s AND ci.active = 1
                """, (user["id"],))
                user["cities"] = [r["name"] for r in cur.fetchall()]

                # Parse JSON fields
                for field in ("preferred_neighborhoods", "preferred_builders", "scoring_weights"):
                    val = user.get(field)
                    if isinstance(val, str):
                        try:
                            user[field] = json.loads(val)
                        except Exception:
                            user[field] = [] if field != "scoring_weights" else {}
                    elif val is None:
                        user[field] = [] if field != "scoring_weights" else {}

            return users
    finally:
        conn.close()


def get_user_by_email(email: str) -> "dict | None":
    """Get a single user by email."""
    users = get_active_users()
    for u in users:
        if u["email"] == email:
            return u
    return None
