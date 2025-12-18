#!/usr/bin/env python3
"""
Extract detailed investigator data from eldritch_horror_data.json
Creates investigators_detailed.json with full context for AI plot generation
"""

import json
import re
from pathlib import Path

def strip_wiki_markup(text: str) -> str:
    """Remove wiki markup and clean text"""
    if not text:
        return ""
    # Remove wiki links [[text]] or [[link|text]]
    text = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]+)\]\]', r'\1', text)
    # Remove templates {{...}} but try to extract meaningful names
    text = re.sub(r'\{\{([A-Za-z]+)\s+imagelink[^}]*\}\}', r'\1', text)  # Handle imagelink templates
    text = re.sub(r'\{\{([A-Za-z ]+)\}\}', r'\1', text)  # Simple templates become their name
    text = re.sub(r'\{\{[^}]*\}\}', '', text)  # Remove remaining templates
    # Remove file references
    text = re.sub(r'\[\[File:[^\]]+\]\]', '', text)
    # Remove heading markers
    text = re.sub(r'={2,}([^=]+)={2,}', r'\1', text)
    # Remove bold/italic markers
    text = re.sub(r"'{2,}", '', text)
    # Remove Category markers
    text = re.sub(r'Category:[^\n]+', '', text)
    # Clean up extra whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    return text.strip()

def extract_skills_from_fulltext(fulltext: str) -> dict:
    """Extract skill values from fullText field"""
    skills = {
        'lore': 0,
        'influence': 0,
        'observation': 0,
        'strength': 0,
        'will': 0
    }
    
    for skill in skills.keys():
        match = re.search(rf'\|{skill}\s*=\s*(\d+)', fulltext, re.IGNORECASE)
        if match:
            skills[skill] = int(match.group(1))
    
    return skills

def extract_health_sanity(fulltext: str) -> tuple:
    """Extract health and sanity from fullText"""
    health = 0
    sanity = 0
    
    health_match = re.search(r'\|health\s*=\s*(\d+)', fulltext, re.IGNORECASE)
    if health_match:
        health = int(health_match.group(1))
    
    sanity_match = re.search(r'\|sanity\s*=\s*(\d+)', fulltext, re.IGNORECASE)
    if sanity_match:
        sanity = int(sanity_match.group(1))
    
    return health, sanity

def extract_starting_equipment(fulltext: str) -> list:
    """Extract starting equipment from fullText"""
    equipment = []
    
    # Look for startequip section
    match = re.search(r'\|startequip\s*=\s*(.+?)(?=\||$)', fulltext, re.DOTALL)
    if match:
        equip_text = match.group(1)
        # Parse items like "* 1 Arcane Manuscripts Asset\n* 1 Wither Spell"
        items = re.findall(r'\*\s*(\d+)\s+(.+?)(?:\n|\|)', equip_text)
        for count, item in items:
            equipment.append({'count': int(count), 'item': item.strip()})
    
    return equipment

def extract_defeated_encounters(rawwikitext: str, sections: dict, title: str, defeated_map: dict) -> dict:
    """Extract defeated encounters (loss of health/sanity text)"""
    encounters = {
        'lossOfHealth': '',
        'lossOfSanity': ''
    }
    
    # Check if we have a mapped entry from the Defeated page (most reliable)
    if title in defeated_map:
        encounters = defeated_map[title]
        # Clean up empty parens from icons e.g. "retreat () by 1"
        encounters['lossOfHealth'] = encounters['lossOfHealth'].replace('()', '').replace('  ', ' ')
        encounters['lossOfSanity'] = encounters['lossOfSanity'].replace('()', '').replace('  ', ' ')
        return encounters

    # Fallback to local parsing (often just template refs)
    # Try to get from Defeated Encounters section
    defeated_section = sections.get('Defeated Encounters', '')
    
    # Look for Defeated Health template content
    health_match = re.search(r'\{\{Defeated Health\|([^}]+)\}\}', rawwikitext, re.DOTALL)
    if health_match:
        content = health_match.group(1)
        # The content often has title=... and text=...
        text_match = re.search(r'text\s*=\s*(.+?)(?:\||$)', content, re.DOTALL)
        if text_match:
            encounters['lossOfHealth'] = strip_wiki_markup(text_match.group(1))
        else:
            encounters['lossOfHealth'] = strip_wiki_markup(content)
    
    # Look for Defeated Sanity template content
    sanity_match = re.search(r'\{\{Defeated Sanity\|([^}]+)\}\}', rawwikitext, re.DOTALL)
    if sanity_match:
        content = sanity_match.group(1)
        # The content often has title=... and text=...
        text_match = re.search(r'text\s*=\s*(.+?)(?:\||$)', content, re.DOTALL)
        if text_match:
            encounters['lossOfSanity'] = strip_wiki_markup(text_match.group(1))
        else:
            encounters['lossOfSanity'] = strip_wiki_markup(content)
            
    return encounters

