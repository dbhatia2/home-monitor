"""BaseScraper ABC — interface contract for all builder scrapers."""

from abc import ABC, abstractmethod
from typing import ClassVar


class BaseScraper(ABC):
    """
    All builder scrapers inherit from this.

    Contract:
        - builder_name: must match builders.name in the DB
        - scrape(): receives community configs from DB, returns standard home dicts
    """
    builder_name: ClassVar[str]

    @abstractmethod
    def scrape(self, communities: list, schools_cache: dict) -> list:
        """
        Scrape homes for the given communities.

        Args:
            communities: from db.config_reader.get_active_communities(), filtered to this builder.
                Each dict has: name, city, url, is_55_plus, status, builder_meta
            schools_cache: shared GreatSchools lookup dict from scrapers.schools

        Returns:
            list of home dicts with the standard schema:
                builder, community, city, address, home_url, plan_name, homesite,
                beds, baths, sqft, price, was_price, status, is_hotw, is_available, schools
        """
        ...
