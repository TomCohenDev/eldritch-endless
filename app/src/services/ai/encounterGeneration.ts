import { anthropic, ENCOUNTER_GENERATION_MODEL } from "./client";
import { genAI, GEMINI_ENCOUNTER_MODEL, ENCOUNTER_TEMPERATURE } from "./geminiClient";
import { generateEncounterPrompt } from "./prompts/encounter";
import { selectEncounterCards } from "./encounterSelection";
import type { GenerateEncounterRequest, GenerateEncounterResponse, EncounterNode } from "../../types";

const ENCOUNTER_JSON_SCHEMA = {
  type: "object",
  properties: {
    encounter: {
      type: "object",
      properties: {
        title: { type: "string" },
        narrative: { type: "string" },
        startingNodeId: { type: "string" }
      },
      required: ["title", "narrative", "startingNodeId"]
    },
    nodes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          type: { type: "string", enum: ["decision", "test", "outcome", "narrative"] },
          choices: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                label: { type: "string" },
                description: { type: "string" },
                nextNodeId: { type: "string" }
              },
              required: ["id", "label", "nextNodeId"]
            }
          },
          test: {
            type: "object",
            properties: {
              skill: { type: "string" },
              difficulty: { type: "number" },
              passNodeId: { type: "string" },
              failNodeId: { type: "string" },
              modifiers: { type: "array", items: { type: "string" } }
            }
          },
          effects: {
            type: "object",
            properties: {
              cluesGained: { type: "number" },
              sanityChange: { type: "number" },
              healthChange: { type: "number" },
              doomChange: { type: "number" },
              assetsGained: { type: "array", items: { type: "string" } },
              assetsLost: { type: "array", items: { type: "string" } },
              conditionsGained: { type: "array", items: { type: "string" } }
            }
          },
          effectDescription: { type: "string" },
          nextNodeId: { type: "string" }
        },
        required: ["id", "text", "type"]
      }
    },
    tensionChange: { type: "number" },
    newPlotPoints: { type: "array", items: { type: "string" } }
  },
  required: ["encounter", "nodes"]
};

