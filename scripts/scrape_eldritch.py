#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "httpx",
# ]
# ///
"""
The Necronomicon Compiler
Scrapes the entire Eldritch Horror Wiki into a single JSON file.
"""

import json
import re
import time
from datetime import datetime
from pathlib import Path

import httpx

BASE_URL = "https://eldritchhorror.fandom.com"
API_ENDPOINT = f"{BASE_URL}/api.php"
DELAY_SECONDS = 0.5  # Be nice to the server
BATCH_SIZE = 50


def fetch_all_page_titles(client: httpx.Client) -> list[dict]:
    """Fetch all page titles from the wiki using pagination."""
    all_pages = []
    continue_token = ""
    
    print("📜 Fetching page list...")
    
    while True:
        params = {
            "action": "query",
            "list": "allpages",
            "aplimit": BATCH_SIZE,
            "apnamespace": 0,
            "format": "json",
        }
        if continue_token:
            params["apcontinue"] = continue_token
        
        response = client.get(API_ENDPOINT, params=params)
        data = response.json()
        
        pages = data.get("query", {}).get("allpages", [])
        all_pages.extend(pages)
        
        print(f"   Fetched {len(all_pages)} pages...", end="\r")
        
        # Check for more pages
        continue_data = data.get("continue", {})
        if "apcontinue" in continue_data:
            continue_token = continue_data["apcontinue"]
            time.sleep(DELAY_SECONDS)
        else:
            break
    
    print(f"✅ Found {len(all_pages)} total pages        ")
    return all_pages


def fetch_page_content(client: httpx.Client, title: str) -> dict:
    """Fetch full content and categories for a single page."""
    params = {
        "action": "query",
        "prop": "revisions|categories",
        "rvprop": "content",
        "rvslots": "main",
        "titles": title,
        "format": "json",
    }
    
    response = client.get(API_ENDPOINT, params=params)
    data = response.json()
    
    pages = data.get("query", {}).get("pages", {})
    page_data = list(pages.values())[0] if pages else {}
    
    # Extract content
    content = ""
    revisions = page_data.get("revisions", [])
    if revisions:
        slots = revisions[0].get("slots", {})
        content = slots.get("main", {}).get("*", "") or revisions[0].get("*", "")
    
    # Extract categories
    categories = [
        cat["title"].replace("Category:", "")
        for cat in page_data.get("categories", [])
    ]
    
    return {"content": content, "categories": categories}


def parse_wikitext(content: str, title: str) -> dict:
    """Parse wikitext content to extract structured data."""
    parsed = {
        "title": title,
        "infobox": {},
        "sections": {},  # Now a dict with section name -> content
        "links": [],
        "templates": [],
        "fullText": "",  # Full cleaned text, no truncation
        "cardData": {},  # Specific card fields
    }
    
    # Extract ALL template parameters (not just infobox)
    # This catches card effects, tests, flavor text etc.
    for template_match in re.finditer(r"\{\{([^}]+)\}\}", content, re.DOTALL):
        template_content = template_match.group(1)
        for match in re.finditer(r"\|\s*([^=\n]+)\s*=\s*([^|\n][^|]*?)(?=\||\}\}|$)", template_content, re.DOTALL):
            key = match.group(1).strip().lower()
            value = match.group(2).strip()
            # Clean wiki markup from values
            value = re.sub(r"\[\[([^|\]]+)\|([^\]]+)\]\]", r"\2", value)
            value = re.sub(r"\[\[([^\]]+)\]\]", r"\1", value)
            value = re.sub(r"'''([^']+)'''", r"\1", value)
            value = re.sub(r"''([^']+)''", r"\1", value)
            
            if value:  # Only add non-empty values
                # Common card fields
                if key in ("effect", "action", "text", "description", "flavor", 
                          "lore", "pass", "fail", "test", "initial", "reckoning",
                          "cost", "toughness", "horror", "damage", "spawn",
                          "trait", "type", "expansion", "set"):
                    parsed["cardData"][key] = value
                parsed["infobox"][key] = value
    
    # Extract sections WITH their content
    section_pattern = r"(==+)\s*([^=]+)\s*\1\s*\n(.*?)(?=\n==|\Z)"
    for match in re.finditer(section_pattern, content, re.DOTALL):
        section_name = match.group(2).strip()
        section_content = match.group(3).strip()
        # Clean the section content
        section_content = re.sub(r"\[\[([^|\]]+)\|([^\]]+)\]\]", r"\2", section_content)
        section_content = re.sub(r"\[\[([^\]]+)\]\]", r"\1", section_content)
        section_content = re.sub(r"\{\{[^}]+\}\}", "", section_content)
        section_content = re.sub(r"<[^>]+>", "", section_content)
        if section_content:
            parsed["sections"][section_name] = section_content
    
    # Extract wiki links (excluding files and categories)
    for match in re.finditer(r"\[\[([^\]|]+)(?:\|[^\]]*)?]]", content):
        link = match.group(1).strip()
        if not link.startswith(("File:", "Category:", "Image:")):
            parsed["links"].append(link)
    
    # Extract template names
    for match in re.finditer(r"\{\{([^}|]+)", content):
        template = match.group(1).strip()
        if not template.startswith("#") and len(template) < 50:
            parsed["templates"].append(template)
    
    # Create FULL clean text version (no truncation!)
    clean = content
    clean = re.sub(r"\{\{[^}]+\}\}", "", clean)  # Remove templates
    clean = re.sub(r"\[\[File:[^\]]+\]\]", "", clean)  # Remove files
    clean = re.sub(r"\[\[Category:[^\]]+\]\]", "", clean)  # Remove categories
    clean = re.sub(r"\[\[([^|\]]+)\|([^\]]+)\]\]", r"\2", clean)  # [[link|text]] -> text
    clean = re.sub(r"\[\[([^\]]+)\]\]", r"\1", clean)  # [[link]] -> link
    clean = re.sub(r"'''([^']+)'''", r"\1", clean)  # Bold
    clean = re.sub(r"''([^']+)''", r"\1", clean)  # Italic
    clean = re.sub(r"==+\s*([^=]+)\s*==+", r"\n[\1]\n", clean)  # Headers -> [Header]
    clean = re.sub(r"<[^>]+>", "", clean)  # HTML tags
    clean = re.sub(r"\n{3,}", "\n\n", clean)  # Multiple newlines
    parsed["fullText"] = clean.strip()
    
    return parsed


