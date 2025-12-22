#!/usr/bin/env python3
"""
Filter mythos cards to only include Core Game and Forsaken Lore expansions.

This script reads mythos_cards.json and filters it to only keep cards
from Core Game or Forsaken Lore expansions.
"""

import json
import sys
from pathlib import Path
from datetime import datetime


def is_core_or_forsaken_lore(card):
    """
    Check if a card is from Core Game or Forsaken Lore.
    
    Args:
        card: A mythos card dictionary
        
    Returns:
        True if the card is from Core Game or Forsaken Lore, False otherwise
    """
    # Check categories array
    if "categories" in card:
        for category in card["categories"]:
            if category == "Core Game" or category == "Forsaken Lore":
                return True
    
    # Check infobox.expansion
    if "infobox" in card and "expansion" in card["infobox"]:
        expansion = card["infobox"]["expansion"]
        if "Core Game" in expansion or "FL imagelink" in expansion:
            return True
    
    # Check cardData.expansion
    if "cardData" in card and "expansion" in card["cardData"]:
        expansion = card["cardData"]["expansion"]
        if "Core Game" in expansion or "FL imagelink" in expansion:
            return True
    
    return False


def filter_mythos_cards(input_file: str, output_file: str):
    """
    Filter mythos cards to only Core Game and Forsaken Lore.
    
    Args:
        input_file: Path to mythos_cards.json
        output_file: Path to output JSON file (can be same as input)
    """
    print("=" * 60)
    print("MYTHOS CARD FILTER")
    print("   Filtering to Core Game and Forsaken Lore only")
    print("=" * 60)
    print()
    
    # Read input file
    print(f"Reading input file: {input_file}")
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"ERROR: File not found: {input_file}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in {input_file}: {e}")
        sys.exit(1)
    
    # Get all cards
    if "mythosCards" not in data:
        print("ERROR: No 'mythosCards' key found in data")
        sys.exit(1)
    
    all_cards = data["mythosCards"]
    print(f"Total cards before filtering: {len(all_cards)}")
    
    # Filter cards
    print("Filtering cards...")
    filtered_cards = [card for card in all_cards if is_core_or_forsaken_lore(card)]
    
    print(f"Cards after filtering: {len(filtered_cards)}")
    print(f"Removed: {len(all_cards) - len(filtered_cards)} cards")
    
    # Update metadata
    data["metadata"]["filteredAt"] = datetime.now().isoformat()
    data["metadata"]["totalMythosCards"] = len(filtered_cards)
    data["metadata"]["filterDescription"] = "Filtered to only Core Game and Forsaken Lore expansions"
    data["mythosCards"] = filtered_cards
    
    # Write output file
    print(f"\nWriting output to: {output_file}")
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"SUCCESS: Successfully wrote {len(filtered_cards)} cards to {output_file}")
    except Exception as e:
        print(f"ERROR: Error writing output file: {e}")
        sys.exit(1)
    
    # Print summary
    print("\n" + "=" * 60)
    print("FILTERING SUMMARY")
    print("=" * 60)
    print(f"Total Cards Before: {len(all_cards)}")
    print(f"Total Cards After: {len(filtered_cards)}")
    print(f"Cards Removed: {len(all_cards) - len(filtered_cards)}")
    
    # Count by expansion
    core_count = 0
    fl_count = 0
    
    for card in filtered_cards:
        if "categories" in card and "Core Game" in card["categories"]:
            core_count += 1
        elif "categories" in card and "Forsaken Lore" in card["categories"]:
            fl_count += 1
        elif "infobox" in card and "expansion" in card["infobox"]:
            exp = card["infobox"]["expansion"]
            if "Core Game" in exp:
                core_count += 1
            elif "FL imagelink" in exp:
                fl_count += 1
    
    print(f"\nCore Game cards: {core_count}")
    print(f"Forsaken Lore cards: {fl_count}")
    
    print("\n" + "=" * 60)
    print("SUCCESS: Filtering complete!")
    print("=" * 60)


def main():
    """Main entry point"""
    # Get script directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    # Default paths
    input_file = project_root / "mythos_cards.json"
    output_file = project_root / "mythos_cards.json"  # Overwrite input file
    
    # Allow command line arguments to override
    if len(sys.argv) > 1:
        input_file = Path(sys.argv[1])
    if len(sys.argv) > 2:
        output_file = Path(sys.argv[2])
    
    filter_mythos_cards(str(input_file), str(output_file))


if __name__ == "__main__":
    main()

