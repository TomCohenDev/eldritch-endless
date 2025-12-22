/**
 * Mythos Card Story Generation
 * 
 * Generates narrative/story for mythos cards using AI,
 * while preserving all game mechanics.
 */

import { anthropic, ENCOUNTER_GENERATION_MODEL } from './client';
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

export async function generateMythosStory(
  request: GenerateMythosRequest
): Promise<GenerateMythosResponse> {
  console.log('[Mythos Generation] Starting...');
  console.log('[Mythos Generation] Request:', {
    sessionId: request.sessionId,
    cardTitle: request.card.title,
    color: request.card.color,
    stage: request.stage,
  });

  const prompt = generateMythosPrompt(request);

  console.log('[Mythos Generation] Generated Prompt:');
  console.log(`[Mythos Generation] Prompt length: ${prompt.length} characters`);

  try {
    console.log(`[Mythos Generation] Calling Anthropic API with model: ${ENCOUNTER_GENERATION_MODEL}`);
    
    const startTime = Date.now();
    const msg = await anthropic.messages.create({
      model: ENCOUNTER_GENERATION_MODEL,
      max_tokens: 2048,
      temperature: 0.8, // Slightly higher for more creative storytelling
      system: `You are a JSON-only API. You must strictly respond with a valid JSON object matching the schema below. Do not include markdown formatting like \`\`\`json.
      
Schema:
${JSON.stringify(MYTHOS_JSON_SCHEMA, null, 2)}`,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });
    
    const duration = Date.now() - startTime;
    console.log(`[Mythos Generation] API call completed in ${duration}ms`);

    const content = msg.content[0].type === "text" ? msg.content[0].text : "";
    if (!content) {
      console.error('[Mythos Generation] Empty response from API');
      throw new Error("Empty response from AI");
    }

    console.log('[Mythos Generation] Raw AI Response:');
    console.log('--- RESPONSE START ---');
    console.log(content);
    console.log('--- RESPONSE END ---');

    const rawData = parseAndValidateResponse(content);
    console.log('[Mythos Generation] Parsed mythos data:', {
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
      },
      tensionChange: rawData.tensionChange,
      newPlotPoints: rawData.newPlotPoints,
    };

  } catch (error) {
    console.error('[Mythos Generation] ❌ Error:', error);
    throw error;
  }
}

function parseAndValidateResponse(jsonStr: string): any {
  console.log('[Mythos Generation] Parsing and validating response...');
  try {
    const cleanStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanStr);
    console.log('[Mythos Generation] JSON parsed successfully');
    return parsed;
  } catch (e) {
    console.error('[Mythos Generation] Failed to parse AI response JSON:', e);
    throw new Error("Invalid JSON response from AI");
  }
}

