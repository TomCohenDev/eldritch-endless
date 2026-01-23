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
  console.log('[AI Encounter Generation - Gemini] Starting...');
  console.log('[AI Encounter Generation - Gemini] Request:', {
    sessionId: request.sessionId,
    encounterType: request.encounterType,
    subType: request.subType,
    investigator: request.investigator.investigatorName,
    location: request.investigator.location,
  });

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

  console.log('[AI Encounter Generation - Gemini] Generated Prompt:');
  console.log(`[AI Encounter Generation - Gemini] Prompt length: ${prompt.length} characters`);

  try {
    console.log(`[AI Encounter Generation - Gemini] Calling Gemini API with model: ${GEMINI_ENCOUNTER_MODEL}`);
    console.log('[AI Encounter Generation - Gemini] API Config:', {
      model: GEMINI_ENCOUNTER_MODEL,
      temperature: ENCOUNTER_TEMPERATURE,
    });

    const startTime = Date.now();

    // Initialize Gemini model with JSON schema
    const model = genAI.getGenerativeModel({
      model: GEMINI_ENCOUNTER_MODEL,
      generationConfig: {
        temperature: ENCOUNTER_TEMPERATURE,
        responseMimeType: "application/json",
        responseSchema: ENCOUNTER_JSON_SCHEMA
      },
      systemInstruction: "You are a JSON-only API for Eldritch Horror encounter generation. Respond ONLY with valid JSON matching the schema."
    });

    // Generate content
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    const duration = Date.now() - startTime;
    console.log(`[AI Encounter Generation - Gemini] API call completed in ${duration}ms`);

    const responseText = result.response.text();
    if (!responseText) {
      console.error('[AI Encounter Generation - Gemini] Empty response from API');
      throw new Error("Empty response from AI");
    }

    console.log('[AI Encounter Generation - Gemini] Response length:', responseText.length, 'characters');

    const rawData = parseAndValidateResponse(responseText);
    console.log('[AI Encounter Generation - Gemini] Parsed encounter data:', {
      title: rawData.encounter.title,
      startingNodeId: rawData.encounter.startingNodeId,
      nodesCount: rawData.nodes.length,
      tensionChange: rawData.tensionChange,
      newPlotPoints: rawData.newPlotPoints?.length || 0,
    });

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

    console.log('[AI Encounter Generation - Gemini] ✅ Success');

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
    console.error('[AI Encounter Generation - Gemini] ❌ Error:', error);
    console.error('[AI Encounter Generation - Gemini] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Generate encounter with streaming support (Gemini)
 * Streams the narrative text as it's generated
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

    // Initialize Gemini model with JSON schema
    const model = genAI.getGenerativeModel({
      model: GEMINI_ENCOUNTER_MODEL,
      generationConfig: {
        temperature: ENCOUNTER_TEMPERATURE,
        responseMimeType: "application/json",
        responseSchema: ENCOUNTER_JSON_SCHEMA
      },
      systemInstruction: "You are a JSON-only API for Eldritch Horror encounter generation. Respond ONLY with valid JSON matching the schema."
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

      // Try to parse partial JSON for streaming updates
      try {
        const partialJson = JSON.parse(accumulatedText);

        // Stream narrative text if available
        if (partialJson.encounter?.narrative) {
          onStreamUpdate?.(partialJson.encounter.narrative);
        }

        // Also try to stream first node text if available
        if (partialJson.nodes?.[0]?.text) {
          const fullText = `${partialJson.encounter?.narrative || ''}\n\n${partialJson.nodes[0].text}`;
          onStreamUpdate?.(fullText);
        }

        lastValidJson = partialJson;
      } catch (e) {
        // Partial JSON not yet valid, try to extract narrative preview
        const narrativeMatch = accumulatedText.match(/"narrative":\s*"([^"]+)"/);
        if (narrativeMatch) {
          onStreamUpdate?.(narrativeMatch[1].replace(/\\n/g, '\n'));
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[AI Encounter Generation - Gemini Streaming] Completed in ${duration}ms`);

    // Final parse with complete JSON
    const rawData = lastValidJson || JSON.parse(accumulatedText);

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
    throw error;
  }
}

export async function generateEncounterWithAI(request: GenerateEncounterRequest, recentDescriptions?: string[]): Promise<GenerateEncounterResponse> {
  // Use Gemini for encounter generation (non-streaming by default)
  return await generateEncounterWithGemini(request, recentDescriptions);
}

function parseAndValidateResponse(jsonStr: string): any {
  console.log('[AI Encounter Generation] Parsing and validating response...');
  try {
    const cleanStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
    console.log('[AI Encounter Generation] Cleaned JSON string length:', cleanStr.length);
    
    const parsed = JSON.parse(cleanStr);
    console.log('[AI Encounter Generation] JSON parsed successfully');
    
    return parsed;
  } catch (e) {
    console.error('[AI Encounter Generation] Failed to parse AI response JSON:', e);
    console.error('[AI Encounter Generation] Parse error details:', {
      message: e instanceof Error ? e.message : String(e),
      jsonPreview: jsonStr.substring(0, 200) + '...',
    });
    throw new Error("Invalid JSON response from AI");
  }
}

