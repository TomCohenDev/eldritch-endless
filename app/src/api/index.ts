/**
 * API Integration for n8n Backend
 *
 * Environment Variables:
 *   VITE_N8N_ENV: 'test' | 'prod' (default: 'prod')
 *
 * URLs:
 *   Test: https://n8n.yarden-zamir.com/webhook-test/...
 *   Prod: https://n8n.yarden-zamir.com/webhook/...
 */

import type {
  GameState,
  NarrativeEvent,
  WikiPage,
  PlotContext,
  GeneratePlotRequest,
  GenerateEncounterRequest,
  GenerateEncounterResponse,
  ResolveEncounterRequest,
  ResolveEncounterResponse,
} from "../types";
import { createEmptyPlotContext as createFallbackPlot } from "../types";
import { buildEncounterContextForRequest } from "../data/encounterContextLoader";

// n8n webhook configuration
const N8N_BASE = "https://n8n.yarden-zamir.com";
const N8N_ENV = import.meta.env.VITE_N8N_ENV || "prod";

// Base URL switches between test and production webhooks
const API_BASE_URL =
  N8N_ENV === "test" ? `${N8N_BASE}/webhook-test` : `${N8N_BASE}/webhook`;

// Log which environment is being used (helpful for debugging)
console.log(`[API] Using n8n ${N8N_ENV} environment: ${API_BASE_URL}`);

// Simple fallback UUID generator if crypto.randomUUID is missing
function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate the plot context for a new game session
 * Called when "Summon the Darkness" is clicked
 * The AI creates a dark, flexible narrative based on investigators and Ancient One
 */
