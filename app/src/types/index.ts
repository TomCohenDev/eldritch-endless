// =============================================================================
// NARRATOR VOICE TYPES (for ElevenLabs integration)
// =============================================================================

export interface NarratorVoice {
  id: string;
  name: string;
  description: string;
  sampleFile: string; // Filename in assets/voices/ folder
}

export const NARRATOR_VOICES: NarratorVoice[] = [
  {
    id: "tmtVLLFJVXmAZYwJoVdL",
    name: "Claire",
    description: "Rhythmic and Clear Narrator",
    sampleFile: "claire.mp3"
  },
  {
    id: "BpjGufoPiobT79j2vtj4",
    name: "Priyanka",
    description: "Calm, Neutral and Relaxed",
    sampleFile: "priyanka.mp3"
  },
  {
    id: "BQOei2tk6QCBMHQWPhbj",
    name: "Cedric",
    description: "Slow-Burn Horror Storyteller",
    sampleFile: "cedric.mp3"
  },
  {
    id: "NtSmOMyr386gAQrqbQcB",
    name: "Global Artist",
    description: "Soft, Kind and Clear",
    sampleFile: "global-artist.mp3"
  }
];

// =============================================================================
// Wiki data types (from eldritch_horror_data.json)
// =============================================================================
// Renamed interface to force cache bust
export interface WikiPage {
  title: string;
  pageId: number;
  categories: string[];
  infobox: Record<string, string>;
  cardData: Record<string, string>;
  sections: Record<string, string>;
  links: string[];
  templates: string[];
  fullText: string;
  rawWikitext: string;
}

export interface GameData {
  metadata: {
    source: string;
    scrapedAt: string;
    version: string;
    totalPages: number;
    stats: Record<string, number>;
  };
  categories: {
    investigators: WikiPage[];
    ancientOnes: WikiPage[];
    monsters: WikiPage[];
    epicMonsters: WikiPage[];
    assets: WikiPage[];
    uniqueAssets: WikiPage[];
    artifacts: WikiPage[];
    spells: WikiPage[];
    conditions: WikiPage[];
    encounters: {
      general: WikiPage[];
      location: WikiPage[];
      research: WikiPage[];
      otherWorld: WikiPage[];
      expedition: WikiPage[];
      mysticRuins: WikiPage[];
      dreamQuest: WikiPage[];
      devastation: WikiPage[];
      special: WikiPage[];
      combat: WikiPage[];
      other: WikiPage[];
    };
    mythos: WikiPage[];
    mysteries: WikiPage[];
    preludes: WikiPage[];
    adventures: WikiPage[];
    personalStories: WikiPage[];
    gameSets: WikiPage[];
    gameBoards: WikiPage[];
    mechanics: WikiPage[];
    other: WikiPage[];
  };
  allPages: Record<string, WikiPage>;
}

export type AncientOneDifficulty = "Low" | "Medium" | "High";

export interface AncientOneSetupMeta {
  difficulty: AncientOneDifficulty;
  startingDoom: number;
  mythosDeckSize: number;
  mysteries: string;
  notes: string;
  set: string;
  requiresSideBoard: "Antarctica" | "Dreamlands" | "Egypt" | null;
}

// Some screens will attach setup info onto the WikiPage at runtime.
export type AncientOnePage = WikiPage & { setup?: AncientOneSetupMeta };

// Game state types
export type GamePhase =
  | "setup"
  | "action"
  | "encounter"
  | "mythos"
  | "resolution";

// Location on the world map (named cities or numbered spaces)
export interface MapLocation {
  id: string; // e.g. "London", "Space 13"
  name: string; // Display name: "London", "Arctic Ocean (Space 13)"
  type: "City" | "Sea" | "Wilderness";
  realWorld?: string; // e.g. "Franz Josef Land, Russia"
}

// Action types available during Action Phase
export type ActionType =
  | "travel" // Move to an adjacent space
  | "rest" // Recover 1 Health and 1 Sanity
  | "trade" // Exchange assets/clues with investigator on same space
  | "prepare_travel" // Acquire a Ship or Train ticket
  | "acquire_assets" // Roll Influence to gain assets from reserve
  | "component" // Use a component action (focus, special ability, etc.)
  | "local_action"; // Location-specific action (city action)

