#!/usr/bin/env python3
"""
Extract detailed Ancient One data from eldritch_horror_data.json
and merge with ancient_ones_meta.json to create comprehensive context for AI.
"""

import json
import re
from pathlib import Path


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
    
    # Remove templates {{...}}
    text = re.sub(r'\{\{[^}]+\}\}', '', text)
    
    # Remove bold/italic markers
    text = re.sub(r"'''+", '', text)
    text = re.sub(r"''", '', text)
    
    # Remove table markup
    text = re.sub(r'\{\|[^}]*\|\}', '', text, flags=re.DOTALL)
    text = re.sub(r'\|-', '', text)
    text = re.sub(r'\|[^\n]*\n', '', text)
    
    # Remove section headers formatting
    text = re.sub(r'={2,}[^=]+=+', '', text)
    
    # Clean up whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    
    return text.strip()


def extract_mysteries(sections: dict, links: list) -> list:
    """Extract mystery names from the Mysteries section or links."""
    mysteries = []
    
    # Try to parse from Mysteries section
    mysteries_text = sections.get('Mysteries', '')
    if mysteries_text:
        # Look for mystery names in the table
        mystery_matches = re.findall(r'\|([A-Z][^|\n]+)\n\|', mysteries_text)
        mysteries.extend([m.strip() for m in mystery_matches if m.strip()])
    
    # Also check links for mystery-related items
    if not mysteries and links:
        mystery_keywords = ['Research', 'Encounter', 'Eldritch', 'Epic', 'Monster', 'Token']
        for link in links:
            if any(kw in link for kw in mystery_keywords) and 'file:' not in link.lower():
                mysteries.append(link)
    
    # Deduplicate while preserving order
    seen = set()
    unique = []
    for m in mysteries:
        if m not in seen:
            seen.add(m)
            unique.append(m)
    
    return unique[:10]  # Limit to 10


def extract_cultist_info(sections: dict) -> dict:
    """Extract cultist combat information."""
    cultist_text = sections.get('Cultists', '')
    return {
        'raw': strip_wiki_markup(cultist_text)[:500] if cultist_text else ''
    }


def extract_mythos_deck(infobox: dict) -> dict:
    """Extract mythos deck configuration."""
    return {
        'stage1': {
            'green': infobox.get('green1', ''),
            'yellow': infobox.get('yellow1', ''),
            'blue': infobox.get('blue1', '')
        },
        'stage2': {
            'green': infobox.get('green2', ''),
            'yellow': infobox.get('yellow2', ''),
            'blue': infobox.get('blue2', '')
        },
        'stage3': {
            'green': infobox.get('green3', ''),
            'yellow': infobox.get('yellow3', ''),
            'blue': infobox.get('blue3', '')
        }
    }


def get_title_section(sections: dict, title: str) -> str:
    """Get the thematic title section (e.g., 'The Daemon Sultan')."""
    # Ancient Ones often have a thematic title as their first section
    for key, value in sections.items():
        if key not in ['Gameplay', 'Setup', 'Cultists', 'Mysteries', 'Research Encounters', 
                       'Special Encounters', 'Awakening', 'Lore', 'References', 'Strategy',
                       'Appearance', 'Current Residence', 'Disposition', 'Antagonists', 'Source']:
            return strip_wiki_markup(value)[:1000]
    return ""


def extract_final_mystery(sections: dict) -> str:
    """Extract Final Mystery text from Awakening or Gameplay sections."""
    # Try awakening first for explicit "Final Mystery" section
    awakening_text = sections.get('Awakening', '')
    gameplay_text = sections.get('Gameplay', '')
    
    # Combine both to search
    combined = awakening_text + '\n' + gameplay_text
    
    # Look for explicit "Final Mystery" section (Epic Monster awakening)
    # Pattern: '''Final Mystery''' followed by content until the next section header
    match = re.search(r"'''Final Mystery'''(.+?)(?:\n'''[A-Z]|$)", combined, re.DOTALL | re.IGNORECASE)
    
    if match:
        final_mystery = match.group(1).strip()
        return strip_wiki_markup(final_mystery)[:1200]
    
    # Fallback: Extract victory condition from Gameplay section
    # Pattern: sentence containing "3 Mysteries" or "X Mysteries" and "win the game"
    victory_match = re.search(r"([^.]*?\d+\s+Mysteries[^.]*?win the game[^.]*\.)", gameplay_text, re.IGNORECASE)
    
    if victory_match:
        return strip_wiki_markup(victory_match.group(1).strip())[:1200]
    
    # Another pattern: "When X Mysteries have been solved, investigators win the game"
    simple_victory = re.search(r"When\s+\d+\s+Mysteries\s+have\s+been\s+solved[^.]*?win[^.]*\.", gameplay_text, re.IGNORECASE)
    
    if simple_victory:
        return strip_wiki_markup(simple_victory.group(0).strip())[:1200]
    
    return ""


