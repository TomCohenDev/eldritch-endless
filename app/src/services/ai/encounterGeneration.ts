import { ollama, OLLAMA_ENCOUNTER_MODEL, ENCOUNTER_TEMPERATURE } from "./ollamaClient";
import { generateEncounterPrompt } from "./prompts/encounter";
import { selectEncounterCards } from "./encounterSelection";
import type { GenerateEncounterRequest, GenerateEncounterResponse, EncounterNode } from "../../types";

/**
 * Generate encounter using Ollama
 */
export async function generateEncounterWithAI(
  request: GenerateEncounterRequest,
  recentDescriptions?: string[]
): Promise<GenerateEncounterResponse> {
  // Select encounter card
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
    throw new Error('No encounter cards found');
  }

  const prompt = generateEncounterPrompt(request, cards, metadata, recentDescriptions);

  const response = await ollama.chat({
    model: OLLAMA_ENCOUNTER_MODEL,
    messages: [{ role: 'user', content: prompt }],
    format: 'json',
    options: {
      temperature: ENCOUNTER_TEMPERATURE,
      num_predict: 1024,
    }
  });

  const data = parseResponse(response.message.content);
  return convertToEncounterResponse(data);
}

function parseResponse(jsonStr: string): any {
  try {
    const clean = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    console.error('Parse error:', e, jsonStr.substring(0, 500));
    throw new Error('Invalid JSON from AI');
  }
}

function convertToEncounterResponse(data: any): GenerateEncounterResponse {
  const nodes: Record<string, EncounterNode> = {};

  nodes['start'] = {
    id: 'start',
    type: 'narrative',
    content: data.text,
    nextNodeId: data.test ? 'test' : 'outcome'
  };

  if (data.test && data.test.skill) {
    nodes['test'] = {
      id: 'test',
      type: 'test',
      content: `Test ${data.test.skill}`,
      testInfo: {
        skill: data.test.skill,
        difficulty: data.test.difficulty || 0
      },
      passNodeId: 'pass',
      failNodeId: 'fail'
    };

    nodes['pass'] = {
      id: 'pass',
      type: 'outcome',
      content: 'You succeed.',
      outcome: {
        success: true,
        effects: {
          health: data.pass?.health || 0,
          sanity: data.pass?.sanity || 0,
          clues: data.pass?.clues || 0,
          assets: data.pass?.assets || [],
          conditions: data.pass?.conditions || []
        }
      }
    };

    nodes['fail'] = {
      id: 'fail',
      type: 'outcome',
      content: 'You fail.',
      outcome: {
        success: false,
        effects: {
          health: data.fail?.health || 0,
          sanity: data.fail?.sanity || 0,
          clues: data.fail?.clues || 0,
          assets: data.fail?.assets || [],
          conditions: data.fail?.conditions || []
        }
      }
    };
  } else {
    nodes['outcome'] = {
      id: 'outcome',
      type: 'outcome',
      content: 'The encounter concludes.',
      outcome: {
        success: true,
        effects: {
          health: data.pass?.health || 0,
          sanity: data.pass?.sanity || 0,
          clues: data.pass?.clues || 0,
          assets: data.pass?.assets || [],
          conditions: data.pass?.conditions || []
        }
      }
    };
  }

  return {
    encounter: {
      title: data.title || 'Encounter',
      startingNodeId: 'start',
      nodes
    }
  };
}
