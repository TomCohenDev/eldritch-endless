/**
 * Mythos Card Story Generation
 * 
 * Generates narrative/story for mythos cards using AI,
 * while preserving all game mechanics.
 */

import { anthropic, ENCOUNTER_GENERATION_MODEL } from './client';
import { genAI, GEMINI_MYTHOS_MODEL, MYTHOS_TEMPERATURE } from './geminiClient';
import { generateMythosPrompt } from './prompts/mythos';
import type { GenerateMythosRequest, GenerateMythosResponse } from '../../types';

const MYTHOS_JSON_SCHEMA = {
  type: "object",
  properties: {
    flavor: { type: "string" },
    narrative: { type: "string" },
    tensionChange: { type: "number" },
    newPlotPoints: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["flavor", "narrative"]
};

async function generateMythosWithGemini(
  request: GenerateMythosRequest,
  recentDescriptions?: string[]
): Promise<GenerateMythosResponse> {
  console.log('[Mythos Generation - Gemini] Starting...');
  console.log('[Mythos Generation - Gemini] Request Summary:', {
    sessionId: request.sessionId,
    cardTitle: request.card.title,
    color: request.card.color,
    stage: request.stage,
  });

  const prompt = generateMythosPrompt(request, recentDescriptions);

  console.log('[Mythos Generation - Gemini] Generated Prompt:');
  console.log(`[Mythos Generation - Gemini] Prompt length: ${prompt.length} characters`);

  try {
    console.log(`[Mythos Generation - Gemini] Calling Gemini API with model: ${GEMINI_MYTHOS_MODEL}`);

    const startTime = Date.now();

    // Initialize Gemini model with JSON schema
    const model = genAI.getGenerativeModel({
      model: GEMINI_MYTHOS_MODEL,
      generationConfig: {
        temperature: MYTHOS_TEMPERATURE,
        responseMimeType: "application/json",
        responseSchema: MYTHOS_JSON_SCHEMA
      },
      systemInstruction: "You are a JSON-only API for Eldritch Horror mythos card generation. Respond ONLY with valid JSON."
    });

    // Generate content
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const duration = Date.now() - startTime;
    console.log(`[Mythos Generation - Gemini] API call completed in ${duration}ms`);

    const responseText = result.response.text();
    if (!responseText) {
      console.error('[Mythos Generation - Gemini] Empty response from API');
      throw new Error("Empty response from AI");
    }

    console.log('[Mythos Generation - Gemini] Response length:', responseText.length, 'characters');

    const rawData = parseAndValidateResponse(responseText);
    console.log('[Mythos Generation - Gemini] Parsed mythos data:', {
      flavorLength: rawData.flavor?.length || 0,
      narrativeLength: rawData.narrative?.length || 0,
      tensionChange: rawData.tensionChange,
      newPlotPoints: rawData.newPlotPoints?.length || 0,
    });

    return {
      card: {
        title: request.card.title,
        color: request.card.color!,
        stage: request.stage,
        trait: request.card.trait || 'Event',
        difficulty: request.card.difficulty || 'Normal',
        effect: request.card.effect || '',
        reckoning: request.card.reckoning,
        flavor: rawData.flavor,
        narrative: rawData.narrative,
        testSkill: request.card.testSkill,
        icons: request.card.icons,
      },
      tensionChange: rawData.tensionChange,
      newPlotPoints: rawData.newPlotPoints,
    };

  } catch (error) {
    console.error('[Mythos Generation - Gemini] ❌ Error:', error);
    throw error;
  }
}

/**
 * Generate mythos with streaming support (Gemini)
 * Streams the story text as it's generated
 */
export async function generateMythosWithStreamingGemini(
  request: GenerateMythosRequest,
  recentDescriptions?: string[],
  onStreamUpdate?: (partialStory: string) => void
): Promise<GenerateMythosResponse> {
  console.log('[Mythos Generation - Gemini Streaming] Starting...');

  const prompt = generateMythosPrompt(request, recentDescriptions);

  console.log('[Mythos Generation - Gemini Streaming] Prompt length:', prompt.length, 'characters');

  try {
    const startTime = Date.now();

    // Initialize Gemini model with JSON schema
    const model = genAI.getGenerativeModel({
      model: GEMINI_MYTHOS_MODEL,
      generationConfig: {
        temperature: MYTHOS_TEMPERATURE,
        responseMimeType: "application/json",
        responseSchema: MYTHOS_JSON_SCHEMA
      },
      systemInstruction: "You are a JSON-only API for Eldritch Horror mythos card generation. Respond ONLY with valid JSON."
    });

    // Stream generation
    const result = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    let accumulatedText = '';
    let lastValidJson: any = null;

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      accumulatedText += chunkText;

      // Try to parse and extract story for streaming
      try {
        const partialJson = JSON.parse(accumulatedText);

        if (partialJson.flavor) {
          onStreamUpdate?.(partialJson.flavor);
        }

        lastValidJson = partialJson;
      } catch (e) {
        // Try to extract flavor text from partial JSON
        const flavorMatch = accumulatedText.match(/"flavor":\s*"([^"]+)"/);
        if (flavorMatch) {
          onStreamUpdate?.(flavorMatch[1].replace(/\\n/g, '\n'));
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Mythos Generation - Gemini Streaming] Completed in ${duration}ms`);

    const rawData = lastValidJson || JSON.parse(accumulatedText);

    return {
      card: {
        title: request.card.title,
        color: request.card.color!,
        stage: request.stage,
        trait: request.card.trait || 'Event',
        difficulty: request.card.difficulty || 'Normal',
        effect: request.card.effect || '',
        reckoning: request.card.reckoning,
        flavor: rawData.flavor,
        narrative: rawData.narrative,
        testSkill: request.card.testSkill,
        icons: request.card.icons,
      },
      tensionChange: rawData.tensionChange,
      newPlotPoints: rawData.newPlotPoints,
    };

  } catch (error) {
    console.error('[Mythos Generation - Gemini Streaming] ❌ Error:', error);
    throw error;
  }
}

export async function generateMythosStory(
  request: GenerateMythosRequest,
  recentDescriptions?: string[]
): Promise<GenerateMythosResponse> {
  // Use Gemini for mythos generation (non-streaming by default)
  return await generateMythosWithGemini(request, recentDescriptions);
}

function parseAndValidateResponse(jsonStr: string): any {
  console.log('[Mythos Generation] Parsing and validating response...');
  console.log('[Mythos Generation] Raw JSON string length:', jsonStr.length);
  console.log('[Mythos Generation] Raw JSON string (first 500 chars):', jsonStr.substring(0, 500));
  
  try {
    const cleanStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
    console.log('[Mythos Generation] Cleaned JSON string length:', cleanStr.length);
    const parsed = JSON.parse(cleanStr);
    console.log('[Mythos Generation] JSON parsed successfully');
    console.log('[Mythos Generation] Parsed object:', JSON.stringify(parsed, null, 2));
    return parsed;
  } catch (e) {
    console.error('[Mythos Generation] Failed to parse AI response JSON:', e);
    throw new Error("Invalid JSON response from AI");
  }
}