def extract_ancient_one_detail(ao_data: dict) -> dict:
    """Extract all detailed information for an Ancient One."""
    sections = ao_data.get('sections', {})
    infobox = ao_data.get('infobox', {})
    links = ao_data.get('links', [])
    
    # Get awakening/defeat flavor text
    awakening_flavor = infobox.get('flavor', '')
    awakening_title = infobox.get('title', '')
    
    # Get lore - try multiple section names
    lore = sections.get('Lore', '')
    if not lore:
        # Some Ancient Ones have different section names for lore
        for key in ['Background', 'History', 'Origin']:
            if key in sections:
                lore = sections[key]
                break
    
    # Get thematic description (first section with the epithet like "The Daemon Sultan")
    thematic_title = ''
    thematic_description = ''
    for key, value in sections.items():
        if key not in ['Gameplay', 'Setup', 'Cultists', 'Mysteries', 'Research Encounters', 
                       'Special Encounters', 'Awakening', 'Lore', 'References', 'Strategy',
                       'Appearance', 'Current Residence', 'Disposition', 'Antagonists', 'Source',
                       'Mythos Deck']:
            thematic_title = key
            thematic_description = strip_wiki_markup(value)[:1500]
            break
    
    return {
        # Thematic info
        'epithet': thematic_title,
        'shortDescription': thematic_description,
        
        # Full lore
        'lore': strip_wiki_markup(lore)[:4000] if lore else '',
        
        # Gameplay mechanics
        'gameplayRules': strip_wiki_markup(sections.get('Gameplay', ''))[:2000],
        'setupInstructions': strip_wiki_markup(sections.get('Setup', ''))[:500],
        
        # Awakening/Defeat
        'awakeningTitle': awakening_title,
        'awakeningFlavor': strip_wiki_markup(awakening_flavor)[:1000],
        'awakeningEffects': strip_wiki_markup(sections.get('Awakening', ''))[:1000],
        'finalMystery': extract_final_mystery(sections),
        
        # Combat
        'cultistInfo': extract_cultist_info(sections),
        
        # Mysteries
        'mysteryNames': extract_mysteries(sections, links),
        
        # Research
        'researchEncounters': strip_wiki_markup(sections.get('Research Encounters', ''))[:500],
        
        # Mythos deck configuration
        'mythosDeck': extract_mythos_deck(infobox),
        
        # Additional lore sections (Cthulhu has these)
        'appearance': strip_wiki_markup(sections.get('Appearance', ''))[:500],
        'residence': strip_wiki_markup(sections.get('Current Residence', ''))[:500],
        'disposition': strip_wiki_markup(sections.get('Disposition', ''))[:200],
        'antagonists': strip_wiki_markup(sections.get('Antagonists', ''))[:300],
        'source': strip_wiki_markup(sections.get('Source', ''))[:200],
    }


def main():
    # Paths
    script_dir = Path(__file__).parent
    app_public = script_dir.parent / 'app' / 'public'
    
    data_file = app_public / 'eldritch_horror_data.json'
    meta_file = app_public / 'ancient_ones_meta.json'
    output_file = app_public / 'ancient_ones_detailed.json'
    
    print(f"Reading data from {data_file}...")
    with open(data_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"Reading meta from {meta_file}...")
    with open(meta_file, 'r', encoding='utf-8') as f:
        meta_list = json.load(f)
    
    # Convert meta list to dict keyed by primary title
    meta_dict = {}
    for entry in meta_list:
        for title in entry.get('titles', []):
            meta_dict[title] = entry
    
    # Extract Ancient Ones from main data
    ancient_ones = data.get('categories', {}).get('ancientOnes', [])
    print(f"Found {len(ancient_ones)} Ancient Ones in data")
    
    # Build detailed entries
    detailed_entries = []
    
    for ao in ancient_ones:
        title = ao.get('title', '')
        print(f"  Processing: {title}")
        
        # Get base meta
        meta = meta_dict.get(title, {})
        
        # Extract detailed info
        detail = extract_ancient_one_detail(ao)
        
        # Merge into comprehensive entry
        entry = {
            # Identity
            'name': title,
            'titles': meta.get('titles', [title]),
            'pageId': ao.get('pageId'),
            
            # Game setup (from meta)
            'difficulty': meta.get('difficulty', 'Medium'),
            'startingDoom': meta.get('startingDoom', 12),
            'mythosDeckSize': meta.get('mythosDeckSize', 16),
            'mysteries': meta.get('mysteries', '3/6'),
            'set': meta.get('set', 'Unknown'),
            'requiresSideBoard': meta.get('requiresSideBoard'),
            'notes': meta.get('notes', ''),
            
            # Detailed content (for AI context)
            **detail
        }
        
        detailed_entries.append(entry)
    
    # Sort by name
    detailed_entries.sort(key=lambda x: x['name'])
    
    # Write output
    print(f"\nWriting {len(detailed_entries)} entries to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(detailed_entries, f, indent=2, ensure_ascii=False)
    
    print("Done!")
    
    # Print sample entry
    if detailed_entries:
        sample = next((e for e in detailed_entries if e['name'] == 'Azathoth'), detailed_entries[0])
        print(f"\nSample entry ({sample['name']}):")
        print(f"  Epithet: {sample['epithet']}")
        print(f"  Lore length: {len(sample['lore'])} chars")
        print(f"  Mysteries: {sample['mysteryNames']}")
        print(f"  Awakening: {sample['awakeningTitle']}")


if __name__ == '__main__':
    main()

