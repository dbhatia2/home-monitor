"""Auto-discover all BaseScraper subclasses in the scrapers package."""

import importlib
import pkgutil
import scrapers
from scrapers.base import BaseScraper

_SKIP = {"base", "common", "registry", "schools"}


def discover() -> dict:
    """
    Scan scrapers/ for modules containing BaseScraper subclasses.
    Returns: {builder_name: ScraperClass}
    """
    result = {}
    for _, modname, ispkg in pkgutil.iter_modules(scrapers.__path__):
        if modname in _SKIP:
            continue
        mod = importlib.import_module(f"scrapers.{modname}")
        for attr_name in dir(mod):
            cls = getattr(mod, attr_name)
            if (isinstance(cls, type)
                    and issubclass(cls, BaseScraper)
                    and cls is not BaseScraper
                    and hasattr(cls, "builder_name")):
                result[cls.builder_name] = cls
    return result