def parse_defeated_table(data):
    """Parse the Defeated page table to get texts for all investigators"""
    defeated_page = data.get('allPages', {}).get('Defeated')
    if not defeated_page:
        return []
        
    content = defeated_page.get('sections', {}).get('Defeated Investigator Encounters', '')
    if not content:
        return []
        
    # Remove table markup
    content = re.sub(r'\{\|.*', '', content)
    content = re.sub(r'\|\}', '', content)
    
    rows = content.split('|-')
    parsed_rows = []
    
    for row in rows:
        row = row.strip()
        if not row: continue
        
        # Split cells by newline + pipe (standard wikitable)
        cells = re.split(r'\n\|', '\n' + row)
        # Filter empty first cell usually caused by the split
        cells = [c.strip() for c in cells if c.strip()]
        
        # We expect at least 2 cells (Health, Sanity). Sometimes 3 (Name, Health, Sanity)
        if len(cells) >= 2:
            health = strip_wiki_markup(cells[-2])
            sanity = strip_wiki_markup(cells[-1])
            parsed_rows.append({'health': health, 'sanity': sanity})
            
    return parsed_rows

def map_defeated_encounters(investigators, defeated_rows):
    """Map investigators to their defeated texts based on name matching"""
    mapping = {}
    
    for inv in investigators:
        title = inv.get('title', '')
        # Generate aliases to search for in the text
        aliases = [title]
        
        # Handle "Nickname" format
        nick_match = re.search(r'"([^"]+)"', title)
        if nick_match:
            aliases.append(nick_match.group(1))
            
        # First and Last names
        parts = title.replace('"', '').split()
        if len(parts) > 1:
            aliases.append(parts[0]) # First name
            aliases.append(parts[-1]) # Last name
            
        # Special cases
        if "Father Mateo" in title: aliases.append("Mateo")
        if "Sister Mary" in title: aliases.append("Mary")
        
        # Filter aliases
        aliases = [a for a in aliases if len(a) >= 3 and a not in ["The", "and"]]
        
        best_row = None
        best_score = 0
        
        for row in defeated_rows:
            score = 0
            combined_text = (row['health'] + " " + row['sanity'])
            
            for alias in aliases:
                # Simple check: alias appears in text
                if alias in combined_text:
                    score += len(alias) # Weigh longer matches higher
            
            if score > best_score:
                best_score = score
                best_row = row
        
        if best_row:
            mapping[title] = {
                'lossOfHealth': best_row['health'],
                'lossOfSanity': best_row['sanity']
            }
            # print(f"Matched {title} -> {best_row['health'][:30]}...")
            
    return mapping

def extract_quote(sections: dict) -> str:
    """Extract quote from sections"""
    flavor_section = sections.get('Flavor Text', '')
    
    # First try: Look for text inside double quotes (standard wiki format)
    # Allow single quotes inside (for contractions like Don't)
    quote_match = re.search(r'"([^"]{10,})"', flavor_section)
    if quote_match:
        return quote_match.group(1).strip()
        
    # Second try: Look for text inside italics ''...'' that isn't just metadata
    # (Sometimes quotes are just italicized without quote marks)
    italic_match = re.search(r"''([^']{15,})''", flavor_section)
    if italic_match:
        return italic_match.group(1).strip()
    
    # Fallback: Extract from section directly, removing header
    quote_section = flavor_section.replace('==== Quote ====', '').strip()
    # If the section is just the quote, return it
    if quote_section:
        return strip_wiki_markup(quote_section)[:500]
        
    return ""

def extract_abilities(sections: dict, profession: str) -> str:
    """Extract abilities from sections"""
    # Try direct Abilities section
    abilities = sections.get('Abilities', '')
    
    # Try profession-named section (e.g. "The Redeemed Cultist")
    if not abilities and profession:
        prof_section = sections.get(profession, '')
        if 'Abilities' in prof_section:
            abilities = prof_section
    
    return strip_wiki_markup(abilities)

