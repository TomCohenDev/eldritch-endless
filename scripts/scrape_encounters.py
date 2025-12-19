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
Eldritch Horror Encounter Wiki Scraper
Scrapes specific wiki pages and saves each to its own JSON file.
"""

import json
import re
import time
from pathlib import Path
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

DELAY_SECONDS = 1.0  # Be nice to the server
OUTPUT_DIR = Path("scraped_encounters")

# Target URLs to scrape
URLS = [
    "https://eldritchhorror.fandom.com/wiki/General_Encounter",
    "https://eldritchhorror.fandom.com/wiki/Combat_Encounter",
    "https://eldritchhorror.fandom.com/wiki/Location_Encounter",
    "https://eldritchhorror.fandom.com/wiki/Research_Encounter",
    "https://eldritchhorror.fandom.com/wiki/Other_World_Encounters",
    "https://eldritchhorror.fandom.com/wiki/Expedition_Encounters",
    "https://eldritchhorror.fandom.com/wiki/Special_Encounters",
    "https://eldritchhorror.fandom.com/wiki/Defeated",
]


def get_page_name(url: str) -> str:
    """Extract page name from URL for filename."""
    parsed = urlparse(url)
    page = parsed.path.split("/wiki/")[-1]
    return page.replace("_", "-").lower()


def clean_text(text: str) -> str:
    """Clean up extracted text."""
    if not text:
        return ""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove leading/trailing whitespace
    text = text.strip()
    return text


def extract_table_data(table, section_name: str = "") -> list[dict]:
    """Extract data from an HTML table."""
    rows = []
    headers = []
    
    # Get headers from th elements
    header_row = table.find("tr")
    if header_row:
        for th in header_row.find_all(["th", "td"]):
            headers.append(clean_text(th.get_text()))
    
    # If no headers found in first row, try thead
    thead = table.find("thead")
    if thead and not headers:
        for th in thead.find_all("th"):
            headers.append(clean_text(th.get_text()))
    
    # Extract data rows
    tbody = table.find("tbody") or table
    for tr in tbody.find_all("tr")[1:]:  # Skip header row
        cells = tr.find_all(["td", "th"])
        if not cells:
            continue
        
        row_data = {}
        for i, cell in enumerate(cells):
            # Get header name or use index
            key = headers[i] if i < len(headers) else f"column_{i}"
            
            # Extract text and links
            text = clean_text(cell.get_text())
            links = []
            for a in cell.find_all("a"):
                href = a.get("href", "")
                link_text = clean_text(a.get_text())
                if href and link_text:
                    links.append({"text": link_text, "href": href})
            
            # Extract images
            images = []
            for img in cell.find_all("img"):
                alt = img.get("alt", "")
                src = img.get("src", "")
                if src:
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
        
        if section_name:
            row_data["_section"] = section_name
        
        if any(v for v in row_data.values() if v):
            rows.append(row_data)
    
    return rows


def extract_lists(soup, section_name: str = "") -> list[dict]:
    """Extract data from lists (ul/ol)."""
    items = []
    for ul in soup.find_all(["ul", "ol"]):
        for li in ul.find_all("li", recursive=False):
            text = clean_text(li.get_text())
            links = []
            for a in li.find_all("a"):
                href = a.get("href", "")
                link_text = clean_text(a.get_text())
                if href and link_text:
                    links.append({"text": link_text, "href": href})
            
            item = {"text": text}
            if links:
                item["links"] = links
            if section_name:
                item["_section"] = section_name
            items.append(item)
    return items


def scrape_page(url: str, client: httpx.Client) -> dict:
    """Scrape a single wiki page and extract all structured data."""
    print(f"  [>] Fetching {url}...")
    
    response = client.get(url)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.text, "lxml")
    
    # Find the main content area
    content = soup.find("div", class_="mw-parser-output")
    if not content:
        content = soup.find("div", id="mw-content-text")
    if not content:
        content = soup
    
    # Extract page title
    title_elem = soup.find("h1", class_="page-header__title")
    if not title_elem:
        title_elem = soup.find("h1", id="firstHeading")
    title = clean_text(title_elem.get_text()) if title_elem else get_page_name(url)
    
    # Extract intro paragraph (text before first heading)
    intro = ""
    for elem in content.children:
        if hasattr(elem, 'name'):
            if elem.name in ["h2", "h3", "table"]:
                break
            if elem.name == "p":
                intro += clean_text(elem.get_text()) + " "
    intro = intro.strip()
    
    # Extract sections and their content
    sections = {}
    current_section = "_intro"
    current_content = {"text": intro, "tables": [], "lists": []}
    
    for elem in content.find_all(["h2", "h3", "h4", "table", "ul", "ol", "p"]):
        if elem.name in ["h2", "h3", "h4"]:
            # Save previous section if it has content
            if current_section and (current_content["tables"] or current_content["lists"] or current_content.get("text")):
                sections[current_section] = current_content
            
            # Start new section
            current_section = clean_text(elem.get_text()).replace("[edit]", "").replace("[]", "").strip()
            current_content = {"text": "", "tables": [], "lists": []}
        
        elif elem.name == "table":
            table_data = extract_table_data(elem, current_section)
            if table_data:
                current_content["tables"].extend(table_data)
        
        elif elem.name in ["ul", "ol"]:
            # Check if this list is part of a table (skip if so)
            if not elem.find_parent("table"):
                list_data = extract_lists(elem, current_section)
                if list_data:
                    current_content["lists"].extend(list_data)
        
        elif elem.name == "p":
            text = clean_text(elem.get_text())
            if text:
                if current_content["text"]:
                    current_content["text"] += " " + text
                else:
                    current_content["text"] = text
    
    # Save last section
    if current_section and (current_content["tables"] or current_content["lists"] or current_content.get("text")):
        sections[current_section] = current_content
    
    # Flatten all tables and lists for easier access
    all_tables = []
    all_lists = []
    for section_name, section_data in sections.items():
        all_tables.extend(section_data.get("tables", []))
        all_lists.extend(section_data.get("lists", []))
    
    # Clean up sections (remove empty text fields)
    for section_name in sections:
        if not sections[section_name].get("text"):
            sections[section_name].pop("text", None)
        if not sections[section_name].get("tables"):
            sections[section_name].pop("tables", None)
        if not sections[section_name].get("lists"):
            sections[section_name].pop("lists", None)
    
    # Remove empty sections
    sections = {k: v for k, v in sections.items() if v}
    
    # Extract categories
    categories = []
    cat_links = soup.find("div", class_="page-header__categories")
    if cat_links:
        for a in cat_links.find_all("a"):
            cat = clean_text(a.get_text())
            if cat and cat not in ["Categories"]:
                categories.append(cat)
    
    return {
        "url": url,
        "title": title,
        "intro": intro if intro else None,
        "categories": categories if categories else None,
        "sections": sections if sections else None,
        "all_encounters": all_tables if all_tables else None,
        "all_list_items": all_lists if all_lists else None,
    }


def main():
    # Fix Windows console encoding
    import sys
    import io
    if sys.platform == "win32":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    print("=" * 60)
    print("[*] ELDRITCH HORROR WIKI ENCOUNTER SCRAPER")
    print("=" * 60)
    print()
    
    # Create output directory
    OUTPUT_DIR.mkdir(exist_ok=True)
    print(f"[+] Output directory: {OUTPUT_DIR.absolute()}")
    print()
    
    results = {}
    
    with httpx.Client(timeout=30.0, follow_redirects=True) as client:
        for url in URLS:
            try:
                data = scrape_page(url, client)
                page_name = get_page_name(url)
                
                # Save to individual JSON file
                output_file = OUTPUT_DIR / f"{page_name}.json"
                with open(output_file, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                
                # Count encounters
                encounter_count = len(data.get("all_encounters", []) or [])
                list_count = len(data.get("all_list_items", []) or [])
                section_count = len(data.get("sections", {}) or {})
                
                print(f"  [OK] {data['title']}")
                print(f"       -> {encounter_count} table rows, {list_count} list items, {section_count} sections")
                print(f"       -> Saved to: {output_file.name}")
                
                results[page_name] = {
                    "file": output_file.name,
                    "title": data["title"],
                    "encounter_count": encounter_count,
                    "list_count": list_count,
                    "section_count": section_count,
                }
                
                time.sleep(DELAY_SECONDS)
                
            except Exception as e:
                print(f"  [ERROR] Error scraping {url}: {e}")
                import traceback
                traceback.print_exc()
    
    # Save summary
    summary_file = OUTPUT_DIR / "_summary.json"
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump({
            "scraped_at": __import__("datetime").datetime.now().isoformat(),
            "total_pages": len(results),
            "pages": results,
        }, f, indent=2, ensure_ascii=False)
    
    print()
    print("=" * 60)
    print(f"[OK] Scraped {len(results)} pages successfully!")
    print(f"[+] Files saved to: {OUTPUT_DIR.absolute()}")
    print("=" * 60)


if __name__ == "__main__":
    main()

