import { anthropic, ENCOUNTER_GENERATION_MODEL } from "./client";
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
              conditionsGained: { type: "array", items: { type: "string" } }
            }
          },
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

export async function generateEncounterWithAI(request: GenerateEncounterRequest): Promise<GenerateEncounterResponse> {
  console.log('[AI Encounter Generation] Starting...');
  console.log('[AI Encounter Generation] Request:', {
    sessionId: request.sessionId,
    encounterType: request.encounterType,
    subType: request.subType,
    investigator: request.investigator.investigatorName,
    location: request.investigator.location,
  });
  
  // Select encounter cards from JSON files
  console.log('[AI Encounter Generation] Selecting encounter cards...');
  const { cards, metadata } = await selectEncounterCards({
    encounterType: request.encounterType,
    location: request.investigator.location,
    spaceType: request.subType as 'City' | 'Wilderness' | 'Sea',
    otherWorld: request.subType, // For other_world encounters
    ancientOne: request.gameContext?.ancientOneName,
  });
  
  console.log('[AI Encounter Generation] Selected cards:', {
    count: cards.length,
    metadata: metadata,
  });
  
  if (cards.length === 0 && metadata.rules_only) {
    console.log('[AI Encounter Generation] Rules-only encounter type (combat/defeated), no generation needed');
    throw new Error('Combat and defeated encounters are not yet implemented');
  }
  
  if (cards.length === 0) {
    console.error('[AI Encounter Generation] No cards found for:', {
      encounterType: request.encounterType,
      location: request.investigator.location,
      spaceType: request.subType,
    });
    throw new Error('No encounter cards found for the given context');
  }
  
  const prompt = generateEncounterPrompt(request, cards, metadata);
  
  console.log('[AI Encounter Generation] Generated Prompt:');
  console.log('--- PROMPT START ---');
  console.log(prompt);
  console.log('--- PROMPT END ---');
  console.log(`[AI Encounter Generation] Prompt length: ${prompt.length} characters`);

  try {
    console.log(`[AI Encounter Generation] Calling Anthropic API with model: ${ENCOUNTER_GENERATION_MODEL}`);
    console.log('[AI Encounter Generation] API Config:', {
      model: ENCOUNTER_GENERATION_MODEL,
      max_tokens: 4096,
      temperature: 0.7,
    });
    
    const startTime = Date.now();
    const msg = await anthropic.messages.create({
      model: ENCOUNTER_GENERATION_MODEL,
      max_tokens: 4096,
      temperature: 0.7,
      system: `You are a JSON-only API. You must strictly respond with a valid JSON object matching the schema below. Do not include markdown formatting like \`\`\`json.
      
Schema:
${JSON.stringify(ENCOUNTER_JSON_SCHEMA, null, 2)}`,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });
    
    const duration = Date.now() - startTime;
    console.log(`[AI Encounter Generation] API call completed in ${duration}ms`);
    console.log('[AI Encounter Generation] API Response:', {
      id: msg.id,
      model: msg.model,
      role: msg.role,
      stop_reason: msg.stop_reason,
      usage: msg.usage,
    });

    const content = msg.content[0].type === "text" ? msg.content[0].text : "";
    if (!content) {
      console.error('[AI Encounter Generation] Empty response from API');
      throw new Error("Empty response from AI");
    }

    console.log('[AI Encounter Generation] Raw AI Response:');
    console.log('--- RESPONSE START ---');
    console.log(content);
    console.log('--- RESPONSE END ---');
    console.log(`[AI Encounter Generation] Response length: ${content.length} characters`);

    const rawData = parseAndValidateResponse(content);
    console.log('[AI Encounter Generation] Parsed encounter data:', {
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
        content: node.text, // Map text to content
        // Map test info
        testInfo: node.test ? {
            skill: node.test.skill,
            difficulty: node.test.difficulty,
            modifiers: node.test.modifiers
        } : undefined,
        // Map choices
        choices: node.choices,
        // Map outcome
        outcome: node.effects ? {
            success: true, // This is a bit ambiguous for general nodes, but usually outcomes are distinct. 
                          // However, the frontend type EncounterNode expects 'outcome' with 'success' boolean.
                          // 'outcome' nodes in the prompt schema are strictly effect nodes.
                          // We might need to map pass/fail nodes specifically.
            effects: {
                health: node.effects.healthChange,
                sanity: node.effects.sanityChange,
                clues: node.effects.cluesGained,
                doom: node.effects.doomChange,
                assets: node.effects.assetsGained,
                conditions: node.effects.conditionsGained
            }
        } : undefined,
        // Navigation
        nextNodeId: node.nextNodeId,
        passNodeId: node.test?.passNodeId,
        failNodeId: node.test?.failNodeId,
      };
      
      // Fix outcome success flag - if it's a pass node (usually implied by ID or flow), success=true
      // But purely effect nodes don't inherently have success/fail unless linked from a test.
      // We'll leave it as true for now as it's just a container for effects.
      if (node.type === 'outcome' && transformedNode.outcome) {
          transformedNode.outcome.success = !node.id.toLowerCase().includes('fail');
      }

      nodesRecord[node.id] = transformedNode;
    });
    
    console.log('[AI Encounter Generation] Transformed nodes:', Object.keys(nodesRecord));
    console.log('[AI Encounter Generation] ✅ Success');

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
    console.error('[AI Encounter Generation] ❌ Error:', error);
    console.error('[AI Encounter Generation] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
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

