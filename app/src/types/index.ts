// Narrator voice configuration
export interface NarratorVoice {
  id: string;
  elevenLabsId: string; // The actual ElevenLabs voice ID for API calls
  name: string;
  description: string;
  sampleFile: string;
}

export const NARRATOR_VOICES: NarratorVoice[] = [
  {
    id: 'claire',
    elevenLabsId: 'tmtVLLFJVXmAZYwJoVdL',
    name: 'Claire',
    description: 'Calm and measured, with an air of quiet authority',
    sampleFile: 'claire.mp3',
  },
  {
    id: 'priyanka',
    elevenLabsId: 'BpjGufoPiobT79j2vtj4',
    name: 'Priyanka',
    description: 'Warm and inviting, with a storyteller\'s cadence',
    sampleFile: 'priyanka.mp3',
  },
  {
    id: 'cedric',
    elevenLabsId: 'BQOei2tk6QCBMHQWPhbj',
    name: 'Cedric',
    description: 'Deep and resonant, evoking ancient mysteries',
    sampleFile: 'cedric.mp3',
  },
  {
    id: 'global-artist',
    elevenLabsId: 'NtSmOMyr386gAQrqbQcB',
    name: 'Global Artist',
    description: 'Versatile and expressive, adapting to any tale',
    sampleFile: 'global-artist.mp3',
  },
  {
    id: 'celest',
    elevenLabsId: 'iF3or9nmjbmmkApwUOyk',
    name: 'Celest',
    description: 'Ethereal and haunting, perfect for cosmic horror',
    sampleFile: 'celest.mp3',
  },
  {
    id: 'amelia',
    elevenLabsId: 'VzL0S5icwVNq22k4PQh9',
    name: 'Amelia Tyler',
    description: 'Rich and dramatic, a classic narrator\'s voice',
    sampleFile: 'amelia_tyler.mp3',
  },
];

// Wiki data types (from eldritch_horror_data.json)
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
  // Full encounter history for AI context
  encounterHistory?: {
    nodes: Array<{
      text: string;
      type: 'decision' | 'test' | 'outcome';
      choiceMade?: string; // For decision nodes
      testResult?: 'pass' | 'fail'; // For test nodes
      effects?: any; // For outcome nodes
    }>;
    finalOutcome?: any;
  };
}

export interface NarrativeChoice {
  id: string;
  label: string;
  description?: string;
}

// Plot context generated by AI at game start
export interface InvestigatorThread {
  playerId: string;
  narrative: string; // Single paragraph (5-6 sentences) covering personal stakes, connection to threat, and potential arc
  // Legacy fields for backward compatibility (optional)
  personalStakes?: string;
  connectionToThreat?: string;
  potentialArc?: string;
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
  researchEncounterThematicSummary?: string; // AI-generated thematic summary of research encounters
  researchEncounters: string;
  defeatCondition: string;
  awakeningTitle?: string;
  awakeningEffects?: string;
  appearance?: string;
  residence?: string;
  disposition?: string;
  antagonists?: string;
  source?: string;
  cultistInfo?: string;
  difficulty?: string;
  startingDoom?: number;
  mythosDeckSize?: number;
}

export interface InvestigatorContext {
  name: string;
  profession: string;
  biography: string;
  abilities: string;
  personalStory: string;
  startingLocation: string;
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

  // Mythos deck tracking
  mythosDeck?: {
    stage: 1 | 2 | 3; // Current stage (1 = top, 3 = bottom)
    usedCardIds: (string | number)[]; // Cards that have been drawn (by pageId) - global tracking
    // Stage-specific tracking: how many cards of each color drawn from each stage
    stageDraws: {
      stage1: { green: number; yellow: number; blue: number };
      stage2: { green: number; yellow: number; blue: number };
      stage3: { green: number; yellow: number; blue: number };
    };
    // Track individual cards drawn per stage with their colors
    stageCards: {
      stage1: Array<{ pageId: number; title: string; color: 'Green' | 'Yellow' | 'Blue' }>;
      stage2: Array<{ pageId: number; title: string; color: 'Green' | 'Yellow' | 'Blue' }>;
      stage3: Array<{ pageId: number; title: string; color: 'Green' | 'Yellow' | 'Blue' }>;
    };
    lastDrawnCard?: {
      pageId: number;
      title: string;
      color: 'Green' | 'Yellow' | 'Blue';
      stage: number;
    };
  };

  // Track recent card descriptions for anti-repetition
  recentCardDescriptions?: {
    encounters: Array<{
      title: string;
      narrative: string;
      keyPhrases: string[];
      timestamp: number;
    }>;
    mythos: Array<{
      title: string;
      flavor: string;
      narrative: string;
      keyPhrases: string[];
      timestamp: number;
    }>;
  };
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
    mythosDeck: {
      stage: 1,
      usedCardIds: [],
      stageDraws: {
        stage1: { green: 0, yellow: 0, blue: 0 },
        stage2: { green: 0, yellow: 0, blue: 0 },
        stage3: { green: 0, yellow: 0, blue: 0 },
      },
      stageCards: {
        stage1: [],
        stage2: [],
        stage3: [],
      },
    },
    recentCardDescriptions: {
      encounters: [],
      mythos: [],
    },
  };
}

// Encounter types for the encounter picker
export type EncounterType =
  | 'general'
  | 'location'
  | 'research'
  | 'other_world'
  | 'expedition'
  | 'devastation'
  | 'combat'
  | 'special';

// Timeline of actions for the current round (for AI context)
export interface RoundTimeline {
  round: number;
  actions: {
    playerId: string;
    playerName: string;
    investigatorName: string;
    actionType: ActionType;
    description: string;
    timestamp: number;
  }[];
}

