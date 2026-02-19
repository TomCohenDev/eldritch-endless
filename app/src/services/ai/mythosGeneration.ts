/**
 * Mythos Card Story Generation
 *
 * Generates narrative/story for mythos cards using AI,
 * while preserving all game mechanics.
 */

import { ollama, OLLAMA_MYTHOS_MODEL, MYTHOS_TEMPERATURE } from './ollamaClient';
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

async function generateMythosWithOllama(
  request: GenerateMythosRequest,
  recentDescriptions?: string[]
): Promise<GenerateMythosResponse> {
  console.log('='.repeat(80));
  console.log('[Mythos Generation - Ollama] STARTING MYTHOS GENERATION');
  console.log('='.repeat(80));
  console.log('[Mythos Generation - Ollama] Request:', {
    sessionId: request.sessionId,
    cardTitle: request.card.title,
    color: request.card.color,
    stage: request.stage,
    trait: request.card.trait,
  });
  console.log('[Mythos Generation - Ollama] Recent descriptions count:', recentDescriptions?.length || 0);

  const prompt = generateMythosPrompt(request, recentDescriptions);

  console.log('[Mythos Generation - Ollama] Prompt generated:');
  console.log('[Mythos Generation - Ollama] Prompt length:', prompt.length, 'characters');
  console.log('[Mythos Generation - Ollama] Prompt preview (first 500 chars):');
  console.log(prompt.substring(0, 500) + '...');

  try {
    console.log('[Mythos Generation - Ollama] Calling Ollama API...');
    console.log('[Mythos Generation - Ollama] Model:', OLLAMA_MYTHOS_MODEL);
    console.log('[Mythos Generation - Ollama] Temperature:', MYTHOS_TEMPERATURE);
    console.log('[Mythos Generation - Ollama] Using JSON format mode: YES');

    const startTime = Date.now();

    // Call Ollama with JSON format
    const response = await ollama.chat({
      model: OLLAMA_MYTHOS_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a JSON-only API for Eldritch Horror mythos card generation. Respond ONLY with valid JSON. Do not include markdown code blocks, just pure JSON. Keep responses concise.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      format: 'json',
      options: {
        temperature: MYTHOS_TEMPERATURE,
        num_predict: 2048, // Limit output tokens
      }
    });

    const duration = Date.now() - startTime;
    console.log(`[Mythos Generation - Ollama] API call completed in ${duration}ms`);

    const responseText = response.message.content;
    if (!responseText) {
      console.error('[Mythos Generation - Ollama] Empty response from API');
      throw new Error("Empty response from AI");
    }

    console.log('[Mythos Generation - Ollama] Response received:');
    console.log('[Mythos Generation - Ollama] Response length:', responseText.length, 'characters');
    console.log('[Mythos Generation - Ollama] Response preview (first 300 chars):');
    console.log(responseText.substring(0, 300) + '...');
    console.log('[Mythos Generation - Ollama] Response preview (last 200 chars):');
    console.log('...' + responseText.substring(Math.max(0, responseText.length - 200)));

    console.log('[Mythos Generation - Ollama] Parsing JSON...');
    const rawData = parseAndValidateResponse(responseText);
    console.log('[Mythos Generation - Ollama] JSON parsed successfully!');
    console.log('[Mythos Generation - Ollama] Mythos data:', {
      flavorLength: rawData.flavor?.length || 0,
      narrativeLength: rawData.narrative?.length || 0,
      tensionChange: rawData.tensionChange,
      newPlotPoints: rawData.newPlotPoints?.length || 0,
    });
    console.log('[Mythos Generation - Ollama] Flavor text:', rawData.flavor);

    console.log('='.repeat(80));
    console.log('[Mythos Generation - Ollama] SUCCESS - MYTHOS GENERATED');
    console.log('='.repeat(80));

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
    console.log('='.repeat(80));
    console.error('[Mythos Generation - Ollama] ERROR OCCURRED');
    console.log('='.repeat(80));
    console.error('[Mythos Generation - Ollama] Error type:', error instanceof Error ? error.name : typeof error);
    console.error('[Mythos Generation - Ollama] Error message:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('[Mythos Generation - Ollama] Stack trace:');
      console.error(error.stack);
    }
    console.log('='.repeat(80));
    throw error;
  }
}

/**
 * Generate mythos with streaming support (Ollama)
 * Streams the story text as it's generated
 */
