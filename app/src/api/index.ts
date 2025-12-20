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
} from "../types";

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
 * Throws an error if the API call fails - no fallbacks allowed
 */
export async function generatePlot(
  request: GeneratePlotRequest
): Promise<PlotContext> {
  const response = await fetch(`${API_BASE_URL}/game-start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
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
}

/**
 * Generate a narrative encounter based on game context
 * This will call the AI agent to create story-appropriate encounters
 * Throws an error if the API call fails - no fallbacks allowed
 */
export async function generateEncounter(
  request: GenerateEncounterRequest
): Promise<GenerateEncounterResponse> {
  const response = await fetch(`${API_BASE_URL}/encounter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    console.error(
      "Encounter generation failed:",
      response.status,
      response.statusText
    );
    throw new Error(`Failed to generate encounter: ${response.statusText}`);
  }

  return (await response.json()) as GenerateEncounterResponse;
}

/**
 * Narration response with audio URLs for each section
 */
export interface NarrationResponse {
  premise?: string;
  investigators?: Record<string, string>; // playerId -> audioUrl
}

/**
 * Request format for narration generation
 * Matches the n8n workflow expected input
 */
export interface NarrationRequest {
  plotContext: {
    premise: string;
    investigatorThreads: Array<{
      playerId: string;
      personalStakes: string;
      connectionToThreat: string;
    }>;
  };
  voiceId: string;
}

/**
 * Generate narration audio for the prologue sections
 * Calls the TTS service to generate spoken narration
 * Throws an error if the API call fails - no fallbacks allowed
 */
export async function generateNarration(request: NarrationRequest): Promise<NarrationResponse> {
  const response = await fetch(`${API_BASE_URL}/game-narration`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    console.error(
      "Narration generation failed:",
      response.status,
      response.statusText
    );
    throw new Error(`Failed to generate narration: ${response.statusText}`);
  }

  return (await response.json()) as NarrationResponse;
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
    });
    return response.ok;
  } catch {
    return false;
  }
}