// Record of a single action taken by an investigator
export interface ActionRecord {
  id: string;
  playerId: string;
  actionType: ActionType;
  timestamp: number;
  round: number;
  details: {
    fromLocation?: string;
    toLocation?: string;
    healthChange?: number;
    sanityChange?: number;
    itemsTraded?: string[];
    ticketAcquired?: "ship" | "train";
    assetsAcquired?: string[];
    componentUsed?: string;
    description?: string; // Free-form for context
  };
}

export interface Player {
  id: string;
  name: string;
  investigator: WikiPage | null;
  health: number;
  sanity: number;
  clues: number;
  focus: number;
  conditions: string[];
  assets: string[];
  location: string;

  // Action phase tracking
  actionsRemaining: number; // Starts at 2 each Action Phase
  shipTickets: number;
  trainTickets: number;
}

export interface NarrativeEvent {
  id: string;
  timestamp: number;
  type: "encounter" | "mythos" | "story" | "decision" | "outcome";
  title: string;
  content: string;
  playerIds?: string[];
  outcome?: "pass" | "fail" | "neutral";
  choices?: NarrativeChoice[];
}

export interface NarrativeChoice {
  id: string;
  label: string;
  description?: string;
}

// Plot context generated by AI at game start
export interface InvestigatorThread {
  playerId: string;
  personalStakes: string; // Why THIS investigator must stop it
  connectionToThreat: string; // How their backstory ties in
  potentialArc: string; // Character growth possibility
}

export interface PlotContext {
  // Core narrative
  premise: string; // Opening situation (2-3 sentences)
  currentAct: "rising" | "confrontation" | "climax" | "resolution";

  // Threat context
  ancientOneMotivation: string; // Why the Ancient One is awakening
  cultistAgenda: string; // What forces work against investigators
  cosmicThreat: string; // The stakes if they fail

  // Investigator threads
  investigatorThreads: InvestigatorThread[];

  // Flexible narrative seeds
  mysteryHooks: string[]; // Potential plot directions
  locationSignificance: Record<string, string>; // Why certain places matter

  // Branching possibilities
  possibleOutcomes: {
    victory: string; // What happens if investigators win
    defeat: string; // What happens if Ancient One awakens
    pyrrhicVictory: string; // Win at great cost scenario
  };

  // Dynamic tracking
  currentTension: number; // 0-10 scale
  activeThemes: string[]; // Horror themes in play
  majorPlotPoints: string[]; // Key events that have occurred
}

// API request/response types for plot generation
export interface AncientOneContext {
  name: string;
  epithet?: string;
  shortDescription?: string;
  lore: string;
  abilities: string;
  mysteries: string[];
  researchEncounters: string;
  defeatCondition: string;
  awakeningTitle?: string;
  awakeningEffects?: string;
  awakeningFlavor?: string;
  finalMystery?: string;
  appearance?: string;
  residence?: string;
  disposition?: string;
  antagonists?: string;
  source?: string;
  cultistInfo?: string;
  difficulty?: string;
  startingDoom?: number;
  mythosDeckSize?: number;
  mysteryNames?: string[];
  researchEncounterDetails?: any;
  mysteryDetails?: any[];
}

export interface InvestigatorContext {
  name: string;
  profession: string;
  biography: string;
  abilities: string;
  personalStory: string;
  startingLocation: string;
  quote?: string;
  role?: string;
  teamRole?: string;
  origin?: string;
  startingEquipment?: any[];
  defeatedEncounters?: {
    lossOfHealth: string;
    lossOfSanity: string;
  };
  rulings?: string;
}

export interface GeneratePlotRequest {
  sessionId: string;
  ancientOne: AncientOneContext;
  investigators: InvestigatorContext[];
  playerCount: number;
  startingDoom: number;
}

