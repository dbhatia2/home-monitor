"""Price drop detection + new listing detection."""


def detect_changes(homes: list, yesterday_map: dict) -> list:
    """
    Compare current homes against yesterday's snapshot.
    Flags: price_drop, price_drop_amount, prev_price, new_listing.
    """
    for home in homes:
        key = f"{home.get('builder')}::{home.get('homesite') or home.get('address')}"
        curr_price = home.get("price") or 0
        was_price = home.get("was_price")

        home["price_drop"] = False
        home["price_drop_amount"] = 0
        home["prev_price"] = None
        home["new_listing"] = key not in yesterday_map

        # Method 1: compare against yesterday snapshot
        if key in yesterday_map:
            prev = yesterday_map[key].get("price") or 0
            home["prev_price"] = prev
            if curr_price and prev and curr_price < prev:
                home["price_drop"] = True
                home["price_drop_amount"] = round(prev - curr_price, 2)

        # Method 2: builder's own was_price (e.g. Lennar wasPrice)
        if not home["price_drop"] and was_price and curr_price and curr_price < was_price:
            home["price_drop"] = True
            home["price_drop_amount"] = round(was_price - curr_price, 2)
            if not home["prev_price"]:
                home["prev_price"] = was_price

    return homes
