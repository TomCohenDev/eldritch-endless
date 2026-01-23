/**
 * Encounter Card Selection Service
 * Loads encounter JSON files and selects random cards based on encounter type and context
 */

interface EncounterCard {
  "ID #"?: string;
  Set?: any;
  Encounter: {
    text: string;
    links?: Array<{ text: string; href: string }>;
    images?: Array<any>;
  };
  _section?: string;
  _ancient_one?: string;
}

// Cache for loaded encounter data
const encounterDataCache: Map<string, any> = new Map();

/**
 * Load encounter data from public JSON files
 */
async function loadEncounterData(encounterType: string): Promise<any> {
  const cacheKey = encounterType;
  
  if (encounterDataCache.has(cacheKey)) {
    return encounterDataCache.get(cacheKey);
  }
  
  let fileName: string;
  switch (encounterType) {
    case 'general':
      fileName = 'general-encounter.json';
      break;
    case 'location':
      fileName = 'location-encounter.json';
      break;
    case 'research':
      fileName = 'research-encounters.json';
      break;
    case 'expedition':
      fileName = 'expedition-encounters.json';
      break;
    case 'other_world':
      fileName = 'other-world-encounters.json';
      break;
    case 'special':
      fileName = 'special-encounters.json';
      break;
    case 'combat':
      fileName = 'combat-encounter.json';
      break;
    case 'defeated':
      fileName = 'defeated.json';
      break;
    default:
      throw new Error(`Unknown encounter type: ${encounterType}`);
  }
  
  console.log(`[Encounter Selection] Loading ${fileName}...`);
  
  // Research encounters are in the root public folder, not in encounters/
  const filePath = encounterType === 'research' 
    ? `/${fileName}`
    : `/encounters/${fileName}`;
  
  const response = await fetch(filePath);
  
  if (!response.ok) {
    throw new Error(`Failed to load encounter data: ${response.statusText}`);
  }
  
  const data = await response.json();
  encounterDataCache.set(cacheKey, data);
  console.log(`[Encounter Selection] Loaded ${fileName} successfully`);
  
  return data;
}

/**
 * Select random cards from a pool
 */
function selectRandomCards(pool: EncounterCard[], count: number): EncounterCard[] {
  if (pool.length === 0) {
    return [];
  }
  
  if (pool.length <= count) {
    return [...pool];
  }
  
  const selected: EncounterCard[] = [];
  const indices = new Set<number>();
  
  while (indices.size < count) {
    indices.add(Math.floor(Math.random() * pool.length));
  }
  
  indices.forEach(index => selected.push(pool[index]));
  
  return selected;
}

export interface EncounterSelectionContext {
  encounterType: string;
  location?: string;
  spaceType?: 'City' | 'Wilderness' | 'Sea';
  otherWorld?: string;
  ancientOne?: string;
}

/**
 * Select encounter cards based on context
 * Returns 1-2 cards depending on encounter type
 */