// Helper to create empty plot context (fallback)
export function createEmptyPlotContext(): PlotContext {
  return {
    premise: "",
    currentAct: "rising",
    ancientOneMotivation: "",
    cultistAgenda: "",
    cosmicThreat: "",
    investigatorThreads: [],
    mysteryHooks: [],
    locationSignificance: {},
    possibleOutcomes: {
      victory: "",
      defeat: "",
      pyrrhicVictory: "",
    },
    currentTension: 3,
    activeThemes: [],
    majorPlotPoints: [],
  };
}

export interface GameState {
  // Session info
  sessionId: string;
  createdAt: number;
  lastUpdatedAt: number;

  // Game setup
  playerCount: number;
  players: Player[];
  ancientOne: WikiPage | null;

  // Game progress
  phase: GamePhase;
  round: number;
  doom: number;
  maxDoom: number;

  // Action phase tracking
  activePlayerIndex: number; // Which player is currently taking actions
  actionHistory: ActionRecord[]; // Full history of all actions taken (for AI context)

  // Narrative tracking
  narrativeLog: NarrativeEvent[];
  currentEncounter: NarrativeEvent | null;

  // Story context for AI (generated at game start, evolves during play)
  plotContext: PlotContext | null;

  // Narrator voice for ElevenLabs TTS
  narratorVoiceId: string;
}

// Simple fallback UUID generator
function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback if randomUUID fails (e.g. insecure context in some browsers)
    }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Initial/empty state factory
export function createInitialGameState(): GameState {
  return {
    sessionId: generateUUID(),
    createdAt: Date.now(),
    lastUpdatedAt: Date.now(),
    playerCount: 1,
    players: [],
    ancientOne: null,
    phase: "setup",
    round: 1,
    doom: 0,
    maxDoom: 15,
    activePlayerIndex: 0,
    actionHistory: [],
    narrativeLog: [],
    currentEncounter: null,
    plotContext: null,
    narratorVoiceId: NARRATOR_VOICES[2].id, // Default to Cedric - Slow-Burn Horror Storyteller
  };
}

// =============================================================================
// ENCOUNTER GENERATION CONTEXT TYPES
// These types provide ALL context needed for the n8n encounter generation workflow
// =============================================================================

/**
 * A single action in human-readable format for the AI
 * This is a simplified version of ActionRecord for narrative purposes
 */
export interface ActionTimelineEntry {
  timestamp: number;
  investigatorName: string;
  investigatorId: string;
  actionType: ActionType;
  description: string; // Human-readable action description
  fromLocation?: string;
  toLocation?: string;
  currentLocation: string;
}

/**
 * Summary of all actions taken during a single round
 * Organized by investigator for clarity
 */
export interface RoundTimeline {
  round: number;
  actions: ActionTimelineEntry[];
  summary: string; // AI-friendly narrative summary of what happened
}

/**
 * Snapshot of a player's current state
 * Used to give the AI full context about each investigator
 */
export interface InvestigatorSnapshot {
  id: string;
  name: string;
  profession: string;
  location: string;
  health: number;
  maxHealth: number;
  sanity: number;
  maxSanity: number;
  clues: number;
  conditions: string[];
  assets: string[];
  shipTickets: number;
  trainTickets: number;
  // From plot context - their personal narrative thread
  personalStakes?: string;
  connectionToThreat?: string;
  potentialArc?: string;
}

/**
 * Types of encounters that can be generated
 */
export type EncounterType =
  | "general" // City/Sea/Wilderness based on location type
  | "location_region" // Specific region (Europe, Americas, Asia, etc.)
  | "research" // Ancient One specific research encounters
  | "other_world" // Encounters from beyond reality
  | "expedition" // Expedition location encounters
  | "mystic_ruins" // Mystic Ruins encounters (complex)
  | "dream_quest" // Dream-Quest encounters (complex)
  | "devastation" // Devastation encounters (complex)
  | "combat" // Monster encounters
  | "special"; // Unique/story-driven encounters

/**
 * The encounter being requested
 */
export interface EncounterRequest {
  type: EncounterType;
  subType?: string; // e.g., "Europe", "Azathoth Research", "Monster: Shoggoth"
  investigatorId: string; // Which investigator is having the encounter
  location: string; // Where the encounter takes place
  // Optional: specific card selected by player (for reference encounters)
  selectedCard?: {
    title: string;
    originalText: string;
  };
}

