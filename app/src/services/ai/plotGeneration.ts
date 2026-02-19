import { anthropic, PLOT_GENERATION_MODEL } from "./client";
import { generatePlotPrompt } from "./prompts/plot";
import type { GeneratePlotRequest, PlotContext } from "../../types";
import { createEmptyPlotContext } from "../../types";

const PLOT_JSON_SCHEMA = {
  type: "object",
  properties: {
    premise: {
      type: "string",
      description: "opening situation setting the dark, atmospheric scene"
    },
    currentAct: {
      type: "string",
      enum: ["rising", "confrontation", "climax", "resolution"],
      description: "Current narrative act - always starts as 'rising'"
    },
    ancientOneMotivation: {
      type: "string",
      description: "Why the Ancient One is awakening or active now - ties to current events"
    },
    cultistAgenda: {
      type: "string",
      description: "What dark forces and cults are working against the investigators"
    },
    cosmicThreat: {
      type: "string",
      description: "The stakes - what happens to reality/world if investigators fail"
    },
    investigatorThreads: {
      type: "array",
      description: "Personal narrative thread for each investigator - single paragraph format",
      items: {
        type: "object",
        properties: {
          playerId: {
            type: "string",
            description: "Player identifier like 'player-0', 'player-1', etc. (match input order)"
          },
          narrative: {
            type: "string",
            description: "Single paragraph (5-6 sentences) describing: why THIS investigator must stop the threat, how their backstory connects, and their potential character arc"
          }
        },
        required: ["playerId", "narrative"]
      }
    },
    mysteryHooks: {
      type: "array",
      description: "3-5 potential plot directions or mysteries to explore",
      items: { type: "string" }
    },
    locationSignificance: {
      type: "object",
      description: "Map of location names to why they matter in this plot",
      additionalProperties: { type: "string" }
    },
    possibleOutcomes: {
      type: "object",
      properties: {
        victory: { type: "string", description: "What happens if investigators successfully stop the Ancient One" },
        defeat: { type: "string", description: "What happens if the Ancient One fully awakens" },
        pyrrhicVictory: { type: "string", description: "What a win-at-great-cost scenario looks like" }
      },
      required: ["victory", "defeat", "pyrrhicVictory"]
    },
    currentTension: {
      type: "number",
      minimum: 0,
      maximum: 10,
      description: "Current tension level from 0-10, typically starts at 2-4"
    },
    activeThemes: {
      type: "array",
      description: "3-5 horror themes active in this plot",
      items: { type: "string" }
    },
    majorPlotPoints: {
      type: "array",
      description: "Key events that have occurred - starts empty",
      items: { type: "string" }
    }
  },
  required: [
    "premise",
    "currentAct",
    "ancientOneMotivation",
    "cultistAgenda",
    "cosmicThreat",
    "investigatorThreads",
    "mysteryHooks",
    "possibleOutcomes",
    "currentTension",
    "activeThemes",
    "majorPlotPoints"
  ]
};

