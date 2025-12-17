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

export type AncientOneDifficulty = 'Low' | 'Medium' | 'High';

export interface AncientOneSetupMeta {
  difficulty: AncientOneDifficulty;
  startingDoom: number;
  mythosDeckSize: number;
  mysteries: string;
  notes: string;
  set: string;
  requiresSideBoard: 'Antarctica' | 'Dreamlands' | 'Egypt' | null;
}

// Some screens will attach setup info onto the WikiPage at runtime.
export type AncientOnePage = WikiPage & { setup?: AncientOneSetupMeta };

// Game state types
export type GamePhase = 
  | 'setup'
  | 'action'
  | 'encounter'
  | 'mythos'
  | 'resolution';

// Location on the world map (named cities or numbered spaces)
export interface MapLocation {
  id: string;           // e.g. "London", "Space 13"
  name: string;         // Display name: "London", "Arctic Ocean (Space 13)"
  type: 'City' | 'Sea' | 'Wilderness';
  realWorld?: string;   // e.g. "Franz Josef Land, Russia"
}

// Action types available during Action Phase
export type ActionType = 
  | 'travel'           // Move to an adjacent space
  | 'rest'             // Recover 1 Health and 1 Sanity
  | 'trade'            // Exchange assets/clues with investigator on same space
  | 'prepare_travel'   // Acquire a Ship or Train ticket
  | 'acquire_assets'   // Roll Influence to gain assets from reserve
  | 'component'        // Use a component action (focus, special ability, etc.)
  | 'local_action';    // Location-specific action (city action)

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
    ticketAcquired?: 'ship' | 'train';
    assetsAcquired?: string[];
    componentUsed?: string;
    description?: string;  // Free-form for context
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
  actionsRemaining: number;   // Starts at 2 each Action Phase
  shipTickets: number;
  trainTickets: number;
}

export interface NarrativeEvent {
  id: string;
  timestamp: number;
  type: 'encounter' | 'mythos' | 'story' | 'decision' | 'outcome';
  title: string;
  content: string;
  playerIds?: string[];
  outcome?: 'pass' | 'fail' | 'neutral';
  choices?: NarrativeChoice[];
}

export interface NarrativeChoice {
  id: string;
  label: string;
  description?: string;
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
  activePlayerIndex: number;      // Which player is currently taking actions
  actionHistory: ActionRecord[];  // Full history of all actions taken (for AI context)
  
  // Narrative tracking
  narrativeLog: NarrativeEvent[];
  currentEncounter: NarrativeEvent | null;
  
  // Story context for AI (to be sent to backend)
  storyContext: {
    majorPlotPoints: string[];
    currentTension: number; // 0-10 scale
    recentThemes: string[];
  };
}

// Simple fallback UUID generator
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback if randomUUID fails (e.g. insecure context in some browsers)
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
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
    phase: 'setup',
    round: 1,
    doom: 0,
    maxDoom: 15,
    activePlayerIndex: 0,
    actionHistory: [],
    narrativeLog: [],
    currentEncounter: null,
    storyContext: {
      majorPlotPoints: [],
      currentTension: 3,
      recentThemes: [],
    },
  };
}