/**
 * Complete context package for encounter generation
 * This is everything the n8n workflow needs to generate a contextual encounter
 */
export interface GenerateEncounterRequest {
  // Session identification
  sessionId: string;
  
  // Current game state
  gameState: {
    round: number;
    doom: number;
    maxDoom: number;
    doomPercentage: number; // 0-100, how close to awakening
    phase: GamePhase;
  };
  
  // The plot context generated at game start
  plotContext: PlotContext;
  
  // Ancient One information
  ancientOne: {
    name: string;
    epithet?: string;
    motivation: string; // From plotContext.ancientOneMotivation
    cultistAgenda: string; // From plotContext.cultistAgenda
  };
  
  // All investigators' current state
  investigators: InvestigatorSnapshot[];
  
  // The investigator having this encounter
  activeInvestigator: InvestigatorSnapshot;
  
  // What kind of encounter is being requested
  encounterRequest: EncounterRequest;
  
  // Timeline of actions this round
  currentRoundTimeline: RoundTimeline;
  
  // Recent narrative events (last 5-10 for context)
  recentNarrative: Array<{
    type: NarrativeEvent['type'];
    title: string;
    content: string;
    outcome?: 'pass' | 'fail' | 'neutral';
  }>;
  
  // Location significance from plot (if this location has narrative importance)
  locationSignificance?: string;
  
  // Current tension level (0-10)
  currentTension: number;
  
  // Active themes to maintain
  activeThemes: string[];
  
  // Major plot points that have occurred
  majorPlotPoints: string[];
}

/**
 * Node in the encounter narrative tree
 */
export interface EncounterNode {
  id: string;
  text: string;
  type: 'decision' | 'test' | 'outcome';
  
  // For decisions
  choices?: {
    id: string;
    label: string;
    description?: string;
    nextNodeId: string;
  }[];
  
  // For tests
  test?: {
    skill: 'Lore' | 'Influence' | 'Observation' | 'Strength' | 'Will';
    difficulty: number;
    passNodeId: string;
    failNodeId: string;
  };
  
  // For outcomes
  effects?: {
    healthChange?: number;
    sanityChange?: number;
    cluesGained?: number;
    doomChange?: number;
    conditionsGained?: string[];
    assetsGained?: string[];
  };
}

/**
 * Response from the encounter generation workflow
 */
export interface GenerateEncounterResponse {
  // The encounter meta
  encounter: {
    title: string;
    narrative: string; // Overall setup description
    flavorText?: string;
    startingNodeId: string; // Entry point to the tree
  };
  
  // The narrative tree nodes
  nodes: EncounterNode[];
  
  // Suggested narrative hooks for future encounters
  narrativeHooks?: string[];
  
  // Should tension increase/decrease based on this encounter?
  tensionChange?: number; // -2 to +2
  
  // Any plot points established by this encounter
  newPlotPoints?: string[];
}

/**
 * Response after resolving an encounter choice
 */
export interface ResolveEncounterRequest {
  sessionId: string;
  encounterId: string;
  choiceId: string;
  testResult?: {
    rolled: number;
    successes: number;
    passed: boolean;
  };
  // Current state for context
  investigator: InvestigatorSnapshot;
  plotContext: PlotContext;
}

export interface ResolveEncounterResponse {
  outcome: 'pass' | 'fail' | 'neutral';
  narrative: string; // What happens as a result
  
  // Mechanical effects
  effects: {
    healthChange?: number;
    sanityChange?: number;
    cluesGained?: number;
    doomChange?: number;
    conditionsGained?: string[];
    conditionsRemoved?: string[];
    assetsGained?: string[];
    assetsLost?: string[];
  };
  
  // Story impact
  storyImpact?: {
    plotPointAdded?: string;
    tensionChange?: number;
    locationSignificanceAdded?: {
      location: string;
      significance: string;
    };
    investigatorThreadUpdate?: string; // Update to this investigator's personal narrative
  };
}
