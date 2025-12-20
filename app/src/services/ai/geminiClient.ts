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

