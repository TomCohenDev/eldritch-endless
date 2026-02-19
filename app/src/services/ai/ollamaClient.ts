import { Ollama } from 'ollama/browser';

// Ollama configuration from environment
const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'gemma3:4b';

// Use proxy path in development to avoid CORS issues
const getOllamaHost = () => {
  // In development, use the Vite proxy with full origin
  if (import.meta.env.DEV) {
    return `${window.location.origin}/ollama-api`;
  }
  // In production, use the configured URL directly
  return OLLAMA_BASE_URL;
};

// Log Ollama configuration on module load
console.log('[Ollama Client] Initializing...');
console.log('[Ollama Client] Base URL:', OLLAMA_BASE_URL);
console.log('[Ollama Client] Model:', OLLAMA_MODEL);
console.log('[Ollama Client] Using proxy:', import.meta.env.DEV ? 'Yes (/ollama-api)' : 'No');

// Initialize Ollama client for browser usage
export const ollama = new Ollama({ host: getOllamaHost() });

console.log('[Ollama Client] Ollama client initialized');

/**
 * OLLAMA_ENCOUNTER_MODEL
 * Used for: Creating individual encounters during gameplay
 * Requirements: Fast, creative, good instruction following
 * Model: Gemma 3 1B - Local model for fast gameplay generation
 */
export const OLLAMA_ENCOUNTER_MODEL = OLLAMA_MODEL;

/**
 * OLLAMA_MYTHOS_MODEL
 * Used for: Generating mythos card stories
 * Requirements: Fast, narrative consistency, horror atmosphere
 * Model: Gemma 3 1B - Local model for card generation
 */
export const OLLAMA_MYTHOS_MODEL = OLLAMA_MODEL;

/**
 * OLLAMA_AUDIO_TAG_MODEL
 * Used for: Adding ElevenLabs audio tags to narration text
 * Requirements: Fast, consistent, understands theatrical audio direction
 * Model: Gemma 3 1B - Local model for structured tagging
 */
export const OLLAMA_AUDIO_TAG_MODEL = OLLAMA_MODEL;

// Temperature settings for different generation types
export const ENCOUNTER_TEMPERATURE = 1.0; // Higher for more creative encounters
export const MYTHOS_TEMPERATURE = 1.0; // Higher for more varied mythos stories

/**
 * Health check function to verify Ollama is running and model is available
 */
export async function checkOllamaHealth(): Promise<{
  healthy: boolean;
  ollamaRunning: boolean;
  modelLoaded: boolean;
  error?: string;
}> {
  console.log('[Ollama Health] Checking Ollama status...');

  try {
    // Check if Ollama is running by listing models
    const models = await ollama.list();
    console.log('[Ollama Health] Ollama is running, found', models.models.length, 'models');

    // Check if our required model is available
    const modelNames = models.models.map(m => m.name);
    console.log('[Ollama Health] Available models:', modelNames.join(', '));

    // Check for model (with or without :latest tag)
    const modelBase = OLLAMA_MODEL.split(':')[0];
    const hasModel = models.models.some(m =>
      m.name === OLLAMA_MODEL ||
      m.name === `${OLLAMA_MODEL}:latest` ||
      m.name.startsWith(`${modelBase}:`)
    );

    if (!hasModel) {
      console.warn('[Ollama Health] Required model not found:', OLLAMA_MODEL);
      return {
        healthy: false,
        ollamaRunning: true,
        modelLoaded: false,
        error: `Model "${OLLAMA_MODEL}" not found. Run: ollama pull ${OLLAMA_MODEL}`
      };
    }

    console.log('[Ollama Health] Model available:', OLLAMA_MODEL);
    return {
      healthy: true,
      ollamaRunning: true,
      modelLoaded: true
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Ollama Health] Health check failed:', errorMessage);

    // Check if it's a connection error
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED')) {
      return {
        healthy: false,
        ollamaRunning: false,
        modelLoaded: false,
        error: 'Ollama is not running. Start Ollama and try again.'
      };
    }

    return {
      healthy: false,
      ollamaRunning: false,
      modelLoaded: false,
      error: errorMessage
    };
  }
}
