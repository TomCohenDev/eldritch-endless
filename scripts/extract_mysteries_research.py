#!/usr/bin/env python3
"""
Extract Mystery descriptions and Research Encounter descriptions for each Ancient One.
Adds this data to ancient_ones_detailed.json for AI context generation.
"""

import json
import re
from pathlib import Path
from typing import Optional


def strip_wiki_markup(text: str) -> str:
    """Remove wiki markup from text."""
    if not text:
        return ""
    
    # Remove file/image references
    text = re.sub(r'\[\[File:[^\]]+\]\]', '', text)
    text = re.sub(r'\[\[file:[^\]]+\]\]', '', text)
    
    # Convert wiki links [[Link|Display]] to Display
    text = re.sub(r'\[\[([^|\]]+)\|([^\]]+)\]\]', r'\2', text)
    # Convert wiki links [[Link]] to Link
    text = re.sub(r'\[\[([^\]]+)\]\]', r'\1', text)
    
    # Remove templates {{...}} but try to preserve some content
    text = re.sub(r'\{\{Core Game\}\}', 'Core', text)
    text = re.sub(r'\{\{FL imagelink\}\}', 'Forsaken Lore', text)
    text = re.sub(r'\{\{TD imagelink\}\}', 'The Dreamlands', text)
    text = re.sub(r'\{\{MoM imagelink\}\}', 'Mountains of Madness', text)
    text = re.sub(r'\{\{SR imagelink\}\}', 'Strange Remnants', text)
    text = re.sub(r'\{\{UtP imagelink\}\}', 'Under the Pyramids', text)
    text = re.sub(r'\{\{CiR imagelink\}\}', 'Cities in Ruin', text)
    text = re.sub(r'\{\{SoC imagelink\}\}', 'Signs of Carcosa', text)
    text = re.sub(r'\{\{MoN imagelink\}\}', 'Masks of Nyarlathotep', text)
    
    # Skill checks
    text = re.sub(r'\{\{(Observation|Lore|Influence|Will|Strength)\}\}', r'(\1)', text)
    text = re.sub(r'\{\{(Observation|Lore|Influence|Will|Strength)\|[^}]*\}\}', r'(\1)', text)
    
    # Icons
    text = re.sub(r'\{\{Icon\|clue\}\}', 'Clue', text)
    text = re.sub(r'\{\{Icon\|et\}\}', 'Eldritch Token', text)
    text = re.sub(r'\{\{Icon\|sea\}\}', 'Sea', text)
    text = re.sub(r'\{\{Icon\|city\}\}', 'City', text)
    text = re.sub(r'\{\{Icon\|wilderness\}\}', 'Wilderness', text)
    text = re.sub(r'\{\{Icon\|[^}]*\}\}', '', text)
    
    # Health/Sanity
    text = re.sub(r'\{\{Health\|value=(\d+)\}\}', r'\1 Health', text)
    text = re.sub(r'\{\{Sanity\|value=(\d+)\}\}', r'\1 Sanity', text)
    text = re.sub(r'\{\{Health\}\}', 'Health', text)
    text = re.sub(r'\{\{Sanity\}\}', 'Sanity', text)
    
    # Generic template removal
    text = re.sub(r'\{\{[^}]+\}\}', '', text)
    
    # Remove table markup section headers
    text = re.sub(r'\[City Encounters\s*\]', '', text)
    text = re.sub(r'\[Wilderness Encounters\s*\]', '', text)
    text = re.sub(r'\[Sea Encounters\s*\]', '', text)
    text = re.sub(r'\[Special Encounters\s*\]', '', text)
    
    # Clean up whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    
    return text.strip()


def parse_encounter_table(raw_text: str, encounter_type: str) -> list[dict]:
    """Parse encounter table from raw wikitext."""
    encounters = []
    
    # Find the section for this encounter type
    section_pattern = rf'<section begin="{encounter_type} Encounters".*?<section end="{encounter_type} Encounters"'
    section_match = re.search(section_pattern, raw_text, re.DOTALL | re.IGNORECASE)
    
    if not section_match:
        # Try alternate pattern without section tags
        section_pattern = rf'{encounter_type} Encounters.*?\n\{{.*?\}}'
        section_match = re.search(section_pattern, raw_text, re.DOTALL | re.IGNORECASE)
    
    if not section_match:
        return encounters
    
    section_text = section_match.group(0)
    
    # Parse table rows: |ID\n|Set\n|Encounter text
    # Pattern: |-\n|number\n|expansion\n|text
    row_pattern = r'\|-\s*\n\|(\d+)\s*\n\|([^\n|]+)\n\|([^|]+?)(?=\n\|-|\n\|}'
    
    for match in re.finditer(row_pattern, section_text, re.DOTALL):
        enc_id = match.group(1).strip()
        expansion = strip_wiki_markup(match.group(2).strip())
        description = strip_wiki_markup(match.group(3).strip())
        
        if description:
            encounters.append({
                'id': enc_id,
                'expansion': expansion,
                'description': description[:1000]  # Limit length
            })
    
    return encounters