export async function generatePlotWithAI(request: GeneratePlotRequest): Promise<PlotContext> {
  console.log('[AI Plot Generation] Starting...');
  console.log('[AI Plot Generation] Request:', {
    sessionId: request.sessionId,
    ancientOne: request.ancientOne.name,
    investigators: request.investigators.map(inv => inv.name),
    playerCount: request.playerCount,
    startingDoom: request.startingDoom,
  });
  
  const prompt = generatePlotPrompt(request);
  
  console.log('[AI Plot Generation] Generated Prompt:');
  console.log('--- PROMPT START ---');
  console.log(prompt);
  console.log('--- PROMPT END ---');
  console.log(`[AI Plot Generation] Prompt length: ${prompt.length} characters`);

  try {
    console.log(`[AI Plot Generation] Calling Anthropic API with model: ${PLOT_GENERATION_MODEL}`);
    console.log('[AI Plot Generation] API Config:', {
      model: PLOT_GENERATION_MODEL,
      max_tokens: 4096,
      temperature: 0.7,
    });
    
    const startTime = Date.now();
    const msg = await anthropic.messages.create({
      model: PLOT_GENERATION_MODEL,
      max_tokens: 4096,
      temperature: 0.7,
      system: `You are a JSON-only API. You must strictly respond with a valid JSON object matching the schema below. Do not include markdown formatting like \`\`\`json.
      
Schema:
${JSON.stringify(PLOT_JSON_SCHEMA, null, 2)}`,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });
    
    const duration = Date.now() - startTime;
    console.log(`[AI Plot Generation] API call completed in ${duration}ms`);
    console.log('[AI Plot Generation] API Response:', {
      id: msg.id,
      model: msg.model,
      role: msg.role,
      stop_reason: msg.stop_reason,
      usage: msg.usage,
    });

    const content = msg.content[0].type === "text" ? msg.content[0].text : "";
    if (!content) {
      console.error('[AI Plot Generation] Empty response from API');
      throw new Error("Empty response from AI");
    }

    console.log('[AI Plot Generation] Raw AI Response:');
    console.log('--- RESPONSE START ---');
    console.log(content);
    console.log('--- RESPONSE END ---');
    console.log(`[AI Plot Generation] Response length: ${content.length} characters`);

    const plotData = parseAndValidateResponse(content);
    
    // Ensure investigator IDs match expected format and handle backward compatibility
    if (plotData.investigatorThreads) {
      plotData.investigatorThreads = plotData.investigatorThreads.map((thread, index) => {
        // Handle old format (personalStakes, connectionToThreat, potentialArc) vs new format (narrative)
        const hasOldFormat = thread.personalStakes || thread.connectionToThreat || thread.potentialArc;
        const hasNewFormat = thread.narrative;

        let narrative = '';
        if (hasNewFormat) {
          narrative = thread.narrative;
        } else if (hasOldFormat) {
          // Convert old format to new format for backward compatibility
          narrative = [
            thread.personalStakes || '',
            thread.connectionToThreat || '',
            thread.potentialArc || ''
          ].filter(s => s.trim()).join(' ').trim() || 'An investigator caught in the cosmic horror unfolding before them.';
        } else {
          narrative = 'An investigator caught in the cosmic horror unfolding before them.';
        }

        return {
          playerId: thread.playerId || `player-${index}`,
          narrative,
          // Keep legacy fields for backward compatibility
          personalStakes: thread.personalStakes,
          connectionToThreat: thread.connectionToThreat,
          potentialArc: thread.potentialArc,
        };
      });
    }

    console.log('[AI Plot Generation] Parsed Plot Context:', {
      premise: plotData.premise.substring(0, 100) + '...',
      currentAct: plotData.currentAct,
      investigatorThreads: plotData.investigatorThreads.length,
      mysteryHooks: plotData.mysteryHooks.length,
      currentTension: plotData.currentTension,
      activeThemes: plotData.activeThemes,
    });
    console.log('[AI Plot Generation] ✅ Success');

    return plotData;
  } catch (error) {
    console.error('[AI Plot Generation] ❌ Error:', error);
    console.error('[AI Plot Generation] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

function parseAndValidateResponse(jsonStr: string): PlotContext {
  console.log('[AI Plot Generation] Parsing and validating response...');
  try {
    // Clean up potential markdown code blocks
    const cleanStr = jsonStr.replace(/```json/g, "").replace(/```/g, "").trim();
    console.log('[AI Plot Generation] Cleaned JSON string length:', cleanStr.length);
    
    const parsed = JSON.parse(cleanStr);
    console.log('[AI Plot Generation] JSON parsed successfully');
    
    // Basic validation / filling defaults
    const validated = {
      premise: parsed.premise || "The darkness stirs...",
      currentAct: parsed.currentAct || "rising",
      ancientOneMotivation: parsed.ancientOneMotivation || "Unknown forces.",
      cultistAgenda: parsed.cultistAgenda || "To awaken the Ancient One.",
      cosmicThreat: parsed.cosmicThreat || "The end of the world.",
      investigatorThreads: Array.isArray(parsed.investigatorThreads) ? parsed.investigatorThreads : [],
      mysteryHooks: Array.isArray(parsed.mysteryHooks) ? parsed.mysteryHooks : [],
      locationSignificance: parsed.locationSignificance || {},
      possibleOutcomes: {
        victory: parsed.possibleOutcomes?.victory || "Victory.",
        defeat: parsed.possibleOutcomes?.defeat || "Doom.",
        pyrrhicVictory: parsed.possibleOutcomes?.pyrrhicVictory || "Victory at a cost.",
      },
      currentTension: typeof parsed.currentTension === "number" ? parsed.currentTension : 3,
      activeThemes: Array.isArray(parsed.activeThemes) ? parsed.activeThemes : [],
      majorPlotPoints: Array.isArray(parsed.majorPlotPoints) ? parsed.majorPlotPoints : [],
    };
    
    console.log('[AI Plot Generation] Validation complete. All required fields present.');
    return validated;
  } catch (e) {
    console.error('[AI Plot Generation] Failed to parse AI response JSON:', e);
    console.error('[AI Plot Generation] Parse error details:', {
      message: e instanceof Error ? e.message : String(e),
      jsonPreview: jsonStr.substring(0, 200) + '...',
    });
    throw new Error("Invalid JSON response from AI");
  }
}