def categorize_page(categories: list[str], title: str) -> str:
    """Determine the category for a page based on its wiki categories."""
    lower_cats = [c.lower() for c in categories]
    
    # Check in order of specificity
    if any("investigator" in c for c in lower_cats):
        return "investigators"
    if any("ancient one" in c for c in lower_cats):
        return "ancientOnes"
    if any("epic monster" in c for c in lower_cats):
        return "epicMonsters"
    if any("monster" in c for c in lower_cats):
        return "monsters"
    if any("unique asset" in c for c in lower_cats):
        return "uniqueAssets"
    if any("artifact" in c for c in lower_cats):
        return "artifacts"
    if any("spell" in c for c in lower_cats):
        return "spells"
    if any("condition" in c for c in lower_cats):
        return "conditions"
    if any("asset" in c for c in lower_cats):
        return "assets"
    if any("myster" in c for c in lower_cats):
        return "mysteries"
    if any("prelude" in c for c in lower_cats):
        return "preludes"
    if any("adventure" in c for c in lower_cats):
        return "adventures"
    if any("personal stor" in c for c in lower_cats):
        return "personalStories"
    if any("mythos" in c for c in lower_cats):
        return "mythos"
    
    # Encounter types
    if any("general encounter" in c for c in lower_cats):
        return "encounters.general"
    if any("location encounter" in c for c in lower_cats):
        return "encounters.location"
    if any("research encounter" in c for c in lower_cats):
        return "encounters.research"
    if any("other world" in c for c in lower_cats):
        return "encounters.otherWorld"
    if any("expedition" in c for c in lower_cats):
        return "encounters.expedition"
    if any("mystic ruins" in c for c in lower_cats):
        return "encounters.mysticRuins"
    if any("dream-quest" in c or "dreamquest" in c for c in lower_cats):
        return "encounters.dreamQuest"
    if any("devastation" in c for c in lower_cats):
        return "encounters.devastation"
    if any("special encounter" in c for c in lower_cats):
        return "encounters.special"
    if any("combat" in c for c in lower_cats):
        return "encounters.combat"
    if any("encounter" in c for c in lower_cats):
        return "encounters.other"
    
    # Game components
    if any("expansion" in c or "game set" in c for c in lower_cats):
        return "gameSets"
    if any("board" in c or "location" in c or "space" in c for c in lower_cats):
        return "gameBoards"
    if any("mechanic" in c or "rule" in c or "action" in c or "phase" in c for c in lower_cats):
        return "mechanics"
    
    return "other"


