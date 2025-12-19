#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""
Filter Encounters by Expansion Set
Removes all encounters that are not from Core or Forsaken Lore.
"""

import json
import re
from pathlib import Path

INPUT_DIR = Path("scraped_encounters")
OUTPUT_DIR = Path("scraped_encounters_filtered")

# Expansion sets to keep (case-insensitive matching)
ALLOWED_SETS = ["core", "forsaken lore", "01core", "02forsaken lore"]


def is_allowed_set(set_value) -> bool:
    """Check if the set value matches allowed expansions."""
    if set_value is None:
        return False
    
    # Handle both string and dict formats
    if isinstance(set_value, dict):
        text = set_value.get("text", "")
    else:
        text = str(set_value)
    
    # Normalize and check
    text_lower = text.lower().strip()
    
    # Check for Core (01Core, Core, etc.)
    if "core" in text_lower and "forsaken" not in text_lower:
        # Make sure it's specifically Core, not some other set with "core" in name
        if re.search(r'(^|\d)core', text_lower):
            return True
    
    # Check for Forsaken Lore (02Forsaken Lore, etc.)
    if "forsaken" in text_lower and "lore" in text_lower:
        return True
    
    return False


def count_all_encounters(data: dict) -> int:
    """Count all encounters in data (all_encounters, sections, or encounters)."""
    count = 0
    if data.get("all_encounters"):
        count += len(data["all_encounters"])
    
    # Check both "sections" and "encounters" keys
    for key in ["sections", "encounters"]:
        if data.get(key):
            for section_data in data[key].values():
                if isinstance(section_data, dict) and section_data.get("tables"):
                    count += len(section_data["tables"])
    return count


def filter_encounters(data: dict) -> dict:
    """Filter encounters to only include allowed sets."""
    # Deep copy to avoid modifying original
    import copy
    filtered = copy.deepcopy(data)
    
    # Filter all_encounters list
    if filtered.get("all_encounters"):
        original_count = len(filtered["all_encounters"])
        filtered["all_encounters"] = [
            enc for enc in filtered["all_encounters"]
            if is_allowed_set(enc.get("Set"))
        ]
        new_count = len(filtered["all_encounters"])
        if original_count != new_count:
            print(f"    all_encounters: {original_count} -> {new_count}")
    
    # Filter encounters in sections and encounters keys
    for key in ["sections", "encounters"]:
        if filtered.get(key):
            for section_name, section_data in filtered[key].items():
                if isinstance(section_data, dict) and section_data.get("tables"):
                    original_count = len(section_data["tables"])
                    section_data["tables"] = [
                        enc for enc in section_data["tables"]
                        if is_allowed_set(enc.get("Set"))
                    ]
                    new_count = len(section_data["tables"])
                    if original_count != new_count:
                        print(f"    {section_name}: {original_count} -> {new_count}")
            
            # Remove empty sections (sections with no tables, lists, or text)
            filtered[key] = {
                name: sdata for name, sdata in filtered[key].items()
                if sdata and (
                    not isinstance(sdata, dict) or 
                    sdata.get("tables") or 
                    sdata.get("lists") or 
                    sdata.get("text")
                )
            }
    
    # Rebuild all_encounters from sections/encounters if it was None
    if not filtered.get("all_encounters"):
        all_enc = []
        for key in ["sections", "encounters"]:
            if filtered.get(key):
                for section_data in filtered[key].values():
                    if isinstance(section_data, dict) and section_data.get("tables"):
                        all_enc.extend(section_data["tables"])
        if all_enc:
            filtered["all_encounters"] = all_enc
    
    return filtered


def main():
    # Fix Windows console encoding
    import sys
    import io
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    print("=" * 60)
    print("[*] ENCOUNTER FILTER - Core & Forsaken Lore Only")
    print("=" * 60)
    print()
    
    # Create output directory
    OUTPUT_DIR.mkdir(exist_ok=True)
    print(f"[+] Input: {INPUT_DIR.absolute()}")
    print(f"[+] Output: {OUTPUT_DIR.absolute()}")
    print()
    
    # Process each JSON file
    json_files = list(INPUT_DIR.glob("*.json"))
    
    stats = {}
    
    for json_file in json_files:
        if json_file.name.startswith("_"):
            continue  # Skip summary files
        
        print(f"[>] Processing {json_file.name}...")
        
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # Count before (all sources)
        before_count = count_all_encounters(data)
        
        # Filter
        filtered = filter_encounters(data)
        
        # Count after (all sources)
        after_count = count_all_encounters(filtered)
        
        # Save filtered data
        output_file = OUTPUT_DIR / json_file.name
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(filtered, f, indent=2, ensure_ascii=False)
        
        stats[json_file.name] = {
            "before": before_count,
            "after": after_count,
            "removed": before_count - after_count,
        }
        
        print(f"    Total: {before_count} -> {after_count} (removed {before_count - after_count})")
        print()
    
    # Save stats
    stats_file = OUTPUT_DIR / "_filter_stats.json"
    with open(stats_file, "w", encoding="utf-8") as f:
        json.dump({
            "filter": "Core and Forsaken Lore only",
            "allowed_sets": ALLOWED_SETS,
            "files": stats,
            "totals": {
                "before": sum(s["before"] for s in stats.values()),
                "after": sum(s["after"] for s in stats.values()),
                "removed": sum(s["removed"] for s in stats.values()),
            }
        }, f, indent=2, ensure_ascii=False)
    
    print("=" * 60)
    print("[OK] Filtering complete!")
    print(f"    Total encounters: {sum(s['before'] for s in stats.values())} -> {sum(s['after'] for s in stats.values())}")
    print(f"    Removed: {sum(s['removed'] for s in stats.values())} encounters")
    print(f"[+] Files saved to: {OUTPUT_DIR.absolute()}")
    print("=" * 60)


if __name__ == "__main__":
    main()