export async function generatePlot(
  request: GeneratePlotRequest
): Promise<PlotContext> {
  try {
    const response = await fetch(`${API_BASE_URL}/game-start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(600000), // 60 second timeout for AI generation
    });

    if (!response.ok) {
      console.error(
        "Plot generation failed:",
        response.status,
        response.statusText
      );
      return createFallbackPlotContext(request);
    }

    const plotContext = (await response.json()) as PlotContext;
    return plotContext;
  } catch (e) {
    console.error("Plot generation error:", e);
    return createFallbackPlotContext(request);
  }
}

/**
 * Create a fallback plot context when the API is unavailable
 * Generates minimal placeholder content based on the game setup
 */
function createFallbackPlotContext(request: GeneratePlotRequest): PlotContext {
  const fallback = createFallbackPlot();
  const ao = request.ancientOne;
  const epithet = ao.epithet ? `, ${ao.epithet},` : "";

  // Populate with context from the request using the rich data
  fallback.premise = ao.shortDescription
    ? `${ao.shortDescription} ${request.investigators.length} investigator${
        request.investigators.length > 1 ? "s" : ""
      } must uncover the truth before doom befalls the world.`
    : `The stars align as ${
        ao.name
      }${epithet} stirs in the darkness beyond reality. ${
        request.investigators.length
      } investigator${
        request.investigators.length > 1 ? "s" : ""
      } must uncover the truth before doom befalls the world.`;

  // Use the awakening flavor if available
  fallback.ancientOneMotivation = ao.lore
    ? ao.lore.slice(0, 300) + "..."
    : `${ao.name} seeks to break through the barriers between worlds.`;

  fallback.cultistAgenda = ao.cultistInfo
    ? `Cultists serve ${ao.name}: ${ao.cultistInfo.slice(0, 200)}`
    : `Dark cults work in shadow to hasten the awakening.`;

  fallback.cosmicThreat = ao.awakeningFlavor
    ? ao.awakeningFlavor
    : `Should ${ao.name} fully awaken, reality itself will be unmade.`;

  fallback.investigatorThreads = request.investigators.map((inv, idx) => ({
    playerId: `player-${idx}`,
    personalStakes: inv.biography
      ? `${inv.name}, ${inv.profession}: ${inv.biography.slice(0, 200)}...`
      : `${inv.name} must confront the darkness that has haunted their dreams.`,
    connectionToThreat: inv.quote
      ? `"${inv.quote}" - Their path has led them to this moment of cosmic significance.`
      : `Their path has led them to this moment of cosmic significance.`,
    potentialArc: inv.teamRole
      ? `As a ${inv.role || "team"} specialist: ${inv.teamRole.slice(
          0,
          150
        )}...${
          inv.defeatedEncounters?.lossOfSanity
            ? ` If defeated: ${inv.defeatedEncounters.lossOfSanity.slice(
                0,
                50
              )}...`
            : ""
        }`
      : `Will ${inv.name} find the strength to face the unknown?`,
  }));

  // Use mystery names if available
  fallback.mysteryHooks = ao.mysteryNames?.length
    ? ao.mysteryNames
        .slice(0, 3)
        .map((m) => `The mystery of "${m}" awaits investigation`)
    : [
        "Strange phenomena reported across the globe",
        "Ancient texts speak of rituals long forgotten",
        "Witnesses describe impossible geometries in the sky",
      ];

  fallback.possibleOutcomes = {
    victory: `The investigators seal away ${ao.name}, but the memory of what they witnessed will haunt them forever.`,
    defeat: ao.awakeningTitle
      ? `${ao.awakeningTitle}: ${
          ao.awakeningFlavor?.slice(0, 150) ||
          `${ao.name} awakens, and the world is forever changed.`
        }`
      : `${ao.name} awakens, and the world is forever changed.`,
    pyrrhicVictory: `The Ancient One is stopped, but at a terrible cost that none could have foreseen.`,
  };

  fallback.currentTension = 3;
  fallback.activeThemes = [
    "cosmic horror",
    "forbidden knowledge",
    "impending doom",
  ];

  return fallback;
}

/**
 * Generate a narrative encounter based on full game context
 * This calls the n8n encounter generation workflow with ALL context
 * including the plot, action timeline, player states, and narrative history
 */
export async function generateEncounter(
  request: GenerateEncounterRequest
): Promise<GenerateEncounterResponse> {
  try {
    // Build encounter context based on location and encounter type
    const encounterRulesContext = buildEncounterContextForRequest(
      request.encounterRequest.location,
      request.encounterRequest.type
    );

    // Map webapp type to n8n encounter_type
    const typeMap: Record<string, string> = {
      location_region: "location",
      general: "general",
      research: "research",
      other_world: "other_world",
      expedition: "expedition",
      combat: "combat",
      special: "special",
    };

    const n8nType =
      typeMap[request.encounterRequest.type] || request.encounterRequest.type;

    // Derive space_type from location context or default to City
    const spaceType =
      encounterRulesContext.locationContext.locationType
        .charAt(0)
        .toUpperCase() +
        encounterRulesContext.locationContext.locationType.slice(1) || "City";

    // Extract other world location if applicable
    const otherWorld =
      request.encounterRequest.type === "other_world"
        ? request.encounterRequest.location
        : undefined;

    // Structure request for n8n workflow
    const n8nRequest = {
      encounter_type: n8nType,
      location: request.encounterRequest.location,
      space_type: spaceType,
      ancient_one: request.ancientOne.name,
      other_world: otherWorld,
      // Pass full context for AI generation
      game_context: {
        ...request,
        encounterRulesContext,
      },
      // Original request included for backward compatibility/reference
      original_request: request,
    };

    const response = await fetch(`${API_BASE_URL}/encounter-generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nRequest),
      signal: AbortSignal.timeout(120000), // 2 minute timeout for AI generation
    });

    if (!response.ok) {
      console.error(
        "Encounter generation failed:",
        response.status,
        response.statusText
      );
      // Return fallback encounter
      return createFallbackEncounter(request);
    }

    const raw = await response.json();
    // n8n may respond with an array of items; unwrap first item if so
    const result = (
      Array.isArray(raw) ? raw[0] : raw
    ) as GenerateEncounterResponse;
    return result;
  } catch (error) {
    console.error("Encounter generation error:", error);
    return createFallbackEncounter(request);
  }
}