export async function generateMythosWithStreamingGemini(
  request: GenerateMythosRequest,
  recentDescriptions?: string[],
  onStreamUpdate?: (partialStory: string) => void
): Promise<GenerateMythosResponse> {
  console.log('[Mythos Generation - Ollama Streaming] Starting...');

  const prompt = generateMythosPrompt(request, recentDescriptions);

  console.log('[Mythos Generation - Ollama Streaming] Prompt length:', prompt.length, 'characters');

  try {
    const startTime = Date.now();

    // Stream generation with Ollama
    const response = await ollama.chat({
      model: OLLAMA_MYTHOS_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a JSON-only API for Eldritch Horror mythos card generation. Respond ONLY with valid JSON. Do not include markdown code blocks, just pure JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      format: 'json',
      stream: true,
      options: {
        temperature: MYTHOS_TEMPERATURE,
      }
    });

    let accumulatedText = '';
    let lastStreamedFlavor = '';

    console.log('[Mythos Generation - Ollama Streaming] Starting stream...');

    for await (const chunk of response) {
      const chunkText = chunk.message.content;
      accumulatedText += chunkText;

      // Try to progressively extract and stream the flavor field from partial JSON
      const flavorMatch = accumulatedText.match(/"flavor"\s*:\s*"((?:[^"\\]|\\["\\nrt]|\\u[0-9a-fA-F]{4})*)"/);

      if (flavorMatch && flavorMatch[1]) {
        const rawFlavor = flavorMatch[1];
        // Unescape the flavor text
        const flavor = rawFlavor
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\t/g, '\t')
          .replace(/\\r/g, '\r')
          .replace(/\\\\/g, '\\');

        // Only update if we have new content
        if (flavor !== lastStreamedFlavor) {
          lastStreamedFlavor = flavor;
          onStreamUpdate?.(flavor);
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Mythos Generation - Ollama Streaming] Stream completed in ${duration}ms`);
    console.log('[Mythos Generation - Ollama Streaming] Total accumulated length:', accumulatedText.length);

    // Parse the complete JSON response
    if (!accumulatedText || accumulatedText.trim().length === 0) {
      throw new Error('No content received from streaming API');
    }

    console.log('[Mythos Generation - Ollama Streaming] Parsing final JSON...');
    const rawData = parseAndValidateResponse(accumulatedText);

    console.log('[Mythos Generation - Ollama Streaming] Success');

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
    console.error('[Mythos Generation - Ollama Streaming] Error:', error);
    console.error('[Mythos Generation - Ollama Streaming] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export async function generateMythosStory(
  request: GenerateMythosRequest,
  recentDescriptions?: string[]
): Promise<GenerateMythosResponse> {
  console.log('[AI Service] generateMythosStory wrapper called');
  console.log('[AI Service] Delegating to generateMythosWithOllama...');

  try {
    const result = await generateMythosWithOllama(request, recentDescriptions);
    console.log('[AI Service] generateMythosWithOllama completed successfully');
    return result;
  } catch (error) {
    console.error('[AI Service] generateMythosWithOllama failed:', error);
    throw error;
  }
}

function parseAndValidateResponse(jsonStr: string): any {
  console.log('[Mythos Generation] Parsing and validating response...');
  console.log('[Mythos Generation] Raw string length:', jsonStr.length);

  try {
    // Check for markdown code blocks
    const hasMarkdown = jsonStr.includes('```');
    console.log('[Mythos Generation] Contains markdown code blocks:', hasMarkdown);

    const cleanStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
    console.log('[Mythos Generation] Cleaned string length:', cleanStr.length);

    if (hasMarkdown) {
      console.log('[Mythos Generation] Cleaned preview (first 200 chars):');
      console.log(cleanStr.substring(0, 200) + '...');
    }

    console.log('[Mythos Generation] Attempting JSON.parse...');
    const parsed = JSON.parse(cleanStr);
    console.log('[Mythos Generation] JSON.parse successful!');
    console.log('[Mythos Generation] Parsed object keys:', Object.keys(parsed).join(', '));

    // Validate structure
    if (!parsed.flavor && !parsed.narrative) {
      console.error('[Mythos Generation] Missing both "flavor" and "narrative" fields');
      throw new Error('Response missing required text fields');
    }
    console.log('[Mythos Generation] Structure validation passed');

    return parsed;
  } catch (e) {
    console.log('-'.repeat(80));
    console.error('[Mythos Generation] JSON PARSE FAILED');
    console.log('-'.repeat(80));
    console.error('[Mythos Generation] Error type:', e instanceof Error ? e.name : typeof e);
    console.error('[Mythos Generation] Error message:', e instanceof Error ? e.message : String(e));
    console.error('[Mythos Generation] Raw JSON preview (first 500 chars):');
    console.error(jsonStr.substring(0, 500));
    console.error('[Mythos Generation] Raw JSON preview (last 500 chars):');
    console.error('...' + jsonStr.substring(Math.max(0, jsonStr.length - 500)));
    console.log('-'.repeat(80));
    throw new Error("Invalid JSON response from AI: " + (e instanceof Error ? e.message : String(e)));
  }
}
