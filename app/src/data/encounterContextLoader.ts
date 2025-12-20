/**
 * Encounter Context Loader
 * Provides typed access to encounter rules and location data
 */

import encounterContext from './encounter-context.json';

// Type definitions for the context structure
export interface LocationTypeContext {
  description: string;
  icon: string;
  atmosphere: string;
  commonSkills: string[];
  commonThemes: string[];
  typicalPassOutcomes: string[];
  typicalFailOutcomes: string[];
}

export interface EncounterTypeContext {
  description: string;
  complexity: 'simple' | 'complex';
  trigger: string;
  commonOutcomes?: {
    victory?: string[];
    defeat?: string[];
  };
  [key: string]: unknown;
}

export interface EncounterComplexityInfo {
  description: string;
  structure: string | object;
  types: string[];
}

// The full context type
export interface EncounterContext {
  description: string;
  encounterPhaseRules: {
    description: string;
    encounterOrder: {
      description: string;
      precedence: Array<{ priority: number; type: string; rule: string }>;
      specialRules: string[];
    };
  };
  encounterComplexity: {
    regular: EncounterComplexityInfo;
    complex: EncounterComplexityInfo;
  };
  encounterTypes: Record<string, EncounterTypeContext>;
  locationTypes: Record<string, LocationTypeContext>;
  worldMapLocations: {
    namedCities: Record<string, { space: number; type: string; region: string; action?: string }>;
    seaSpaces: Record<string, { type: string; region: string; note?: string }>;
    wildernessSpaces: Record<string, { type: string; region: string; name?: string }>;
    sideBoards: Record<string, { spaces: string[]; encounterTypes: string[]; specialRules?: string }>;
  };
  skills: Record<string, { description: string; commonUsesInEncounters: string[]; relatedEncounterTypes: string[] }>;
  conditions: {
    physical: string[];
    mental: string[];
    situational: string[];
    positive: string[];
  };
  outcomeEffects: Record<string, unknown>;
  difficultyScaling: {
    tensionToDifficulty: Record<string, { difficulty: string; meaning: string }>;
    testModifiers: { description: string; examples: string[] };
  };
}

// Export the full context (typed)
export const fullEncounterContext = encounterContext as unknown as EncounterContext;

/**
 * Get context relevant to a specific location
 */
export function getLocationContext(locationName: string): {
  locationType: 'city' | 'sea' | 'wilderness' | 'unknown';
  locationTypeContext: LocationTypeContext | null;
  locationSignificance: string | null;
} {
  const loc = locationName.toLowerCase();
  const { namedCities, seaSpaces, wildernessSpaces } = fullEncounterContext.worldMapLocations;
  
  // Check named cities
  for (const [cityName, cityData] of Object.entries(namedCities)) {
    if (loc.includes(cityName.toLowerCase()) || loc.includes(`space ${cityData.space}`)) {
      return {
        locationType: cityData.type as 'city' | 'sea' | 'wilderness',
        locationTypeContext: fullEncounterContext.locationTypes[cityData.type] || null,
        locationSignificance: `${cityName} - ${cityData.region}${cityData.action ? ` (Action: ${cityData.action})` : ''}`,
      };
    }
  }
  
  // Check sea spaces
  for (const [spaceId, spaceData] of Object.entries(seaSpaces)) {
    if (loc.includes(spaceId.replace('space', 'space ')) || loc.includes('sea') || loc.includes('ocean') || loc.includes('pacific') || loc.includes('atlantic')) {
      return {
        locationType: 'sea',
        locationTypeContext: fullEncounterContext.locationTypes.sea || null,
        locationSignificance: spaceData.note || `Sea space - ${spaceData.region}`,
      };
    }
  }
  
  // Check wilderness spaces
  for (const [spaceId, spaceData] of Object.entries(wildernessSpaces)) {
    if (loc.includes(spaceId.replace('space', 'space ')) || (spaceData.name && loc.includes(spaceData.name.toLowerCase()))) {
      return {
        locationType: 'wilderness',
        locationTypeContext: fullEncounterContext.locationTypes.wilderness || null,
        locationSignificance: spaceData.name || `Wilderness - ${spaceData.region}`,
      };
    }
  }
  
  // Check for generic location type keywords
  if (loc.includes('wilderness') || loc.includes('jungle') || loc.includes('forest') || loc.includes('mountain') || loc.includes('desert') || loc.includes('amazon') || loc.includes('africa') || loc.includes('pyramid') || loc.includes('himalayas')) {
    return {
      locationType: 'wilderness',
      locationTypeContext: fullEncounterContext.locationTypes.wilderness || null,
      locationSignificance: null,
    };
  }
  
  if (loc.includes('sea') || loc.includes('ocean') || loc.includes('ship') || loc.includes('atlantic') || loc.includes('pacific')) {
    return {
      locationType: 'sea',
      locationTypeContext: fullEncounterContext.locationTypes.sea || null,
      locationSignificance: null,
    };
  }
  
  // Default to city
  return {
    locationType: 'city',
    locationTypeContext: fullEncounterContext.locationTypes.city || null,
    locationSignificance: null,
  };
}

