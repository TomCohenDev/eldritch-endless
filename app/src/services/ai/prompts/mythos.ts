/**
 * Prompt for generating mythos card story/narrative
 * 
 * The AI should ONLY change the story/flavor text while keeping
 * all mechanics exactly the same.
 */

import type { GenerateMythosRequest } from '../../../types';

export function generateMythosPrompt(request: GenerateMythosRequest): string {
  const { card, stage, gameContext, plotContext, recentMythosCards } = request;
  
  const recentMythosContext = recentMythosCards && recentMythosCards.length > 0
    ? `\n\nRecent Mythos Cards:\n${recentMythosCards.map(c => 
        `- ${c.title} (${c.color}, Stage ${c.stage}): ${c.summary}`
      ).join('\n')}`
    : '';

  return `You are a master storyteller for Eldritch Horror, a cooperative board game of cosmic horror. Your task is to rewrite ONLY the story/flavor text of a Mythos card while keeping ALL game mechanics EXACTLY the same.

CRITICAL RULES:
1. DO NOT change any game mechanics (Effect, Reckoning, Color, Difficulty, Trait)
2. ONLY rewrite the Flavor text and add narrative context
3. The story must fit the current investigation stage and plot context
4. The description must match the card's mechanical effects
5. Maintain the cosmic horror atmosphere and tone

CURRENT GAME CONTEXT:
- Round: ${gameContext.round}
- Doom: ${gameContext.doom}/${gameContext.maxDoom}
- Ancient One: ${gameContext.ancientOneName}
- Tension Level: ${gameContext.currentTension}/10
- Mythos Stage: ${stage} (${stage === 1 ? 'Early' : stage === 2 ? 'Mid' : 'Late'} game)

PLOT CONTEXT:
- Premise: ${plotContext.premise}
- Current Act: ${plotContext.currentAct}
- Active Themes: ${plotContext.activeThemes.join(', ') || 'None yet'}
- Major Plot Points: ${plotContext.majorPlotPoints.length > 0 ? plotContext.majorPlotPoints.join('; ') : 'None yet'}
- Ancient One's Motivation: ${plotContext.ancientOneMotivation}
- Cultist Agenda: ${plotContext.cultistAgenda}
- Cosmic Threat: ${plotContext.cosmicThreat}${recentMythosContext}

ORIGINAL MYTHOS CARD:
Title: ${card.title}
Color: ${card.color}
Difficulty: ${card.difficulty || 'Normal'}
Trait: ${card.trait || 'Event'}
Original Flavor: ${card.flavor || 'No flavor text'}
Effect: ${card.effect || 'No effect'}
${card.reckoning ? `Reckoning: ${card.reckoning}` : ''}

YOUR TASK:
Rewrite the Flavor text to:
1. Fit the current story and investigation stage
2. Connect to the ongoing plot and themes
3. Match the mechanical effects described in the Effect
4. Escalate tension appropriately for stage ${stage}
5. Reference recent events if relevant
6. Maintain cosmic horror atmosphere

The new flavor should be 2-4 sentences, atmospheric, and directly relate to what the card mechanically does. For example, if the card spawns monsters, the flavor should describe the arrival of those monsters in a way that fits the current story.

Respond with a JSON object in this exact format:
{
  "flavor": "Your rewritten flavor text here (2-4 sentences)",
  "narrative": "A brief narrative description (1-2 sentences) that provides additional context for how this event fits into the ongoing story",
  "tensionChange": 0,
  "newPlotPoints": []
}

The flavor text should be evocative and atmospheric, matching the tone of cosmic horror. The narrative should explain how this event connects to the larger story.`;
}

