#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "httpx",
#     "beautifulsoup4",
#     "lxml",
# ]
# ///
"""
Eldritch Horror Other World Encounter Scraper
Scrapes Other World Encounters and filters to Core and Forsaken Lore only.
"""

import json
import re
import time
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

DELAY_SECONDS = 1.0
OUTPUT_FILE = Path("scraped_encounters_filtered/other-world-encounters.json")

# Other World Encounter URLs
OTHER_WORLD_URLS = [
    "https://eldritchhorror.fandom.com/wiki/The_Underworld_(Other_World)",
    "https://eldritchhorror.fandom.com/wiki/The_Abyss",
    "https://eldritchhorror.fandom.com/wiki/City_of_the_Great_Race",
    "https://eldritchhorror.fandom.com/wiki/Great_Hall_of_Celaeno",
    "https://eldritchhorror.fandom.com/wiki/Plateau_of_Leng",
    "https://eldritchhorror.fandom.com/wiki/The_Future",
    "https://eldritchhorror.fandom.com/wiki/Lost_Carcosa",
    "https://eldritchhorror.fandom.com/wiki/Yuggoth",
    "https://eldritchhorror.fandom.com/wiki/The_Past",
    "https://eldritchhorror.fandom.com/wiki/The_Dreamlands_(Other_World)",
]

# Allowed expansion sets (Core and Forsaken Lore only)
ALLOWED_SETS = ["01", "02", "core", "forsaken lore"]


def clean_text(text: str) -> str:
    """Clean up extracted text."""
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    return text


def is_allowed_set(set_value) -> bool:
    """Check if the set value matches Core or Forsaken Lore."""
    if set_value is None:
        return False
    
    # Handle both string and dict formats
    if isinstance(set_value, dict):
        text = set_value.get("text", "")
    else:
        text = str(set_value)
    
    # Normalize and check
    text_lower = text.lower().strip()
    
    # Check for Core
    if "01" in text_lower or (re.search(r'(^|\s)core(\s|$)', text_lower) and "forsaken" not in text_lower):
        return True
    
    # Check for Forsaken Lore
    if "02" in text_lower or ("forsaken" in text_lower and "lore" in text_lower):
        return True
    
    return False


def extract_table_data(table, location_name: str) -> list[dict]:
    """Extract data from an HTML table."""
    rows = []
    headers = []
    
    # Get headers from th elements
    header_row = table.find("tr")
    if header_row:
        for th in header_row.find_all(["th", "td"]):
            headers.append(clean_text(th.get_text()))
    
    # Extract data rows
    tbody = table.find("tbody") or table
    for tr in tbody.find_all("tr")[1:]:  # Skip header row
        cells = tr.find_all(["td", "th"])
        if not cells:
            continue
        
        row_data = {}
        for i, cell in enumerate(cells):
            key = headers[i] if i < len(headers) else f"column_{i}"
            
            # Extract text and links
            text = clean_text(cell.get_text())
            links = []
            for a in cell.find_all("a"):
                href = a.get("href", "")
                link_text = clean_text(a.get_text())
                if href and link_text:
                    links.append({"text": link_text, "href": href})
            
            # Extract images (for skill icons)
            images = []
            for img in cell.find_all("img"):
                alt = img.get("alt", "")
                src = img.get("src", "")
                if alt:  # Only keep if there's alt text
                    images.append({"alt": alt, "src": src})
            
            row_data[key] = {
                "text": text,
                "links": links if links else None,
                "images": images if images else None,
            }
            
            # Clean up None values
            row_data[key] = {k: v for k, v in row_data[key].items() if v is not None}
            
            # Simplify if only text
            if list(row_data[key].keys()) == ["text"]:
                row_data[key] = text
        
        # Add metadata
        row_data["_location"] = location_name
        
        if any(v for v in row_data.values() if v):
            rows.append(row_data)
    
    return rows