async function generateEncounterWithGemini(request: GenerateEncounterRequest, recentDescriptions?: string[]): Promise<GenerateEncounterResponse> {
  console.log('='.repeat(80));
  console.log('[AI Encounter Generation - Gemini] 🎲 STARTING ENCOUNTER GENERATION');
  console.log('='.repeat(80));
  console.log('[AI Encounter Generation - Gemini] Request:', {
    sessionId: request.sessionId,
    encounterType: request.encounterType,
    subType: request.subType,
    investigator: request.investigator.investigatorName,
    location: request.investigator.location,
  });
  console.log('[AI Encounter Generation - Gemini] Recent descriptions count:', recentDescriptions?.length || 0);

  // Select encounter cards from JSON files (same logic as Claude version)
  console.log('[AI Encounter Generation - Gemini] Selecting encounter cards...');

  let spaceType: 'City' | 'Wilderness' | 'Sea' | undefined = request.subType as 'City' | 'Wilderness' | 'Sea' | undefined;
  if (request.encounterType === 'research') {
    const { getLocationContext } = await import('../../data/encounterContextLoader');
    const locationInfo = getLocationContext(request.investigator.location);
    spaceType = locationInfo.locationType === 'city' ? 'City'
      : locationInfo.locationType === 'sea' ? 'Sea'
      : 'Wilderness';
    console.log('[AI Encounter Generation - Gemini] Research encounter - determined space type:', spaceType);
  }

  const otherWorldName = request.encounterType === 'other_world' ? request.subType : undefined;

  const { cards, metadata } = await selectEncounterCards({
    encounterType: request.encounterType,
    location: request.investigator.location,
    spaceType: request.encounterType === 'other_world' ? undefined : spaceType,
    otherWorld: otherWorldName,
    ancientOne: request.gameContext?.ancientOneName,
  });

  console.log('[AI Encounter Generation - Gemini] Selected cards:', {
    count: cards.length,
    metadata: metadata,
  });

  if (cards.length === 0 && metadata.rules_only) {
    throw new Error('Combat and defeated encounters are not yet implemented');
  }

  if (cards.length === 0) {
    throw new Error('No encounter cards found for the given context');
  }

  const prompt = generateEncounterPrompt(request, cards, metadata, recentDescriptions);

  console.log('[AI Encounter Generation - Gemini] 📝 Prompt generated:');
  console.log(`[AI Encounter Generation - Gemini] Prompt length: ${prompt.length} characters`);
  console.log('[AI Encounter Generation - Gemini] Prompt preview (first 500 chars):');
  console.log(prompt.substring(0, 500) + '...');

  try {
    console.log('[AI Encounter Generation - Gemini] 🚀 Calling Gemini API...');
    console.log('[AI Encounter Generation - Gemini] Model:', GEMINI_ENCOUNTER_MODEL);
    console.log('[AI Encounter Generation - Gemini] Temperature:', ENCOUNTER_TEMPERATURE);
    console.log('[AI Encounter Generation - Gemini] Using JSON schema mode: YES');

    const startTime = Date.now();

    // Initialize Gemini model WITHOUT JSON schema (text mode to avoid loops)
    const model = genAI.getGenerativeModel({
      model: GEMINI_ENCOUNTER_MODEL,
      generationConfig: {
        temperature: ENCOUNTER_TEMPERATURE,
        maxOutputTokens: 4096, // Limit output to prevent infinite loops
      },
      systemInstruction: "You are a JSON-only API for Eldritch Horror encounter generation. Respond ONLY with valid JSON. Do not include markdown code blocks, just pure JSON. Keep responses concise."
    });

    console.log('[AI Encounter Generation - Gemini] Max output tokens:', 4096);

    // Generate content
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const duration = Date.now() - startTime;
    console.log(`[AI Encounter Generation - Gemini] ⏱️  API call completed in ${duration}ms`);

    const responseText = result.response.text();
    if (!responseText) {
      console.error('[AI Encounter Generation - Gemini] ❌ Empty response from API');
      throw new Error("Empty response from AI");
    }

    console.log('[AI Encounter Generation - Gemini] 📥 Response received:');
    console.log('[AI Encounter Generation - Gemini] Response length:', responseText.length, 'characters');
    console.log('[AI Encounter Generation - Gemini] Response preview (first 300 chars):');
    console.log(responseText.substring(0, 300) + '...');
    console.log('[AI Encounter Generation - Gemini] Response preview (last 200 chars):');
    console.log('...' + responseText.substring(Math.max(0, responseText.length - 200)));

    console.log('[AI Encounter Generation - Gemini] 🔍 Parsing JSON...');
    const rawData = parseAndValidateResponse(responseText);
    console.log('[AI Encounter Generation - Gemini] ✅ JSON parsed successfully!');
    console.log('[AI Encounter Generation - Gemini] Encounter data:', {
      title: rawData.encounter.title,
      narrativeLength: rawData.encounter.narrative?.length || 0,
      startingNodeId: rawData.encounter.startingNodeId,
      nodesCount: rawData.nodes.length,
      tensionChange: rawData.tensionChange,
      newPlotPoints: rawData.newPlotPoints?.length || 0,
    });
    console.log('[AI Encounter Generation - Gemini] Node types:', rawData.nodes.map((n: any) => `${n.id}:${n.type}`).join(', '));

    // Transform raw nodes array to Record<string, EncounterNode> for frontend compatibility
    const nodesRecord: Record<string, EncounterNode> = {};
    rawData.nodes.forEach((node: any) => {
      const transformedNode: EncounterNode = {
        id: node.id,
        type: node.type,
        content: node.text,
        testInfo: node.test ? {
            skill: node.test.skill,
            difficulty: node.test.difficulty,
            modifiers: node.test.modifiers
        } : undefined,
        choices: node.choices,
        outcome: node.effects ? {
            success: true,
            effects: {
                health: node.effects.healthChange,
                sanity: node.effects.sanityChange,
                clues: node.effects.cluesGained,
                doom: node.effects.doomChange,
                assets: node.effects.assetsGained,
                assetsLost: node.effects.assetsLost || [],
                conditions: node.effects.conditionsGained
            },
            effectDescription: node.effectDescription || undefined
        } : undefined,
        nextNodeId: node.nextNodeId,
        passNodeId: node.test?.passNodeId,
        failNodeId: node.test?.failNodeId,
      };

      if (node.type === 'outcome' && transformedNode.outcome) {
          transformedNode.outcome.success = !node.id.toLowerCase().includes('fail');
      }

      nodesRecord[node.id] = transformedNode;
    });

    console.log('[AI Encounter Generation - Gemini] 🔄 Transforming nodes...');
    console.log('[AI Encounter Generation - Gemini] Transformed', Object.keys(nodesRecord).length, 'nodes');

    console.log('='.repeat(80));
    console.log('[AI Encounter Generation - Gemini] ✅ SUCCESS - ENCOUNTER GENERATED');
    console.log('='.repeat(80));

    return {
      encounter: {
        title: rawData.encounter.title,
        startingNodeId: rawData.encounter.startingNodeId,
        nodes: nodesRecord
      },
      tensionChange: rawData.tensionChange,
      newPlotPoints: rawData.newPlotPoints
    };

  } catch (error) {
    console.log('='.repeat(80));
    console.error('[AI Encounter Generation - Gemini] ❌ ERROR OCCURRED');
    console.log('='.repeat(80));
    console.error('[AI Encounter Generation - Gemini] Error type:', error instanceof Error ? error.name : typeof error);
    console.error('[AI Encounter Generation - Gemini] Error message:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('[AI Encounter Generation - Gemini] Stack trace:');
      console.error(error.stack);
    }
    console.log('='.repeat(80));
    throw error;
  }
}