/**
 * Create a fallback encounter when API is unavailable
 */
function createFallbackEncounter(
  request: GenerateEncounterRequest
): GenerateEncounterResponse {
  const { activeInvestigator, encounterRequest, plotContext } = request;

  // Generate contextual fallback based on encounter type
  const encounterNarratives: Record<
    string,
    { title: string; narrative: string }
  > = {
    general: {
      title: `Strange Occurrences in ${encounterRequest.location}`,
      narrative: `As ${activeInvestigator.name} moves through ${encounterRequest.location}, the air grows thick with an unnatural tension. The shadows seem to watch with malevolent intent.`,
    },
    location_region: {
      title: `Whispers in ${encounterRequest.location}`,
      narrative: `The locals speak in hushed tones of recent disturbances. ${activeInvestigator.name} feels the weight of ancient secrets pressing against the veil of reality.`,
    },
    research: {
      title: `${request.ancientOne.name} Research`,
      narrative: `Dusty tomes reveal fragments of truth about ${request.ancientOne.name}. Each revelation comes at a cost—knowledge that burdens the soul.`,
    },
    other_world: {
      title: "Beyond the Veil",
      narrative: `Reality bends and warps around ${activeInvestigator.name}. Colors that have no names paint impossible geometries across a sky that holds no stars humanity has ever seen.`,
    },
    expedition: {
      title: `Expedition: ${encounterRequest.location}`,
      narrative: `The expedition pushes forward into territories marked only as "unknown" on any map.`,
    },
    combat: {
      title: "A Horror Emerges",
      narrative: `From the darkness, something terrible takes form. ${activeInvestigator.name} faces a creature that defies natural law.`,
    },
    special: {
      title: "The Thread of Fate",
      narrative: `The cosmic tapestry shifts, and ${activeInvestigator.name} finds themselves at a nexus of destiny.`,
    },
  };

  const base =
    encounterNarratives[encounterRequest.type] || encounterNarratives.general;
  const startId = "node_start";

  return {
    encounter: {
      title: base.title,
      narrative: base.narrative,
      flavorText: plotContext.premise
        ? `"${plotContext.activeThemes[0] || "cosmic horror"}"`
        : undefined,
      startingNodeId: startId,
    },
    nodes: [
      {
        id: startId,
        text: base.narrative,
        type: "decision",
        choices: [
          {
            id: "investigate",
            label: "Investigate thoroughly",
            description: "Search for clues and understanding",
            nextNodeId: "node_investigate_test",
          },
          {
            id: "confront",
            label: "Face it head-on",
            description: "Confront the situation directly",
            nextNodeId: "node_confront_test",
          },
          {
            id: "retreat",
            label: "Withdraw carefully",
            description: "Preserve yourself for future battles",
            nextNodeId: "outcome_retreat",
          },
        ],
      },
      {
        id: "node_investigate_test",
        text: "You delve deep into the mystery...",
        type: "test",
        test: {
          skill: "Observation",
          difficulty: 1,
          passNodeId: "outcome_investigate_pass",
          failNodeId: "outcome_investigate_fail",
        },
      },
      {
        id: "node_confront_test",
        text: "You steel your nerves and step forward...",
        type: "test",
        test: {
          skill: "Will",
          difficulty: 1,
          passNodeId: "outcome_confront_pass",
          failNodeId: "outcome_confront_fail",
        },
      },
      {
        id: "outcome_investigate_pass",
        text: "You uncover valuable information hidden in the shadows.",
        type: "outcome",
        effects: { cluesGained: 1 },
      },
      {
        id: "outcome_investigate_fail",
        text: "The search yields nothing but dread and confusion.",
        type: "outcome",
        effects: { sanityChange: -1 },
      },
      {
        id: "outcome_confront_pass",
        text: "Your courage is rewarded, and you push back the darkness.",
        type: "outcome",
        effects: { cluesGained: 1, sanityChange: 1 },
      },
      {
        id: "outcome_confront_fail",
        text: "The experience shakes you to your core.",
        type: "outcome",
        effects: { sanityChange: -2 },
      },
      {
        id: "outcome_retreat",
        text: "You manage to escape unharmed, but the mystery remains.",
        type: "outcome",
        effects: {},
      },
    ],
    tensionChange: 0,
  };
}