def scrape_other_world_page(url: str, client: httpx.Client) -> dict:
    """Scrape a single Other World Encounter page."""
    # Extract location name from URL
    location_name = url.split("/wiki/")[-1].replace("_(Other_World)", "").replace("_", " ")
    
    print(f"  [>] Fetching {location_name}...")
    
    response = client.get(url)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.text, "lxml")
    
    # Find the main content area
    content = soup.find("div", class_="mw-parser-output")
    if not content:
        content = soup
    
    # Extract intro/description
    intro = ""
    for elem in content.children:
        if hasattr(elem, 'name'):
            if elem.name in ["h2", "table"]:
                break
            if elem.name == "p":
                intro += clean_text(elem.get_text()) + " "
    intro = intro.strip()
    
    # Find Encounter Details table
    encounters = []
    for table in content.find_all("table"):
        # Check if this is an encounter details table
        header_text = ""
        header_row = table.find("tr")
        if header_row:
            header_text = clean_text(header_row.get_text()).lower()
        
        # Look for tables with encounter-related headers
        if any(keyword in header_text for keyword in ["id", "set", "initial", "pass", "fail", "encounter"]):
            table_data = extract_table_data(table, location_name)
            encounters.extend(table_data)
    
    return {
        "location": location_name,
        "url": url,
        "intro": intro if intro else None,
        "encounters": encounters,
    }


def main():
    # Fix Windows console encoding
    import sys
    import io
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    print("=" * 60)
    print("[*] OTHER WORLD ENCOUNTER SCRAPER - Core & Forsaken Lore")
    print("=" * 60)
    print()
    
    # Ensure output directory exists
    OUTPUT_FILE.parent.mkdir(exist_ok=True)
    
    all_encounters = []
    location_data = {}
    
    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        for url in OTHER_WORLD_URLS:
            try:
                data = scrape_other_world_page(url, client)
                
                # Filter encounters to only Core and Forsaken Lore
                original_count = len(data["encounters"])
                filtered_encounters = [
                    enc for enc in data["encounters"]
                    if is_allowed_set(enc.get("Set"))
                ]
                
                if filtered_encounters:
                    data["encounters"] = filtered_encounters
                    location_data[data["location"]] = data
                    all_encounters.extend(filtered_encounters)
                    
                    print(f"      -> {len(filtered_encounters)} encounters (filtered from {original_count})")
                else:
                    print(f"      -> 0 encounters after filtering (had {original_count})")
                
                time.sleep(DELAY_SECONDS)
                
            except Exception as e:
                print(f"  [ERROR] Error scraping {url}: {e}")
                import traceback
                traceback.print_exc()
    
    # Build final output structure
    output = {
        "url": "https://eldritchhorror.fandom.com/wiki/Other_World_Encounters",
        "title": "Other World Encounters",
        "intro": "Other World Encounters occur when an investigator enters a gate during the Encounter Phase. These encounters represent different otherworldly locations from the Cthulhu Mythos.",
        "categories": ["Cards", "Encounters"],
        "sections": {
            location: {
                "text": data.get("intro"),
                "tables": data["encounters"]
            }
            for location, data in location_data.items()
        },
        "all_encounters": all_encounters,
        "locations": location_data,
    }
    
    # Clean up None values in sections
    for section_name in list(output["sections"].keys()):
        section = output["sections"][section_name]
        if not section.get("text"):
            section.pop("text", None)
        if not section.get("tables"):
            del output["sections"][section_name]
    
    # Save output
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    # Print summary
    print()
    print("=" * 60)
    print(f"[OK] Scraped {len(all_encounters)} other world encounters!")
    print()
    for location, data in location_data.items():
        print(f"    {location}: {len(data['encounters'])} encounters")
    print()
    print(f"[+] Saved to: {OUTPUT_FILE.absolute()}")
    print("=" * 60)


if __name__ == "__main__":
    main()