/**
 * Generate encounter with streaming support (Gemini)
 * Streams the narrative text as it's generated
 * NOTE: Uses text mode instead of JSON mode for more reliable streaming
 */
export async function generateEncounterWithStreamingGemini(
  request: GenerateEncounterRequest,
  recentDescriptions?: string[],
  onStreamUpdate?: (partialText: string) => void
): Promise<GenerateEncounterResponse> {
  console.log('[AI Encounter Generation - Gemini Streaming] Starting...');

  // Card selection and prompt generation (same as non-streaming)
  let spaceType: 'City' | 'Wilderness' | 'Sea' | undefined = request.subType as 'City' | 'Wilderness' | 'Sea' | undefined;
  if (request.encounterType === 'research') {
    const { getLocationContext } = await import('../../data/encounterContextLoader');
    const locationInfo = getLocationContext(request.investigator.location);
    spaceType = locationInfo.locationType === 'city' ? 'City'
      : locationInfo.locationType === 'sea' ? 'Sea'
      : 'Wilderness';
  }

  const otherWorldName = request.encounterType === 'other_world' ? request.subType : undefined;

  const { cards, metadata } = await selectEncounterCards({
    encounterType: request.encounterType,
    location: request.investigator.location,
    spaceType: request.encounterType === 'other_world' ? undefined : spaceType,
    otherWorld: otherWorldName,
    ancientOne: request.gameContext?.ancientOneName,
  });

  if (cards.length === 0) {
    throw new Error('No encounter cards found for the given context');
  }

  const prompt = generateEncounterPrompt(request, cards, metadata, recentDescriptions);

  console.log('[AI Encounter Generation - Gemini Streaming] Prompt length:', prompt.length, 'characters');

  try {
    const startTime = Date.now();

    // Initialize Gemini model WITHOUT JSON schema (text mode for better streaming)
    const model = genAI.getGenerativeModel({
      model: GEMINI_ENCOUNTER_MODEL,
      generationConfig: {
        temperature: ENCOUNTER_TEMPERATURE,
      },
      systemInstruction: "You are a JSON-only API for Eldritch Horror encounter generation. Respond ONLY with valid JSON matching the schema. Do not include markdown code blocks, just pure JSON."
    });

    // Stream generation
    const result = await model.generateContentStream({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    let accumulatedText = '';
    let lastStreamedNarrative = '';

    console.log('[AI Encounter Generation - Gemini Streaming] Starting stream...');

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      accumulatedText += chunkText;

      // Try to progressively extract and stream the narrative field from partial JSON
      // Use a more forgiving regex that can match incomplete JSON
      const narrativeMatch = accumulatedText.match(/"narrative"\s*:\s*"((?:[^"\\]|\\["\\nrt]|\\u[0-9a-fA-F]{4})*)"/);

      if (narrativeMatch && narrativeMatch[1]) {
        const rawNarrative = narrativeMatch[1];
        // Unescape the narrative text
        const narrative = rawNarrative
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\t/g, '\t')
          .replace(/\\r/g, '\r')
          .replace(/\\\\/g, '\\');

        // Only update if we have new content
        if (narrative !== lastStreamedNarrative) {
          lastStreamedNarrative = narrative;
          onStreamUpdate?.(narrative);
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[AI Encounter Generation - Gemini Streaming] Stream completed in ${duration}ms`);
    console.log('[AI Encounter Generation - Gemini Streaming] Total accumulated length:', accumulatedText.length);

    // Parse the complete JSON response
    if (!accumulatedText || accumulatedText.trim().length === 0) {
      throw new Error('No content received from streaming API');
    }

    console.log('[AI Encounter Generation - Gemini Streaming] Parsing final JSON...');
    const rawData = parseAndValidateResponse(accumulatedText);

    console.log('[AI Encounter Generation - Gemini Streaming] Successfully parsed:', {
      title: rawData.encounter?.title,
      nodesCount: rawData.nodes?.length,
    });

    // Transform nodes (same as non-streaming)
    const nodesRecord: Record<string, EncounterNode> = {};
    rawData.nodes.forEach((node: any) => {
      const transformedNode: EncounterNode = {
        id: node.id,
        type: node.type,
        content: node.text,
        testInfo: node.test ? {
            skill: node.test.skill,
            difficulty: node.test.difficulty,
            modifiers: node.test.modifiers
        } : undefined,
        choices: node.choices,
        outcome: node.effects ? {
            success: true,
            effects: {
                health: node.effects.healthChange,
                sanity: node.effects.sanityChange,
                clues: node.effects.cluesGained,
                doom: node.effects.doomChange,
                assets: node.effects.assetsGained,
                assetsLost: node.effects.assetsLost || [],
                conditions: node.effects.conditionsGained
            },
            effectDescription: node.effectDescription || undefined
        } : undefined,
        nextNodeId: node.nextNodeId,
        passNodeId: node.test?.passNodeId,
        failNodeId: node.test?.failNodeId,
      };

      if (node.type === 'outcome' && transformedNode.outcome) {
          transformedNode.outcome.success = !node.id.toLowerCase().includes('fail');
      }

      nodesRecord[node.id] = transformedNode;
    });

    console.log('[AI Encounter Generation - Gemini Streaming] ✅ Success');

    return {
      encounter: {
        title: rawData.encounter.title,
        startingNodeId: rawData.encounter.startingNodeId,
        nodes: nodesRecord
      },
      tensionChange: rawData.tensionChange,
      newPlotPoints: rawData.newPlotPoints
    };

  } catch (error) {
    console.error('[AI Encounter Generation - Gemini Streaming] ❌ Error:', error);
    console.error('[AI Encounter Generation - Gemini Streaming] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

export async function generateEncounterWithAI(request: GenerateEncounterRequest, recentDescriptions?: string[]): Promise<GenerateEncounterResponse> {
  console.log('🔀 [AI Service] generateEncounterWithAI wrapper called');
  console.log('[AI Service] Delegating to generateEncounterWithGemini...');

  try {
    const result = await generateEncounterWithGemini(request, recentDescriptions);
    console.log('[AI Service] ✅ generateEncounterWithGemini completed successfully');
    return result;
  } catch (error) {
    console.error('[AI Service] ❌ generateEncounterWithGemini failed:', error);
    throw error;
  }
}

function parseAndValidateResponse(jsonStr: string): any {
  console.log('[AI Encounter Generation] 🔧 Parsing and validating response...');
  console.log('[AI Encounter Generation] Raw string length:', jsonStr.length);

  try {
    // Check for markdown code blocks
    const hasMarkdown = jsonStr.includes('```');
    console.log('[AI Encounter Generation] Contains markdown code blocks:', hasMarkdown);

    const cleanStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
    console.log('[AI Encounter Generation] Cleaned string length:', cleanStr.length);

    if (hasMarkdown) {
      console.log('[AI Encounter Generation] Cleaned preview (first 200 chars):');
      console.log(cleanStr.substring(0, 200) + '...');
    }

    console.log('[AI Encounter Generation] Attempting JSON.parse...');
    const parsed = JSON.parse(cleanStr);
    console.log('[AI Encounter Generation] ✅ JSON.parse successful!');
    console.log('[AI Encounter Generation] Parsed object keys:', Object.keys(parsed).join(', '));

    // Validate structure
    if (!parsed.encounter) {
      console.error('[AI Encounter Generation] ❌ Missing "encounter" field');
      throw new Error('Response missing "encounter" field');
    }
    if (!parsed.nodes) {
      console.error('[AI Encounter Generation] ❌ Missing "nodes" field');
      throw new Error('Response missing "nodes" field');
    }
    console.log('[AI Encounter Generation] ✅ Structure validation passed');

    return parsed;
  } catch (e) {
    console.log('-'.repeat(80));
    console.error('[AI Encounter Generation] ❌ JSON PARSE FAILED');
    console.log('-'.repeat(80));
    console.error('[AI Encounter Generation] Error type:', e instanceof Error ? e.name : typeof e);
    console.error('[AI Encounter Generation] Error message:', e instanceof Error ? e.message : String(e));
    console.error('[AI Encounter Generation] Raw JSON preview (first 500 chars):');
    console.error(jsonStr.substring(0, 500));
    console.error('[AI Encounter Generation] Raw JSON preview (last 500 chars):');
    console.error('...' + jsonStr.substring(Math.max(0, jsonStr.length - 500)));
    console.log('-'.repeat(80));
    throw new Error("Invalid JSON response from AI: " + (e instanceof Error ? e.message : String(e)));
  }
}

