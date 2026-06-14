"""JSON snapshot save/load for change detection."""

import json
from pathlib import Path


def load(path: str) -> dict:
    """Load previous snapshot and return {key: home} map for change detection."""
    p = Path(path)
    if not p.exists():
        return {}
    with open(p) as f:
        homes = json.load(f)
    return {
        f"{h.get('builder')}::{h.get('homesite') or h.get('address')}": h
        for h in homes
        if h.get("builder") and (h.get("homesite") or h.get("address"))
    }


def save(homes: list, path: str):
    """Save combined snapshot."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(homes, f, indent=2)


def save_per_builder(homes: list, output_dir: str):
    """Save per-builder snapshot files."""
    by_builder = {}
    for h in homes:
        by_builder.setdefault(h.get("builder", "Unknown"), []).append(h)
    for builder_name, builder_homes in by_builder.items():
        slug = builder_name.lower().replace(" ", "_")
        path = Path(output_dir) / f"snapshot_{slug}.json"
        with open(path, "w") as f:
            json.dump(builder_homes, f, indent=2)
