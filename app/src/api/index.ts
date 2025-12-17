/**
 * API Stubs for n8n Backend Integration
 * 
 * These functions will be replaced with real API calls once the n8n backend is set up.
 * For now, they return mock data to enable UI development.
 */

import type { GameState, NarrativeEvent, WikiPage } from '../types';

// Base URL for the n8n webhook (to be configured)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5678/webhook';

// Simple fallback UUID generator if crypto.randomUUID is missing
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a narrative encounter based on game context
 * This will call the AI agent to create story-appropriate encounters
 */
export async function generateEncounter(context: {
  gameState: GameState;
  encounterType: 'location' | 'research' | 'other_world' | 'combat' | 'special';
  location?: string;
}): Promise<NarrativeEvent> {
  // Mock response
  return {
    id: generateUUID(),
    timestamp: Date.now(),
    type: 'encounter',
    title: 'Shadows in the Library',
    content: `The ancient tomes seem to whisper as you approach. Something moves in the darkness between the shelves, and you catch a glimpse of eyes that should not exist...`,
    choices: [
      { id: 'investigate', label: 'Investigate the movement', description: 'Test Observation (2)' },
      { id: 'read', label: 'Read the nearest tome', description: 'Test Lore (1)' },
      { id: 'leave', label: 'Leave quietly', description: 'No test required' },
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
  outcome: 'pass' | 'fail' | 'neutral';
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
    outcome: 'pass',
    narrative: 'The shadows recede as you shine your light upon them, revealing ancient texts that speak of rituals long forgotten. Your mind strains to comprehend the knowledge within.',
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
export async function getMythosEvent(gameState: GameState): Promise<NarrativeEvent> {
  // Mock response
  return {
    id: generateUUID(),
    timestamp: Date.now(),
    type: 'mythos',
    title: 'Stars Align',
    content: 'The constellations shift imperceptibly, but those attuned to cosmic forces feel reality shudder. The Ancient One grows stronger as the barrier between worlds weakens.',
  };
}

/**
 * Get a suggested Ancient One based on player count and preferences
 */
export async function suggestAncientOne(context: {
  playerCount: number;
  preferredDifficulty?: 'easy' | 'medium' | 'hard';
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
    reasoning: 'The AI will suggest investigators that complement each other and match the narrative tone.',
  };
}

/**
 * Health check for the backend connection
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