/**
 * Get context relevant to a specific encounter type
 */
export function getEncounterTypeContext(encounterType: string): EncounterTypeContext | null {
  const normalized = encounterType.toLowerCase().replace(/[^a-z]/g, '');
  
  // Try direct match first
  if (fullEncounterContext.encounterTypes[encounterType]) {
    return fullEncounterContext.encounterTypes[encounterType];
  }
  
  // Try normalized match
  for (const [key, value] of Object.entries(fullEncounterContext.encounterTypes)) {
    if (key.toLowerCase().replace(/[^a-z]/g, '') === normalized) {
      return value;
    }
  }
  
  // Default to general
  return fullEncounterContext.encounterTypes.location || null;
}

/**
 * Get complexity info for an encounter type
 */
export function getEncounterComplexity(encounterType: string): 'simple' | 'complex' {
  const typeContext = getEncounterTypeContext(encounterType);
  if (typeContext?.complexity) {
    return typeContext.complexity as 'simple' | 'complex';
  }
  
  // Check in the complexity lists
  const complexTypes = fullEncounterContext.encounterComplexity.complex.types.map(t => t.toLowerCase());
  if (complexTypes.some(t => encounterType.toLowerCase().includes(t.replace(' encounter', '')))) {
    return 'complex';
  }
  
  return 'simple';
}

/**
 * Build the encounter context to send with an API request
 * This provides a condensed version relevant to the specific encounter
 */
export function buildEncounterContextForRequest(location: string, encounterType: string): {
  locationContext: {
    locationType: string;
    atmosphere: string;
    commonSkills: string[];
    commonThemes: string[];
    typicalPassOutcomes: string[];
    typicalFailOutcomes: string[];
    significance: string | null;
  };
  encounterTypeContext: {
    type: string;
    complexity: string;
    description: string;
    trigger: string;
  };
  skills: Record<string, { description: string; commonUses: string[] }>;
  conditions: { physical: string[]; mental: string[]; situational: string[] };
  difficultyScaling: Record<string, { difficulty: string; meaning: string }>;
  encounterRules: {
    regularStructure: string;
    complexStructure: string;
    precedenceRules: string[];
  };
} {
  const locContext = getLocationContext(location);
  const encTypeContext = getEncounterTypeContext(encounterType);
  
  return {
    locationContext: {
      locationType: locContext.locationType,
      atmosphere: locContext.locationTypeContext?.atmosphere || 'Unknown environment',
      commonSkills: locContext.locationTypeContext?.commonSkills || ['Observation'],
      commonThemes: locContext.locationTypeContext?.commonThemes || [],
      typicalPassOutcomes: locContext.locationTypeContext?.typicalPassOutcomes || ['Gain Clue'],
      typicalFailOutcomes: locContext.locationTypeContext?.typicalFailOutcomes || ['Lose Sanity'],
      significance: locContext.locationSignificance,
    },
    encounterTypeContext: {
      type: encounterType,
      complexity: getEncounterComplexity(encounterType),
      description: encTypeContext?.description || 'Standard encounter',
      trigger: encTypeContext?.trigger || 'During Encounter Phase',
    },
    skills: Object.fromEntries(
      Object.entries(fullEncounterContext.skills).map(([k, v]) => [
        k, 
        { description: v.description, commonUses: v.commonUsesInEncounters }
      ])
    ),
    conditions: {
      physical: fullEncounterContext.conditions.physical,
      mental: fullEncounterContext.conditions.mental,
      situational: fullEncounterContext.conditions.situational,
    },
    difficultyScaling: fullEncounterContext.difficultyScaling.tensionToDifficulty,
    encounterRules: {
      regularStructure: typeof fullEncounterContext.encounterComplexity.regular.structure === 'string' 
        ? fullEncounterContext.encounterComplexity.regular.structure 
        : 'Single test → Pass/Fail outcomes',
      complexStructure: 'Three sections: Initial (white) → Pass (gold) / Fail (red). Usually 2 tests.',
      precedenceRules: fullEncounterContext.encounterPhaseRules.encounterOrder.specialRules.slice(0, 3),
    },
  };
}

export default fullEncounterContext;




