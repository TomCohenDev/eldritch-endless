import { GoogleGenerativeAI } from "@google/generative-ai";

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";

// Log API key status on module load
console.log('🔑 [Gemini Client] Initializing...');
console.log('[Gemini Client] API key present:', !!GOOGLE_API_KEY);
console.log('[Gemini Client] API key length:', GOOGLE_API_KEY.length);
console.log('[Gemini Client] API key preview:', GOOGLE_API_KEY ? `${GOOGLE_API_KEY.substring(0, 10)}...` : 'NOT SET');

// Initialize Google Gemini client
export const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

console.log('[Gemini Client] ✅ GoogleGenerativeAI client initialized');

/**
 * AUDIO_TAG_MODEL
 * Used for: Adding ElevenLabs audio tags to narration text
 * Requirements: Fast, consistent, understands theatrical audio direction
 * Model: Gemini 2.5 Flash - Latest fast model for structured tagging
 */
export const AUDIO_TAG_MODEL = "gemini-2.5-flash";

/**
 * GEMINI_ENCOUNTER_MODEL
 * Used for: Creating individual encounters during gameplay
 * Requirements: Fast, creative, good instruction following
 * Model: Gemini 2.5 Flash - Latest fast model for gameplay generation
 */
export const GEMINI_ENCOUNTER_MODEL = "gemini-2.5-flash";

/**
 * GEMINI_MYTHOS_MODEL
 * Used for: Generating mythos card stories
 * Requirements: Fast, narrative consistency, horror atmosphere
 * Model: Gemini 2.5 Flash - Latest fast model for card generation
 */
export const GEMINI_MYTHOS_MODEL = "gemini-2.5-flash";

// Temperature settings for different generation types
export const ENCOUNTER_TEMPERATURE = 1.0; // Higher for more creative encounters
export const MYTHOS_TEMPERATURE = 1.0; // Higher for more varied mythos stories