def main():
    print("=" * 50)
    print("🐙 THE NECRONOMICON COMPILER")
    print("   Eldritch Horror Wiki Scraper")
    print("=" * 50)
    print()
    
    # Initialize data structure
    data = {
        "metadata": {
            "source": BASE_URL,
            "scrapedAt": datetime.now().isoformat(),
            "version": "1.0",
            "totalPages": 0,
        },
        "categories": {
            "investigators": [],
            "ancientOnes": [],
            "monsters": [],
            "epicMonsters": [],
            "assets": [],
            "uniqueAssets": [],
            "artifacts": [],
            "spells": [],
            "conditions": [],
            "encounters": {
                "general": [],
                "location": [],
                "research": [],
                "otherWorld": [],
                "expedition": [],
                "mysticRuins": [],
                "dreamQuest": [],
                "devastation": [],
                "special": [],
                "combat": [],
                "other": [],
            },
            "mythos": [],
            "mysteries": [],
            "preludes": [],
            "adventures": [],
            "personalStories": [],
            "gameSets": [],
            "gameBoards": [],
            "mechanics": [],
            "other": [],
        },
        "allPages": {},
    }
    
    with httpx.Client(timeout=30.0) as client:
        # Step 1: Get all page titles
        pages = fetch_all_page_titles(client)
        
        # Step 2: Fetch and parse each page
        print()
        print("📖 Fetching page contents...")
        
        for i, page in enumerate(pages):
            title = page["title"]
            page_id = page["pageid"]
            
            print(f"   [{i+1}/{len(pages)}] {title[:50]}...", end="\r")
            
            try:
                # Fetch content
                page_data = fetch_page_content(client, title)
                
                # Parse content
                parsed = parse_wikitext(page_data["content"], title)
                
                # Create entry
                entry = {
                    "title": title,
                    "pageId": page_id,
                    "categories": page_data["categories"],
                    "infobox": parsed["infobox"],
                    "cardData": parsed["cardData"],  # Specific card fields (effect, test, pass, fail, etc)
                    "sections": parsed["sections"],  # Section name -> content
                    "links": parsed["links"],
                    "templates": parsed["templates"],
                    "fullText": parsed["fullText"],  # Complete cleaned text
                    "rawWikitext": page_data["content"],
                }
                
                # Categorize and add to appropriate list
                category = categorize_page(page_data["categories"], title)
                
                if "." in category:
                    parent, child = category.split(".")
                    data["categories"][parent][child].append(entry)
                else:
                    data["categories"][category].append(entry)
                
                # Also add to flat index
                data["allPages"][title] = entry
                
                time.sleep(DELAY_SECONDS)
                
            except Exception as e:
                print(f"\n⚠️  Error fetching {title}: {e}")
                continue
        
        print(f"\n✅ Processed {len(data['allPages'])} pages")
    
    # Add stats
    data["metadata"]["totalPages"] = len(data["allPages"])
    data["metadata"]["stats"] = {
        "investigators": len(data["categories"]["investigators"]),
        "ancientOnes": len(data["categories"]["ancientOnes"]),
        "monsters": len(data["categories"]["monsters"]),
        "epicMonsters": len(data["categories"]["epicMonsters"]),
        "assets": len(data["categories"]["assets"]),
        "uniqueAssets": len(data["categories"]["uniqueAssets"]),
        "artifacts": len(data["categories"]["artifacts"]),
        "spells": len(data["categories"]["spells"]),
        "conditions": len(data["categories"]["conditions"]),
        "totalEncounters": sum(len(v) for v in data["categories"]["encounters"].values()),
        "mythos": len(data["categories"]["mythos"]),
        "mysteries": len(data["categories"]["mysteries"]),
        "preludes": len(data["categories"]["preludes"]),
        "gameSets": len(data["categories"]["gameSets"]),
        "mechanics": len(data["categories"]["mechanics"]),
        "other": len(data["categories"]["other"]),
    }
    
    # Save to file
    output_path = Path("eldritch_horror_data.json")
    print()
    print(f"💾 Saving to {output_path}...")
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    file_size = output_path.stat().st_size / (1024 * 1024)
    print(f"✅ Done! File size: {file_size:.2f} MB")
    print()
    print("📊 Stats:")
    for key, value in data["metadata"]["stats"].items():
        print(f"   {key}: {value}")
    
    print()
    print("🐙 Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn!")


if __name__ == "__main__":
    main()