def main():
    # Paths
    script_dir = Path(__file__).parent
    data_path = script_dir.parent / "app" / "public" / "eldritch_horror_data.json"
    output_path = script_dir.parent / "app" / "public" / "investigators_detailed.json"
    
    print(f"Loading data from {data_path}")
    
    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    investigators = data.get('categories', {}).get('investigators', [])
    print(f"Found {len(investigators)} investigators")
    
    # Parse defeated encounters table first
    defeated_rows = parse_defeated_table(data)
    defeated_map = map_defeated_encounters(investigators, defeated_rows)
    print(f"Mapped defeated texts for {len(defeated_map)} investigators")
    
    detailed_investigators = []
    
    for inv in investigators:
        title = inv.get('title', '')
        infobox = inv.get('infobox', {})
        sections = inv.get('sections', {})
        fulltext = inv.get('fullText', '')
        rawwikitext = inv.get('rawWikitext', '')
        
        # Extract profession/occupation
        profession = strip_wiki_markup(
            infobox.get('profession', '') or 
            infobox.get('occupation', '')
        )
        
        # Extract role
        role = strip_wiki_markup(infobox.get('role', ''))
        
        # Extract set/expansion and clean up template markup
        raw_set = infobox.get('set', '')
        # Handle {{Core Game}}, {{CiR imagelink}}, etc.
        set_match = re.search(r'\{\{([A-Za-z]+)', raw_set)
        if set_match:
            game_set = set_match.group(1)
            # Map abbreviations to full names
            set_map = {
                'CiR': 'Cities in Ruin',
                'MoN': 'Masks of Nyarlathotep',
                'TD': 'The Dreamlands',
                'SR': 'Strange Remnants',
                'FL': 'Forsaken Lore',
                'MoM': 'Mountains of Madness',
                'UtP': 'Under the Pyramids',
                'SoC': 'Signs of Carcosa',
                'Core': 'Core Game',
            }
            game_set = set_map.get(game_set, game_set)
        else:
            game_set = strip_wiki_markup(raw_set)
        
        # Extract skills
        skills = extract_skills_from_fulltext(fulltext)
        
        # Extract health/sanity
        health, sanity = extract_health_sanity(fulltext)
        
        # Extract starting equipment
        starting_equipment = extract_starting_equipment(fulltext)
        
        # Extract starting location - capture until newline or next |
        startloc_match = re.search(r'\|startloc\s*=\s*([^\n|]+)', fulltext)
        starting_location = strip_wiki_markup(startloc_match.group(1).strip()) if startloc_match else ''
        
        # Also try rawwikitext if fulltext didn't have it
        if not starting_location:
            startloc_match = re.search(r'\|startloc\s*=\s*([^\n|]+)', rawwikitext)
            starting_location = strip_wiki_markup(startloc_match.group(1).strip()) if startloc_match else ''
        
        # Extract personal story
        personal_story_match = re.search(r'\|personal_story\s*=\s*([^\n|]+)', fulltext)
        personal_story = strip_wiki_markup(personal_story_match.group(1).strip()) if personal_story_match else ''
        
        # Also try rawwikitext if fulltext didn't have it
        if not personal_story:
            personal_story_match = re.search(r'\|personal_story\s*=\s*([^\n|]+)', rawwikitext)
            personal_story = strip_wiki_markup(personal_story_match.group(1).strip()) if personal_story_match else ''
        
        # Extract quote
        quote = extract_quote(sections)
        
        # Extract biography
        biography = strip_wiki_markup(
            sections.get('Bio', '') or 
            sections.get('Biography', '')
        )
        
        # Extract abilities
        abilities = extract_abilities(sections, profession)
        
        # Extract team role
        team_role = strip_wiki_markup(sections.get('Team Role', ''))
        
        # Extract rulings
        rulings = strip_wiki_markup(
            sections.get('Rulings, clarifications, and reminders', '') or
            sections.get('Rulings, Clarifications, and Reminders', '') or
            sections.get('Rulings', '')
        )
        
        # Extract origin
        origin = strip_wiki_markup(sections.get('Origin', ''))
        
        # Extract defeated encounters
        defeated_encounters = extract_defeated_encounters(rawwikitext, sections, title, defeated_map)
        
        detailed_inv = {
            'name': title,
            'pageId': inv.get('pageId', 0),
            'profession': profession,
            'role': role,
            'set': game_set,
            'skills': skills,
            'health': health,
            'sanity': sanity,
            'startingLocation': starting_location,
            'startingEquipment': starting_equipment,
            'personalStory': personal_story,
            'quote': quote,
            'biography': biography,
            'abilities': abilities,
            'teamRole': team_role,
            'rulings': rulings,
            'origin': origin,
            'defeatedEncounters': defeated_encounters
        }
        
        detailed_investigators.append(detailed_inv)
        print(f"  Extracted: {title} ({profession}) - Role: {role}")
    
    # Save output
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(detailed_investigators, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved {len(detailed_investigators)} investigators to {output_path}")
    
    # Print sample
    if detailed_investigators:
        sample = detailed_investigators[0]
        print(f"\nSample - {sample['name']}:")
        print(f"  Profession: {sample['profession']}")
        print(f"  Role: {sample['role']}")
        print(f"  Skills: {sample['skills']}")
        print(f"  Health/Sanity: {sample['health']}/{sample['sanity']}")
        print(f"  Quote: {sample['quote'][:80]}..." if sample['quote'] else "  Quote: (none)")
        print(f"  Team Role: {sample['teamRole'][:80]}..." if sample['teamRole'] else "  Team Role: (none)")

if __name__ == "__main__":
    main()