def parse_research_encounters_simple(full_text: str) -> dict:
    """Parse research encounters from fullText using simpler patterns."""
    result = {
        'city': [],
        'wilderness': [],
        'sea': []
    }
    
    if not full_text:
        return result
    
    # Split by encounter types - look for section headers
    sections_text = {
        'city': '',
        'wilderness': '',
        'sea': ''
    }
    
    # Find City Encounters section
    city_match = re.search(r'\[City Encounters\s*\](.*?)(?:\[Wilderness Encounters|\[Sea Encounters|$)', full_text, re.DOTALL | re.IGNORECASE)
    if city_match:
        sections_text['city'] = city_match.group(1)
    
    # Find Wilderness Encounters section
    wild_match = re.search(r'\[Wilderness Encounters\s*\](.*?)(?:\[Sea Encounters|$)', full_text, re.DOTALL | re.IGNORECASE)
    if wild_match:
        sections_text['wilderness'] = wild_match.group(1)
    
    # Find Sea Encounters section
    sea_match = re.search(r'\[Sea Encounters\s*\](.*?)(?:\[References|$)', full_text, re.DOTALL | re.IGNORECASE)
    if sea_match:
        sections_text['sea'] = sea_match.group(1)
    
    for enc_type, section in sections_text.items():
        if not section:
            continue
        
        # Split by row delimiter |-
        # Format is: |-\n|id\n|expansion\n|description text\n|-
        rows = section.split('|-')
        
        for row in rows:
            if not row.strip():
                continue
            
            # Split by | to get fields
            # Skip table header rows
            if '! scope' in row or 'ID #' in row:
                continue
            
            # Pattern: starts with newline, then |id\n|expansion\n|description
            lines = [l.strip() for l in row.split('\n') if l.strip() and l.strip().startswith('|')]
            
            if len(lines) >= 3:
                # First line is |id, second is |expansion, third+ is description
                enc_id = lines[0].lstrip('|').strip()
                if not enc_id.isdigit():
                    continue
                    
                expansion = lines[1].lstrip('|').strip()
                # Join remaining lines as description
                description = ' '.join(l.lstrip('|').strip() for l in lines[2:])
                
                # Clean up the description
                description = strip_wiki_markup(description)
                
                if description and len(description) > 20:
                    result[enc_type].append({
                        'id': enc_id,
                        'expansion': expansion if expansion else 'Core',
                        'description': description[:1500]
                    })
    
    return result


def extract_mystery_details(mystery_page: dict) -> Optional[dict]:
    """Extract mystery details from a mystery page."""
    infobox = mystery_page.get('infobox', {})
    full_text = mystery_page.get('fullText', '')
    raw_text = mystery_page.get('rawWikitext', '')
    
    # Get ancient one reference
    ancient_one = infobox.get('ancient one', '')
    if not ancient_one:
        return None
    
    # Clean ancient one name
    ancient_one = re.sub(r'\[\[|\]\]', '', ancient_one)
    
    # Extract from fullText or rawWikitext
    mystery_name = infobox.get('mystery name', mystery_page.get('title', ''))
    
    # Get mystery type
    mystery_type_match = re.search(r'Mystery Type\s*=\s*([^\n|]+)', raw_text)
    mystery_type = mystery_type_match.group(1).strip() if mystery_type_match else ''
    
    # Get flavor text
    flavor_match = re.search(r'Flavor Text\s*=\s*([^\n|]+)', raw_text)
    flavor_text = flavor_match.group(1).strip() if flavor_match else ''
    
    # Get mystery text (game effect)
    mystery_text_match = re.search(r'Mystery Text\s*=\s*(.+?)(?:\}\}|$)', raw_text, re.DOTALL)
    mystery_text = ''
    if mystery_text_match:
        mystery_text = mystery_text_match.group(1).strip()
        # Stop at first }} or category
        mystery_text = re.split(r'\}\}|\[\[Category', mystery_text)[0].strip()
    
    # Get requirements
    requires_clues = 'Yes' in (infobox.get('clue boolean', '') or '')
    requires_spells = 'Yes' in (infobox.get('spell boolean', '') or '')
    has_eldritch_tokens = 'Yes' in (infobox.get('et boolean', '') or '')
    requires_artifact = 'Yes' in (infobox.get('artifact boolean', '') or '')
    has_monster = 'Yes' in (infobox.get('monster boolean', '') or '')
    
    # Check fullText for requirement flags
    if 'Clue Boolean = Yes' in full_text:
        requires_clues = True
    if 'Spell Boolean = Yes' in full_text:
        requires_spells = True
    if 'ET Boolean = Yes' in full_text:
        has_eldritch_tokens = True
    if 'Artifact Boolean = Yes' in full_text:
        requires_artifact = True
    if 'Monster Boolean = Yes' in full_text:
        has_monster = True
    
    # Get expansion
    expansion = strip_wiki_markup(infobox.get('expansion', ''))
    
    return {
        'name': mystery_name,
        'ancientOne': ancient_one,
        'type': mystery_type,
        'expansion': expansion,
        'flavorText': strip_wiki_markup(flavor_text)[:500],
        'mysteryText': strip_wiki_markup(mystery_text)[:1000],
        'requiresClues': requires_clues,
        'requiresSpells': requires_spells,
        'hasEldritchTokens': has_eldritch_tokens,
        'requiresArtifact': requires_artifact,
        'hasMonster': has_monster,
    }


