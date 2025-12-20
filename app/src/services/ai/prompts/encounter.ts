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
  metadata: any
): string => {
  const { 
    investigator, 
    gameContext, 
    plotContext, 
    roundTimeline, 
    recentEncounters 
  } = data;

  const recentEventsText = roundTimeline.actions.length > 0 
    ? `Round ${roundTimeline.round} actions: ${roundTimeline.actions.map(a => a.description).join(", ")}`
    : "The investigation has just begun.";

  const recentEncountersText = recentEncounters && recentEncounters.length > 0
    ? recentEncounters.map(enc => `- ${enc.title} (${enc.location}): ${enc.summary}\n  Choices: ${enc.choicesMade.join(', ')}`).join('\n')
    : "No previous encounters yet.";

  // Format selected cards
  const cardsSection = selectedCards.length === 2
    ? `I have selected **2 potential encounter options** for you. Choose the ONE that best fits the current narrative context and location atmosphere.

**Option A:**
\`\`\`json
${JSON.stringify(selectedCards[0], null, 2)}
\`\`\`

**Option B:**
\`\`\`json
${JSON.stringify(selectedCards[1], null, 2)}
\`\`\`

**Instruction:**
- **Step 1**: Analyze the word count of the original card's text. Your output should be at most 2x this length.
- **Step 2**: Decide which card fits the story better.
- **Step 3**: Generate the output JSON based **ONLY** on that chosen card's mechanics, but with 2-3 choices.`
    : `I have selected **1 encounter card** for you. Rewrite it to fit the current narrative.

**Selected Card:**
\`\`\`json
${JSON.stringify(selectedCards[0], null, 2)}
\`\`\`

**Instruction:**
- **Step 1**: Analyze the word count of the original card's text. Your output should be at most 2x this length.
- **Step 2**: Generate the output JSON based **ONLY** on this card's mechanics, but with 2-3 choices.`;

  return `## Purpose

You are the **Keeper of Arcane Lore** for Eldritch Horror. Your task is to **SELECT** one encounter from the provided options and **REWRITE** it to fit the current game's story while **STRICTLY PRESERVING** its game mechanics.

## YOUR MISSION: SELECTION & FLAVOR INJECTION

${cardsSection}

**Mechanical Preservation Rules:**
- If the card says "Test Lore (-1)", you MUST generate a Test Node for Lore with difficulty 1.
- If the card says "Gain 1 **Incantation** Spell", the Pass Node must have \`effects: { assetsGained: ["Incantation Spell"] }\`.
- If the card says "Gain 1 Spell" (generic), use \`assetsGained: ["Spell"]\`.
- If the card says "Lose 2 Health", the Fail Node must have \`effects: { healthChange: -2 }\`.
- **PRESERVE SPECIFIC TYPES**: Look for linked text like "Incantation", "Talent", "Common Item", "Unique Item", "Artifact", "Ally", etc.
- **Extract from links**: The card's \`links\` array shows specific types (e.g., \`{text: "Incantation", href: "/wiki/Incantation"}\`).
- **Examples**:
  - "gain 1 Incantation Spell" → \`["Incantation Spell"]\`
  - "gain 1 Common Item" → \`["Common Item"]\`
  - "gain an Artifact" → \`["Artifact"]\`
  - "gain a Talent" → \`["Talent"]\`
  - "gain an Ally" → \`["Ally"]\`
- **You are changing the STORY and ADDING CHOICES, not the GAME MECHANICS.**

---

## STORY CONTEXT

**Premise:** ${plotContext.premise}

**Ancient One:** ${gameContext.ancientOneName}

**Ancient One's Motivation:** ${plotContext.ancientOneMotivation}

**Cultist Agenda:** ${plotContext.cultistAgenda}

**Cosmic Threat:** ${plotContext.cosmicThreat}

**Active Themes:** ${plotContext.activeThemes.join(", ")}

**Current Act:** ${plotContext.currentAct}

---

## THE INVESTIGATOR

**Name:** ${investigator.name}
**Profession:** ${investigator.profession}
**Current Location:** ${investigator.location}

**Physical State:**
- Health: ${investigator.health}/${investigator.maxHealth}
- Sanity: ${investigator.sanity}/${investigator.maxSanity}
- Clues: ${investigator.clues}

**Personal Stakes:** ${plotContext.investigatorThread?.personalStakes || "Unknown"}

**Connection to Threat:** ${plotContext.investigatorThread?.connectionToThreat || "Unknown"}

---

## LOCATION & CURRENT SITUATION

**Location:** ${investigator.location}

**Location Significance:** ${plotContext.locationSignificance[investigator.location] || "A place touched by cosmic forces."}

**Recent Events:**
${recentEventsText}

**Recent Encounters:**
${recentEncountersText}

**Current Tension Level:** ${gameContext.currentTension}/10

---

## CRITICAL WRITING RULES

### 1. SECOND PERSON PERSPECTIVE
- Write EVERYTHING as "you" addressing ${investigator.name}
- Example: "The shadows close in around you. Brad's warning echoes in your mind."
- Never use first person ("I notice..." ❌) or third person ("Skids sees..." ❌)

### 2. UNIFIED NARRATIVE FLOW
- Do NOT separate "setup" and "main text"
- Write one continuous paragraph per node
- Integrate any dialogue naturally: 'The cultist hisses, "You should not have come here."'
- No flavor quotes or epigraphs

### 3. BREVITY IS KEY
- Count the words in the original card's Encounter text
- Your narrative should be AT MOST 2x that length
- Be punchy. Be immediate. Be tense.

### 4. ALWAYS PROVIDE 2-3 MEANINGFUL CHOICES
- Even if the original has 1 choice or auto-tests, create alternatives
- Choices should reflect different approaches: bold vs. cautious, violent vs. subtle, etc.
- One choice can be objectively worse (but still interesting!)
- Each choice must lead somewhere: another test, an outcome, or a different branch

### 5. PRESERVE EXACT MECHANICS
- If the card tests Observation (-1), you must test Observation with difficulty 1
- If the card gives +1 Clue on pass and -2 Sanity on fail, your nodes must match exactly
- **PRESERVE SPECIFIC ASSET TYPES**: Check the card's \`links\` array for exact asset types
  - "gain 1 Incantation Spell" → \`["Incantation Spell"]\` NOT \`["Spell"]\`
  - "gain 1 Common Item" → \`["Common Item"]\` NOT \`["Item"]\`
  - "gain a Talent" → \`["Talent"]\` NOT \`["Asset"]\`
- Never add mechanical effects that weren't on the card

---

## MECHANICAL TRANSLATION REFERENCE

**Difficulty:**
- No modifier → 0
- (-1) → 1  
- (-2) → 2
- (-3) → 3

**Assets (PRESERVE SPECIFIC TYPES):**
- "Gain 1 Incantation Spell" → \`assetsGained: ["Incantation Spell"]\`
- "Gain 1 Talent" → \`assetsGained: ["Talent"]\`
- "Gain 1 Common Item" → \`assetsGained: ["Common Item"]\`
- "Gain 1 Unique Item" → \`assetsGained: ["Unique Item"]\`
- "Gain an Artifact" → \`assetsGained: ["Artifact"]\`
- "Gain an Ally" → \`assetsGained: ["Ally"]\`
- "Gain 1 Spell" (generic, no type specified) → \`assetsGained: ["Spell"]\`

**Conditions:**
- "Gain Paranoia" → \`conditionsGained: ["Paranoia"]\`
- "Gain a Dark Pact" → \`conditionsGained: ["Dark Pact"]\`
- "Gain Debt" → \`conditionsGained: ["Debt"]\`

**Health/Sanity:**
- "Lose 2 Health" → \`healthChange: -2\`
- "Recover 1 Sanity" → \`sanityChange: 1\`

---

## Output Structure (JSON)

\`\`\`json
{
  "encounter": {
    "title": "Short Title (2-4 words)",
    "narrative": "Opening paragraph in FIRST PERSON. Set the immediate scene in 2-3 sentences maximum.",
    "startingNodeId": "node_start"
  },
  "nodes": [
    {
      "id": "node_start",
      "text": "Second-person description of the situation. End with the moment of choice. Keep under 60 words.",
      "type": "decision",
      "choices": [
        {
          "id": "choice_1",
          "label": "Action Verb (e.g. 'Investigate', 'Confront', 'Flee')",
          "description": "One sentence: what you're choosing to do",
          "nextNodeId": "node_test_1"
        },
        {
          "id": "choice_2",
          "label": "Alternative Action",
          "description": "One sentence: the other approach",
          "nextNodeId": "node_test_2_or_outcome"
        }
      ]
    },
    {
      "id": "node_test_1",
      "text": "You attempt [the action]. Second-person description of the attempt. Under 40 words.",
      "type": "test",
      "test": {
        "skill": "Lore|Influence|Observation|Strength|Will",
        "difficulty": 0-3,
        "passNodeId": "node_pass",
        "failNodeId": "node_fail"
      }
    },
    {
      "id": "node_pass",
      "text": "Success. What happens and how it feels. Second person. Under 50 words.",
      "type": "outcome",
      "effects": {
        "cluesGained": 0,
        "sanityChange": 0,
        "healthChange": 0,
        "doomChange": 0,
        "assetsGained": [],
        "conditionsGained": []
      }
    },
    {
      "id": "node_fail",
      "text": "Failure. The consequences. Second person. Under 50 words.",
      "type": "outcome",
      "effects": {
        "cluesGained": 0,
        "sanityChange": 0,
        "healthChange": 0,
        "doomChange": 0,
        "assetsGained": [],
        "conditionsGained": []
      }
    }
  ],
  "tensionChange": 0,
  "newPlotPoints": []
}
\`\`\`

## EXAMPLES OF GOOD vs BAD

### ❌ BAD (First Person, Too Long, Separated Setup)
\`\`\`
"Setup": "The investigator approaches the old mansion..."
"Text": "I walk through the creaking door. I notice the walls are covered in strange symbols that seem to writhe and move in the candlelight. The air is thick with incense and something else—something wrong. I hear footsteps above."
\`\`\`

### ✅ GOOD (Second Person, Concise, Unified)
\`\`\`
"text": "The mansion door groans as you push through. Symbols crawl across the walls—alive, watching. Footsteps echo from upstairs. Something tells you Brad was here."
\`\`\`
`;
};