/**
 * Resolve an encounter choice and get the outcome
 * This calls the n8n workflow to generate narrative consequences
 */
export async function resolveEncounter(
  request: ResolveEncounterRequest
): Promise<ResolveEncounterResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/encounter-resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(60000), // 1 minute timeout
    });

    if (!response.ok) {
      console.error(
        "Encounter resolution failed:",
        response.status,
        response.statusText
      );
      return createFallbackResolution(request);
    }

    return (await response.json()) as ResolveEncounterResponse;
  } catch (error) {
    console.error("Encounter resolution error:", error);
    return createFallbackResolution(request);
  }
}

/**
 * Create a fallback resolution when API is unavailable
 */
function createFallbackResolution(
  request: ResolveEncounterRequest
): ResolveEncounterResponse {
  const passed = request.testResult?.passed ?? Math.random() > 0.5;

  return {
    outcome: passed ? "pass" : "fail",
    narrative: passed
      ? `${request.investigator.name} succeeds against the odds. The darkness recedes, if only momentarily, and a small victory is claimed in this endless night.`
      : `Despite ${request.investigator.name}'s efforts, the cosmic forces prove overwhelming. The experience leaves its mark, a reminder of humanity's fragility against the infinite.`,
    effects: passed ? { cluesGained: 1 } : { sanityChange: -1 },
  };
}

/**
 * Advance the story based on a player decision
 * The AI will generate appropriate consequences and narrative continuation
 */
export async function advanceStory(context: {
  gameState: GameState;
  decision: string;
  choiceId: string;
}): Promise<{
  outcome: "pass" | "fail" | "neutral";
  narrative: string;
  effects: {
    health?: number;
    sanity?: number;
    clues?: number;
    doom?: number;
    conditions?: string[];
    assets?: string[];
  };
}> {
  void context;
  // Mock response
  return {
    outcome: "pass",
    narrative:
      "The shadows recede as you shine your light upon them, revealing ancient texts that speak of rituals long forgotten. Your mind strains to comprehend the knowledge within.",
    effects: {
      clues: 1,
      sanity: -1,
    },
  };
}

/**
 * Generate a Mythos event appropriate to the current game state
 * The AI ensures the event fits the narrative arc and difficulty curve
 */
export async function getMythosEvent(
  _gameState: GameState
): Promise<NarrativeEvent> {
  void _gameState;
  // Mock response
  return {
    id: generateUUID(),
    timestamp: Date.now(),
    type: "mythos",
    title: "Stars Align",
    content:
      "The constellations shift imperceptibly, but those attuned to cosmic forces feel reality shudder. The Ancient One grows stronger as the barrier between worlds weakens.",
  };
}

/**
 * Get a suggested Ancient One based on player count and preferences
 */
export async function suggestAncientOne(context: {
  playerCount: number;
  preferredDifficulty?: "easy" | "medium" | "hard";
  excludeIds?: number[];
}): Promise<WikiPage | null> {
  void context;
  return null;
}

/**
 * Get narrative suggestions for investigator selection
 */
export async function getInvestigatorSuggestions(_context: {
  playerCount: number;
  ancientOne?: WikiPage;
  selectedInvestigators: string[];
}): Promise<{
  suggested: WikiPage[];
  reasoning: string;
}> {
  void _context;
  return {
    suggested: [],
    reasoning:
      "The AI will suggest investigators that complement each other and match the narrative tone.",
  };
}

/**
 * Health check for the backend connection
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
