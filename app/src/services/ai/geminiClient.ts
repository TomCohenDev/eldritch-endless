import { GoogleGenerativeAI } from "@google/generative-ai";

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";

// Initialize Google Gemini client
export const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

/**
 * AUDIO_TAG_MODEL
 * Used for: Adding ElevenLabs audio tags to narration text
 * Requirements: Fast, consistent, understands theatrical audio direction
 * Model: Gemini Flash 3 - Fast and efficient for structured tagging
 */
export const AUDIO_TAG_MODEL = "gemini-3-flash-preview";

/**
 * GEMINI_ENCOUNTER_MODEL
 * Used for: Creating individual encounters during gameplay
 * Requirements: Fast, creative, good instruction following
 * Model: Gemini 3.5 Flash - Fast and cost-effective for gameplay generation
 */
export const GEMINI_ENCOUNTER_MODEL = "gemini-3-flash-preview";

/**
 * GEMINI_MYTHOS_MODEL
 * Used for: Generating mythos card stories
 * Requirements: Fast, narrative consistency, horror atmosphere
 * Model: Gemini 3.5 Flash - Fast and cost-effective for card generation
 */
export const GEMINI_MYTHOS_MODEL = "gemini-3-flash-preview";

// Temperature settings for different generation types
export const ENCOUNTER_TEMPERATURE = 1.0; // Higher for more creative encounters
export const MYTHOS_TEMPERATURE = 1.0; // Higher for more varied mythos stories

