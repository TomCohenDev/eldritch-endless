#!/usr/bin/env python3
"""
Extract all Mythos card data from eldritch_horror_data.json

This script reads the eldritch_horror_data.json file and extracts all
mythos cards with their complete data including:
- Title and pageId
- All categories
- Infobox data
- Card data
- Sections
- Links
- Templates
- Full text
- Raw wikitext
"""

import json
import sys
from pathlib import Path
from datetime import datetime


def extract_mythos_cards(input_file: str, output_file: str):
    """
    Extract all mythos cards from the input JSON file and write to output file.
    
    Args:
        input_file: Path to eldritch_horror_data.json
        output_file: Path to output JSON file
    """
    print("=" * 60)
    print("MYTHOS CARD EXTRACTOR")
    print("   Extracting all Mythos cards from Eldritch Horror data")
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
    
    # Extract mythos cards
    print("Extracting mythos cards...")
    mythos_cards = []
    
    if "categories" in data and "mythos" in data["categories"]:
        mythos_cards = data["categories"]["mythos"]
        print(f"SUCCESS: Found {len(mythos_cards)} mythos cards in categories.mythos")
    else:
        print("WARNING: No categories.mythos found, searching allPages...")
        # Fallback: search allPages for entries with "Mythos" in categories
        if "allPages" in data:
            for title, page_data in data["allPages"].items():
                if isinstance(page_data, dict) and "categories" in page_data:
                    if isinstance(page_data["categories"], list) and "Mythos" in page_data["categories"]:
                        mythos_cards.append(page_data)
            print(f"SUCCESS: Found {len(mythos_cards)} mythos cards in allPages")
        else:
            print("ERROR: No mythos cards found in data structure")
            sys.exit(1)
    
    # Create output structure
    output_data = {
        "metadata": {
            "source": "eldritch_horror_data.json",
            "extractedAt": datetime.now().isoformat(),
            "totalMythosCards": len(mythos_cards),
            "description": "Complete mythos card data including all properties, categories, tags, and text"
        },
        "mythosCards": mythos_cards
    }
    
    # Write output file
    print(f"\nWriting output to: {output_file}")
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        print(f"SUCCESS: Successfully wrote {len(mythos_cards)} mythos cards to {output_file}")
    except Exception as e:
        print(f"ERROR: Error writing output file: {e}")
        sys.exit(1)
    
    # Print summary
    print("\n" + "=" * 60)
    print("EXTRACTION SUMMARY")
    print("=" * 60)
    print(f"Total Mythos Cards: {len(mythos_cards)}")
    
    # Count by expansion/set
    expansions = {}
    for card in mythos_cards:
        # Try to get expansion from infobox or cardData
        expansion = "Unknown"
        if "infobox" in card and "expansion" in card["infobox"]:
            expansion = card["infobox"]["expansion"]
        elif "cardData" in card and "expansion" in card["cardData"]:
            expansion = card["cardData"]["expansion"]
        elif "categories" in card:
            # Look for expansion in categories (e.g., "Core Game", "Masks of Nyarlathotep")
            for cat in card["categories"]:
                if cat != "Mythos" and cat not in ["Rumor", "Event", "Ongoing"]:
                    expansion = cat
                    break
        
        expansions[expansion] = expansions.get(expansion, 0) + 1
    
    print("\nCards by Expansion/Set:")
    for expansion, count in sorted(expansions.items()):
        print(f"  {expansion}: {count}")
    
    # Count by type (from categories)
    types = {}
    for card in mythos_cards:
        if "categories" in card:
            for cat in card["categories"]:
                if cat in ["Rumor", "Event", "Ongoing"]:
                    types[cat] = types.get(cat, 0) + 1
    
    if types:
        print("\nCards by Type:")
        for card_type, count in sorted(types.items()):
            print(f"  {card_type}: {count}")
    
    print("\n" + "=" * 60)
    print("SUCCESS: Extraction complete!")
    print("=" * 60)


def main():
    """Main entry point"""
    # Get script directory
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    
    # Default paths
    input_file = project_root / "eldritch_horror_data.json"
    output_file = project_root / "mythos_cards.json"
    
    # Allow command line arguments to override
    if len(sys.argv) > 1:
        input_file = Path(sys.argv[1])
    if len(sys.argv) > 2:
        output_file = Path(sys.argv[2])
    
    extract_mythos_cards(str(input_file), str(output_file))


if __name__ == "__main__":
    main()