def main():
    # Paths
    script_dir = Path(__file__).parent
    app_public = script_dir.parent / 'app' / 'public'
    
    data_file = app_public / 'eldritch_horror_data.json'
    detailed_file = app_public / 'ancient_ones_detailed.json'
    output_file = app_public / 'ancient_ones_detailed.json'  # Same file, we'll update it
    
    print(f"Reading data from {data_file}...")
    with open(data_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"Reading existing detailed data from {detailed_file}...")
    with open(detailed_file, 'r', encoding='utf-8') as f:
        detailed_list = json.load(f)
    
    # Get all pages from categories - build title lookup
    categories = data.get('categories', {})
    all_pages = []
    for cat_name, pages in categories.items():
        if isinstance(pages, list):
            all_pages.extend(pages)
    
    print(f"Total pages across all categories: {len(all_pages)}")
    
    # Build title lookup
    pages_by_title = {page['title']: page for page in all_pages if page.get('title')}
    print(f"Pages by title: {len(pages_by_title)}")
    
    # Get mysteries from the mysteries category
    mystery_pages = categories.get('mysteries', [])
    print(f"Found {len(mystery_pages)} mystery pages in mysteries category")
    
    # Build mystery lookup by ancient one
    mysteries_by_ao: dict[str, list] = {}
    for page in mystery_pages:
        # Check for ancient one in infobox
        infobox = page.get('infobox', {})
        ancient_one = infobox.get('ancient one', '')
        if not ancient_one:
            # Skip pages without an ancient one reference
            continue
            
        details = extract_mystery_details(page)
        if details:
            ao_name = details['ancientOne']
            if ao_name not in mysteries_by_ao:
                mysteries_by_ao[ao_name] = []
            mysteries_by_ao[ao_name].append(details)
    
    print(f"Mysteries by Ancient One: {list(mysteries_by_ao.keys())}")
    
    # Get the research encounters from the categories.encounters section
    encounters = categories.get('encounters', {})
    research_encounter_pages = encounters.get('research', [])
    print(f"Found {len(research_encounter_pages)} research encounter pages in categories.encounters.research")
    
    # Build research encounters lookup by Ancient One name
    research_pages_by_ao = {}
    for page in research_encounter_pages:
        # Get AO name from infobox or title
        ao_name = page.get('infobox', {}).get('ao', '')
        if not ao_name:
            # Extract from title (e.g., "Cthulhu Research Encounters" -> "Cthulhu")
            title = page.get('title', '')
            ao_name = title.replace(' Research Encounters', '')
        if ao_name:
            research_pages_by_ao[ao_name] = page
    
    print(f"Found research encounter pages for: {list(research_pages_by_ao.keys())}")
    
    # Update each Ancient One with mysteries and research encounters
    for entry in detailed_list:
        ao_name = entry['name']
        print(f"\nProcessing: {ao_name}")
        
        # Find research encounters page
        research_page = research_pages_by_ao.get(ao_name, {})
        
        if research_page:
            print(f"  Found research encounters page")
            full_text = research_page.get('fullText', '')
            research_encounters = parse_research_encounters_simple(full_text)
            entry['researchEncounterDetails'] = research_encounters
            print(f"    City: {len(research_encounters['city'])} encounters")
            print(f"    Wilderness: {len(research_encounters['wilderness'])} encounters")
            print(f"    Sea: {len(research_encounters['sea'])} encounters")
        else:
            print(f"  No research encounters page found")
            entry['researchEncounterDetails'] = {'city': [], 'wilderness': [], 'sea': []}
        
        # Get mysteries for this Ancient One
        ao_mysteries = mysteries_by_ao.get(ao_name, [])
        entry['mysteryDetails'] = ao_mysteries
        print(f"  Found {len(ao_mysteries)} mysteries")
        for m in ao_mysteries:
            print(f"    - {m['name']} ({m['type']})")
    
    # Write updated output
    print(f"\nWriting updated data to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(detailed_list, f, indent=2, ensure_ascii=False)
    
    print("Done!")
    
    # Print sample
    sample = next((e for e in detailed_list if e['name'] == 'Cthulhu'), None)
    if sample:
        print(f"\n=== Sample: Cthulhu ===")
        print(f"Mysteries: {len(sample.get('mysteryDetails', []))}")
        for m in sample.get('mysteryDetails', [])[:3]:
            print(f"  - {m['name']}: {m['flavorText'][:100]}...")
        print(f"\nResearch Encounters:")
        enc = sample.get('researchEncounterDetails', {})
        if enc.get('city'):
            print(f"  City #1: {enc['city'][0]['description'][:150]}...")
        if enc.get('wilderness'):
            print(f"  Wilderness #1: {enc['wilderness'][0]['description'][:150]}...")
        if enc.get('sea'):
            print(f"  Sea #1: {enc['sea'][0]['description'][:150]}...")


if __name__ == '__main__':
    main()