export async function selectEncounterCards(
  context: EncounterSelectionContext
): Promise<{ cards: EncounterCard[]; metadata: any }> {
  console.log('[Encounter Selection] Selecting cards for:', context);
  
  const data = await loadEncounterData(context.encounterType);
  let pool: EncounterCard[] = [];
  let metadata: any = {
    title: data.title,
    intro: data.intro,
  };
  
  // Add relevant rules/effects to metadata
  if (data.combat_rules) metadata.combat_rules = data.combat_rules;
  if (data.effects_on_research_encounters) metadata.effects = data.effects_on_research_encounters;
  if (data.effects_on_other_world_encounters) metadata.effects = data.effects_on_other_world_encounters;
  if (data.effects_on_expeditions) metadata.effects = data.effects_on_expeditions;
  if (data.defeated_resolution_steps) metadata.defeated_rules = data.defeated_resolution_steps;
  if (data.other_rules) metadata.other_rules = data.other_rules;
  
  switch (context.encounterType) {
    case 'general': {
      // Pick 2 from the space type (City/Wilderness/Sea)
      const spaceKey = `${context.spaceType || 'City'} Encounters`;
      if (data.encounters?.[spaceKey]?.tables) {
        pool = data.encounters[spaceKey].tables;
      }
      console.log(`[Encounter Selection] General: ${spaceKey}, found ${pool.length} cards`);
      return { cards: selectRandomCards(pool, 2), metadata };
    }
    
    case 'location': {
      // Pick 1 from the current location
      // Location names in JSON might be shorter (e.g., "Arkham") than player location (e.g., "Arkham, Massachusetts")
      if (context.location) {
        // Try exact match first
        if (data.encounters?.[context.location]?.tables) {
          pool = data.encounters[context.location].tables;
          metadata.location_info = data.encounters[context.location].text || null;
        } else {
          // Try to find a match by extracting the first part of the location name
          // e.g., "Arkham, Massachusetts" -> "Arkham"
          const locationParts = context.location.split(',').map(part => part.trim());
          const shortLocationName = locationParts[0];
          
          if (data.encounters?.[shortLocationName]?.tables) {
            pool = data.encounters[shortLocationName].tables;
            metadata.location_info = data.encounters[shortLocationName].text || null;
            console.log(`[Encounter Selection] Matched location: "${shortLocationName}" (from "${context.location}")`);
          } else {
            // Try case-insensitive match
            const locationKeys = Object.keys(data.encounters || {});
            const matchedKey = locationKeys.find(key => 
              key.toLowerCase() === context.location.toLowerCase() ||
              key.toLowerCase() === shortLocationName.toLowerCase() ||
              context.location.toLowerCase().includes(key.toLowerCase()) ||
              key.toLowerCase().includes(shortLocationName.toLowerCase())
            );
            
            if (matchedKey && data.encounters[matchedKey]?.tables) {
              pool = data.encounters[matchedKey].tables;
              metadata.location_info = data.encounters[matchedKey].text || null;
              console.log(`[Encounter Selection] Matched location: "${matchedKey}" (from "${context.location}")`);
            }
          }
        }
      }
      
      if (pool.length === 0) {
        console.warn(`[Encounter Selection] No cards found for location: "${context.location}"`);
        console.log(`[Encounter Selection] Available locations:`, Object.keys(data.encounters || {}).slice(0, 10));
      }
      
      console.log(`[Encounter Selection] Location: ${context.location}, found ${pool.length} cards`);
      return { cards: selectRandomCards(pool, 1), metadata };
    }
    
    case 'research': {
      // Pick 2 from City/Wilderness/Sea based on investigator's space type
      const ancientOneName = context.ancientOne;
      if (ancientOneName && data.ancient_ones?.[ancientOneName]?.encounters?.[context.spaceType || 'City']) {
        pool = data.ancient_ones[ancientOneName].encounters[context.spaceType || 'City'];
        metadata.ancient_one_info = {
          name: ancientOneName,
          set: data.ancient_ones[ancientOneName].set,
          thematicSummary: data.ancient_ones[ancientOneName].thematicSummary,
        };
      }
      console.log(`[Encounter Selection] Research: ${ancientOneName} / ${context.spaceType}, found ${pool.length} cards`);
      return { cards: selectRandomCards(pool, 2), metadata };
    }
    
    case 'expedition': {
      // Pick the one on the current space (expeditions are location-specific)
      if (context.location && data.encounters?.[context.location]?.tables) {
        pool = data.encounters[context.location].tables;
      }
      console.log(`[Encounter Selection] Expedition: ${context.location}, found ${pool.length} cards`);
      return { cards: selectRandomCards(pool, 1), metadata };
    }
    
    case 'other_world': {
      // Pick 1 at random from the specific other world
      // The otherWorld should be the name like "The Underworld", "The Abyss", etc.
      if (context.otherWorld) {
        // Clean the other world name - remove "(Other World)" suffix and trim
        const cleanOtherWorld = context.otherWorld
          .replace(/\s*\(Other World\)\s*$/i, '')
          .trim();
        
        const otherWorldKeys = Object.keys(data.encounters || {});
        
        // Try exact match first (cleaned name)
        if (data.encounters?.[cleanOtherWorld]?.tables) {
          pool = data.encounters[cleanOtherWorld].tables;
        } else if (data.encounters?.[context.otherWorld]?.tables) {
          // Try original name as fallback
          pool = data.encounters[context.otherWorld].tables;
        } else {
          // Try case-insensitive match with cleaned name
          const matchedKey = otherWorldKeys.find(key => 
            key.toLowerCase() === cleanOtherWorld.toLowerCase() ||
            key.toLowerCase() === context.otherWorld!.toLowerCase() ||
            cleanOtherWorld.toLowerCase().includes(key.toLowerCase()) ||
            key.toLowerCase().includes(cleanOtherWorld.toLowerCase())
          );
          if (matchedKey && data.encounters[matchedKey]?.tables) {
            pool = data.encounters[matchedKey].tables;
            console.log(`[Encounter Selection] Matched other world: "${matchedKey}" (requested: "${context.otherWorld}", cleaned: "${cleanOtherWorld}")`);
          }
        }
        
        // If still no match, use a random other world as fallback
        if (pool.length === 0 && otherWorldKeys.length > 0) {
          const randomKey = otherWorldKeys[Math.floor(Math.random() * otherWorldKeys.length)];
          if (data.encounters[randomKey]?.tables) {
            pool = data.encounters[randomKey].tables;
            console.warn(`[Encounter Selection] Other world "${context.otherWorld}" not found, using random fallback: "${randomKey}"`);
          }
        }
      }
      
      if (pool.length === 0) {
        console.warn(`[Encounter Selection] No cards found for other world: "${context.otherWorld}"`);
        console.log(`[Encounter Selection] Available other worlds:`, Object.keys(data.encounters || {}));
      }
      
      console.log(`[Encounter Selection] Other World: ${context.otherWorld}, found ${pool.length} cards`);
      return { cards: selectRandomCards(pool, 1), metadata };
    }
    
    case 'special': {
      // Pick from encounters related to the ancient one
      if (context.ancientOne && data.encounters) {
        for (const [key, val] of Object.entries(data.encounters)) {
          const encounterData = val as any;
          if (encounterData.text && encounterData.text.toLowerCase().includes(context.ancientOne.toLowerCase())) {
            if (encounterData.tables) {
              pool.push(...encounterData.tables);
            }
          }
        }
      }
      console.log(`[Encounter Selection] Special: ${context.ancientOne}, found ${pool.length} cards`);
      return { cards: selectRandomCards(pool, 2), metadata };
    }
    
    case 'combat':
    case 'defeated': {
      // These are rule references, not card-based
      console.log(`[Encounter Selection] ${context.encounterType}: Rules only, no cards`);
      return {
        cards: [],
        metadata: {
          ...metadata,
          rules_only: true,
        },
      };
    }
    
    default:
      console.warn(`[Encounter Selection] Unknown encounter type: ${context.encounterType}`);
      return { cards: [], metadata };
  }
}


