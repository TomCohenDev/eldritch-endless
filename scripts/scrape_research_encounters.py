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
Eldritch Horror Research Encounter Scraper
Scrapes Research Encounters from individual Ancient One pages.
Only fetches Core and Forsaken Lore encounters.
"""

import json
import re
import time
from pathlib import Path

import httpx
from bs4 import BeautifulSoup

DELAY_SECONDS = 1.0
OUTPUT_FILE = Path("scraped_encounters_filtered/research-encounter.json")

# Research Encounter URLs for Core and Forsaken Lore Ancient Ones only
RESEARCH_ENCOUNTER_URLS = {
    # Core (01)
    "Azathoth": "https://eldritchhorror.fandom.com/wiki/Azathoth_Research_Encounters",
    "Cthulhu": "https://eldritchhorror.fandom.com/wiki/Cthulhu_Research_Encounters",
    "Shub-Niggurath": "https://eldritchhorror.fandom.com/wiki/Shub-Niggurath_Research_Encounters",
    "Yog-Sothoth": "https://eldritchhorror.fandom.com/wiki/Yog-Sothoth_Research_Encounters",
    # Forsaken Lore (02)
    "Yig": "https://eldritchhorror.fandom.com/wiki/Yig_Research_Encounters",
    "Ithaqua": "https://eldritchhorror.fandom.com/wiki/Ithaqua_Research_Encounters",
}

# Set mapping for these Ancient Ones
ANCIENT_ONE_SETS = {
    "Azathoth": {"text": "01Core", "expansion": "Core"},
    "Cthulhu": {"text": "01Core", "expansion": "Core"},
    "Shub-Niggurath": {"text": "01Core", "expansion": "Core"},
    "Yog-Sothoth": {"text": "01Core", "expansion": "Core"},
    "Yig": {"text": "02Forsaken Lore", "expansion": "Forsaken Lore"},
    "Ithaqua": {"text": "02Forsaken Lore", "expansion": "Forsaken Lore"},
}


def clean_text(text: str) -> str:
    """Clean up extracted text."""
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    return text


def extract_table_data(table, section_name: str, ancient_one: str) -> list[dict]:
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
                if alt:  # Only keep if there's alt text (skill name)
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
        row_data["_section"] = section_name
        row_data["_ancient_one"] = ancient_one
        
        # Add set info from our mapping
        if "Set" not in row_data or not row_data.get("Set"):
            row_data["Set"] = ANCIENT_ONE_SETS[ancient_one]["text"]
        
        if any(v for v in row_data.values() if v):
            rows.append(row_data)
    
    return rows


def scrape_research_page(url: str, ancient_one: str, client: httpx.Client) -> dict:
    """Scrape a single Research Encounter page."""
    print(f"  [>] Fetching {ancient_one}...")
    
    response = client.get(url)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.text, "lxml")
    
    # Find the main content area
    content = soup.find("div", class_="mw-parser-output")
    if not content:
        content = soup
    
    # Extract sections and their tables
    encounters = {
        "City": [],
        "Wilderness": [],
        "Sea": [],
    }
    
    current_section = None
    
    for elem in content.find_all(["h2", "h3", "h4", "table"]):
        if elem.name in ["h2", "h3", "h4"]:
            heading = clean_text(elem.get_text()).replace("[edit]", "").replace("[]", "").strip()
            # Map heading to section
            if "city" in heading.lower():
                current_section = "City"
            elif "wilderness" in heading.lower():
                current_section = "Wilderness"
            elif "sea" in heading.lower():
                current_section = "Sea"
        
        elif elem.name == "table" and current_section:
            table_data = extract_table_data(elem, current_section, ancient_one)
            if table_data:
                encounters[current_section].extend(table_data)
    
    return {
        "ancient_one": ancient_one,
        "url": url,
        "set": ANCIENT_ONE_SETS[ancient_one],
        "encounters": encounters,
    }


def main():
    # Fix Windows console encoding
    import sys
    import io
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    print("=" * 60)
    print("[*] RESEARCH ENCOUNTER SCRAPER - Core & Forsaken Lore")
    print("=" * 60)
    print()
    
    # Ensure output directory exists
    OUTPUT_FILE.parent.mkdir(exist_ok=True)
    
    all_encounters = []
    research_data = {
        "City": {"tables": []},
        "Wilderness": {"tables": []},
        "Sea": {"tables": []},
    }
    ancient_one_data = {}
    
    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        for ancient_one, url in RESEARCH_ENCOUNTER_URLS.items():
            try:
                data = scrape_research_page(url, ancient_one, client)
                ancient_one_data[ancient_one] = data
                
                # Aggregate encounters by section
                for section, encounters in data["encounters"].items():
                    research_data[section]["tables"].extend(encounters)
                    all_encounters.extend(encounters)
                
                encounter_count = sum(len(e) for e in data["encounters"].values())
                print(f"      -> {encounter_count} encounters")
                
                time.sleep(DELAY_SECONDS)
                
            except Exception as e:
                print(f"  [ERROR] Error scraping {ancient_one}: {e}")
                import traceback
                traceback.print_exc()
    
    # Build final output structure
    output = {
        "url": "https://eldritchhorror.fandom.com/wiki/Research_Encounter",
        "title": "Research Encounter",
        "intro": "A Research Encounter is a type of Card that is used when playing Eldritch Horror. A player may choose to draw a Research Encounter if he is on a space with a Clue token during the Encounter Phase. Research Encounters are specific to the Ancient One that is in play during the game.",
        "categories": ["Cards", "Encounters"],
        "sections": {
            "City Encounters": research_data["City"],
            "Wilderness Encounters": research_data["Wilderness"],
            "Sea Encounters": research_data["Sea"],
        },
        "all_encounters": all_encounters,
        "ancient_ones": ancient_one_data,
    }
    
    # Save output
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    # Print summary
    print()
    print("=" * 60)
    print(f"[OK] Scraped {len(all_encounters)} research encounters!")
    print()
    for ancient_one, data in ancient_one_data.items():
        count = sum(len(e) for e in data["encounters"].values())
        set_name = ANCIENT_ONE_SETS[ancient_one]["expansion"]
        print(f"    {ancient_one} ({set_name}): {count} encounters")
    print()
    print(f"[+] Saved to: {OUTPUT_FILE.absolute()}")
    print("=" * 60)


if __name__ == "__main__":
    main()

