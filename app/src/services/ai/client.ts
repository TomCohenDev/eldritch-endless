import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client
// Note: In a production environment, you should proxy requests through a backend
// to avoid exposing your API key. For local development or personal apps,
// usage in the client is acceptable but risky if hosted publicly.
export const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || "",
  dangerouslyAllowBrowser: true, // Required for client-side usage
});

// AI Model Configuration - Purpose-Specific Models
// =================================================

/**
 * PLOT_GENERATION_MODEL
 * Used for: Initial game plot generation, creating narrative context
 * Requirements: High creativity, deep understanding, rich storytelling
 * Model: Claude Opus 4.5 - Most capable for complex narrative generation
 */
export const PLOT_GENERATION_MODEL = "claude-opus-4-5";

/**
 * ENCOUNTER_GENERATION_MODEL
 * Used for: Creating individual encounters during gameplay
 * Requirements: Good creativity, moderate speed, consistent tone, excellent instruction following
 * Model: Claude Sonnet 4.5 - Latest model with improved instruction following and JSON generation
 */
export const ENCOUNTER_GENERATION_MODEL = "claude-sonnet-4-5-20250929";

/**
 * NARRATION_SCRIPT_MODEL (Future Use)
 * Used for: Generating text for TTS narration
 * Requirements: Natural dialogue, emotional resonance, brevity
 * Model: Claude Sonnet 3.5 - Fast and natural language
 */
export const NARRATION_SCRIPT_MODEL = "claude-3-5-sonnet-20240620";

/**
 * DECISION_OUTCOME_MODEL (Future Use)
 * Used for: Resolving player choices and generating consequences
 * Requirements: Fast response, consistent mechanics, narrative coherence
 * Model: Claude Sonnet 3.5 - Quick turnaround for gameplay
 */
export const DECISION_OUTCOME_MODEL = "claude-3-5-sonnet-20240620";

// Legacy exports for backwards compatibility
export const AI_MODEL = PLOT_GENERATION_MODEL;
export const FAST_AI_MODEL = ENCOUNTER_GENERATION_MODEL;

