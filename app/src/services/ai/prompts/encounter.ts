import type { GenerateEncounterRequest } from "../../../types";

interface EncounterCard {
  "ID #"?: string;
  Set?: any;
  Encounter: {
    text: string;
    links?: Array<{ text: string; href: string }>;
    images?: Array<any>;
  };
  _section?: string;
  _ancient_one?: string;
}

export const generateEncounterPrompt = (
  data: GenerateEncounterRequest,
  selectedCards: EncounterCard[],
  metadata: any,
  recentDescriptions?: string[]
): string => {
  const { investigator, gameContext, plotContext } = data;

  // Format selected cards - pick the first one
  const card = selectedCards[0];
  const cardText = card.Encounter.text;

  return `You rewrite Eldritch Horror encounter cards to fit the current story. Keep it simple and atmospheric.

CARD TO REWRITE:
${cardText}

CONTEXT:
- Ancient One: ${gameContext.ancientOneName}
- Location: ${investigator.location}
- Investigator: ${investigator.investigatorName} (${investigator.profession})
- Theme: ${plotContext.premise.substring(0, 150)}

INSTRUCTIONS:
1. Rewrite the card text in second person ("you")
2. Keep the same mechanics (tests, effects) from the original
3. Add subtle references to ${gameContext.ancientOneName} and the cosmic horror theme
4. Keep it SHORT - similar length to original
5. No choices - just the card text as a continuous narrative

${recentDescriptions && recentDescriptions.length > 0 ? `AVOID these recent phrases:\n${recentDescriptions.slice(0, 2).join('\n')}\n` : ''}

OUTPUT FORMAT (JSON, text field MUST come first):
{
  "text": "Your rewritten encounter text here. Second person. Atmospheric. Include the test and outcomes naturally in the prose.",
  "title": "2-4 word title",
  "test": {
    "skill": "Lore|Influence|Observation|Strength|Will",
    "difficulty": 0-3
  },
  "pass": {
    "health": 0,
    "sanity": 0,
    "clues": 0,
    "assets": [],
    "conditions": []
  },
  "fail": {
    "health": 0,
    "sanity": 0,
    "clues": 0,
    "assets": [],
    "conditions": []
  }
}

Extract the test skill and difficulty from phrases like "Test Lore (-1)" = Lore, difficulty 1.
Extract effects from phrases like "gain 1 Clue" = clues: 1, "lose 2 Sanity" = sanity: -2.

Return ONLY valid JSON with "text" as the FIRST field.`;
};
