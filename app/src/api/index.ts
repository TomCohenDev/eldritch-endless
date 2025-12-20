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
} from "../types";
import { createEmptyPlotContext as createFallbackPlot } from "../types";

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
      signal: AbortSignal.timeout(30000), // 30 second timeout for AI generation
    });

    if (!response.ok) {
      console.error(
        "Plot generation failed:",
        response.status,
        response.statusText
      );
      throw new Error(`Failed to generate plot: ${response.statusText}`);
    }

    const plotContext = (await response.json()) as PlotContext;
    return plotContext;
  } catch (error) {
    console.error("Plot generation error:", error);

    // Return a fallback plot context so the game can continue
    return createFallbackPlotContext(request);
  }
}

/**
 * Create a fallback plot context when the API is unavailable
 * Generates minimal placeholder content based on the game setup
 */
function createFallbackPlotContext(request: GeneratePlotRequest): PlotContext {
  const fallback = createFallbackPlot();

  // Populate with basic context from the request
  fallback.premise =
    `The stars align as ${request.ancientOne.name} stirs in the darkness beyond reality. ` +
    `${request.investigators.length} investigator${
      request.investigators.length > 1 ? "s" : ""
    } must uncover the truth before doom befalls the world.`;

  fallback.ancientOneMotivation = `${request.ancientOne.name} seeks to break through the barriers between worlds.`;
  fallback.cultistAgenda = `Dark cults work in shadow to hasten the awakening.`;
  fallback.cosmicThreat = `Should ${request.ancientOne.name} fully awaken, reality itself will be unmade.`;

  fallback.investigatorThreads = request.investigators.map((inv, idx) => ({
    playerId: `player-${idx}`,
    personalStakes: `${inv.name} must confront the darkness that has haunted their dreams.`,
    connectionToThreat: `Their path has led them to this moment of cosmic significance.`,
    potentialArc: `Will ${inv.name} find the strength to face the unknown?`,
  }));

  fallback.mysteryHooks = [
    "Strange phenomena reported across the globe",
    "Ancient texts speak of rituals long forgotten",
    "Witnesses describe impossible geometries in the sky",
  ];

  fallback.possibleOutcomes = {
    victory: `The investigators seal away ${request.ancientOne.name}, but the memory of what they witnessed will haunt them forever.`,
    defeat: `${request.ancientOne.name} awakens, and the world is forever changed.`,
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
 * Generate a narrative encounter based on game context
 * This will call the AI agent to create story-appropriate encounters
 */
export async function generateEncounter(context: {
  gameState: GameState;
  encounterType: "location" | "research" | "other_world" | "combat" | "special";
  location?: string;
}): Promise<NarrativeEvent> {
  // Mock response
  return {
    id: generateUUID(),
    timestamp: Date.now(),
    type: "encounter",
    title: "Shadows in the Library",
    content: `The ancient tomes seem to whisper as you approach. Something moves in the darkness between the shelves, and you catch a glimpse of eyes that should not exist...`,
    choices: [
      {
        id: "investigate",
        label: "Investigate the movement",
        description: "Test Observation (2)",
      },
      {
        id: "read",
        label: "Read the nearest tome",
        description: "Test Lore (1)",
      },
      { id: "leave", label: "Leave quietly", description: "No test required" },
    ],
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
  gameState: GameState
): Promise<NarrativeEvent> {
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
  return null;
}

/**
 * Get narrative suggestions for investigator selection
 */
export async function getInvestigatorSuggestions(context: {
  playerCount: number;
  ancientOne?: WikiPage;
  selectedInvestigators: string[];
}): Promise<{
  suggested: WikiPage[];
  reasoning: string;
}> {
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