// Request to build encounter context
export interface EncounterRequest {
  type: EncounterType;
  subType?: string;
  investigatorId: string;
  location: string;
  selectedCard?: {
    title: string;
    originalText: string;
  };
}

// Snapshot of an investigator's current state
export interface InvestigatorSnapshot {
  id: string;
  name: string;
  investigatorName: string;
  profession: string;
  health: number;
  maxHealth: number;
  sanity: number;
  maxSanity: number;
  clues: number;
  focus: number;
  location: string;
  conditions: string[];
  assets: string[];
  actionsRemaining: number;
}

// Full request to send to the n8n encounter generation workflow
export interface GenerateEncounterRequest {
  sessionId: string;
  encounterType: EncounterType;
  subType?: string;
  
  // The selected card info
  selectedCard: {
    title: string;
    originalText: string;
  };
  
  // Active investigator context
  investigator: InvestigatorSnapshot;
  
  // Game state context
  gameContext: {
    round: number;
    doom: number;
    maxDoom: number;
    phase: GamePhase;
    ancientOneName: string;
    currentTension: number;
  };
  
  // Plot context for narrative continuity
  plotContext: {
    premise: string;
    currentAct: string;
    activeThemes: string[];
    majorPlotPoints: string[];
    investigatorThread?: InvestigatorThread;
    ancientOneMotivation: string;
    cultistAgenda: string;
    cosmicThreat: string;
    locationSignificance: Record<string, string>;
  };
  
  // Recent actions for context
  roundTimeline: RoundTimeline;
  
  // Recent encounters for narrative continuity
  recentEncounters?: Array<{
    title: string;
    location: string;
    investigatorName: string;
    summary: string;
    choicesMade: string[];
    outcome: any;
  }>;
}

// Encounter node for branching narratives
export interface EncounterNode {
  id: string;
  type: 'narrative' | 'test' | 'choice' | 'outcome';
  content: string;
  
  // For test nodes
  testInfo?: {
    skill: string;
    difficulty: number;
    modifiers?: string[];
  };
  
  // For choice nodes
  choices?: {
    id: string;
    label: string;
    description?: string;
    nextNodeId: string;
  }[];
  
  // For outcome nodes
  outcome?: {
    success: boolean;
    effects: {
      health?: number;
      sanity?: number;
      clues?: number;
      doom?: number;
      conditions?: string[];
      assets?: string[];
      assetsLost?: string[];
    };
    effectDescription?: string; // Clear description of gameplay consequences
  };
  
  // Navigation
  nextNodeId?: string;
  passNodeId?: string;
  failNodeId?: string;
}

// Response from the encounter generation API
export interface GenerateEncounterResponse {
  encounter: {
    title: string;
    startingNodeId: string;
    nodes: Record<string, EncounterNode>;
  };
  
  // Optional narrative adjustments
  tensionChange?: number;
  newPlotPoints?: string[];
}

// Mythos card types
export type MythosColor = 'Green' | 'Yellow' | 'Blue';
export type MythosDifficulty = 'Easy' | 'Normal' | 'Hard';
export type MythosTrait = 'Event' | 'Ongoing' | 'Ongoing - Rumor';

export interface MythosCard {
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
  // Parsed properties
  color?: 'Green' | 'Yellow' | 'Blue';
  difficulty?: 'Easy' | 'Normal' | 'Hard';
  trait?: 'Event' | 'Ongoing' | 'Ongoing - Rumor';
  flavor?: string;
  effect?: string;
  reckoning?: string;
  testSkill?: string; // Skill tested (Lore, Influence, Observation, Strength, Will)
  icons?: string[]; // Mythos card icons (Advance Omen, Reckoning, Spawn Gates, etc.)
  // Parsed fields
  color?: MythosColor;
  difficulty?: MythosDifficulty;
  trait?: MythosTrait;
  flavor?: string;
  effect?: string;
  reckoning?: string;
}

// Request to generate mythos card story
export interface GenerateMythosRequest {
  sessionId: string;
  card: MythosCard;
  stage: number;
  
  // Game context
  gameContext: {
    round: number;
    doom: number;
    maxDoom: number;
    ancientOneName: string;
    currentTension: number;
  };
  
  // Plot context for narrative continuity
  plotContext: {
    premise: string;
    currentAct: string;
    activeThemes: string[];
    majorPlotPoints: string[];
    ancientOneMotivation: string;
    cultistAgenda: string;
    cosmicThreat: string;
  };
  
  // Recent mythos cards for context
  recentMythosCards?: Array<{
    title: string;
    color: MythosColor;
    stage: number;
    summary: string;
  }>;
  
  // Investigators and their current state
  investigators?: Array<{
    name: string;
    profession?: string;
    location: string;
    health: number;
    sanity: number;
    clues: number;
    conditions: string[];
    assets: string[];
  }>;
  
  // Recent action and encounter timeline
  recentTimeline?: Array<{
    type: 'action' | 'encounter' | 'mythos' | 'story';
    playerName?: string;
    investigatorName?: string;
    description: string;
    location?: string;
    outcome?: string;
    timestamp: number;
    round: number;
  }>;
}

// Response from mythos generation API
export interface GenerateMythosResponse {
  card: {
    title: string;
    color: MythosColor;
    stage: number;
    // Original mechanics (unchanged)
    trait: MythosTrait;
    difficulty: MythosDifficulty;
    effect: string;
    reckoning?: string;
    testSkill?: string; // Skill tested (if applicable)
    icons?: string[]; // Mythos card icons
    // AI-generated story (changed)
    flavor: string;
    narrative: string; // Expanded narrative description
  };
  
  // Optional narrative adjustments
  tensionChange?: number;
  newPlotPoints?: string[];
}
