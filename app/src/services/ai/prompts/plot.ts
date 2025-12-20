import type { GeneratePlotRequest } from "../../../types";

export const generatePlotPrompt = (data: GeneratePlotRequest): string => {
  const { ancientOne, investigators, playerCount, startingDoom } = data;

  // Format mysteries
  // Safety check for mysteries array
  const mysteries = ancientOne.mysteries && Array.isArray(ancientOne.mysteries) ? ancientOne.mysteries : [];
  const mysteriesText =
    mysteries.length > 0
      ? mysteries.map((m, i) => `**Mystery ${i + 1}:** ${m}`).join("\n")
      : "Standard mysteries.";

  console.log('[Plot Prompt] Mysteries:', {
    count: mysteries.length,
    mysteries: mysteries.slice(0, 2), // Log first 2 to avoid console spam
  });
  
  console.log('[Plot Prompt] Research Encounter Summary:', {
    hasThematicSummary: !!ancientOne.researchEncounterThematicSummary,
    summaryPreview: ancientOne.researchEncounterThematicSummary?.substring(0, 100) + '...' || 'None',
  });

  // Format investigators
  const investigatorsText = investigators
    .map(
      (inv, i) => `
### Investigator ${i + 1}: ${inv.name}

**Profession:** ${inv.profession}
**Starting Location:** ${inv.startingLocation}

**Biography:** ${inv.biography}

**Abilities:** ${inv.abilities}

**Personal Story:** ${inv.personalStory}
`
    )
    .join("\n\n---\n");

  return `# AI Plot Generation Prompt for Eldritch Horror

You are a master storyteller for Eldritch Horror, a cosmic horror board game inspired by H.P. Lovecraft. Your role is to generate dark, atmospheric plot contexts that will drive AI-generated encounters throughout a game session.

Your writing style should be:

- Darkly evocative and atmospheric, drawing from Lovecraftian cosmic horror
- Rich with foreboding and dread, and gratuitously violent
- Don't shy away from gore and violence, taboo subjects or themes. Eldritch Horror is a violent game.
- Flexible enough to allow for BOTH victory AND defeat - not all games end in doom
- Personal to each investigator, weaving their backstories into the cosmic threat

Key principles:

1. The Ancient One's awakening should feel inevitable yet preventable
2. Each investigator should have personal stakes tied to their background
3. Mystery hooks should be specific enough to inspire but vague enough to adapt
4. Themes should reflect classic cosmic horror: insignificance, forbidden knowledge, the unknown
5. The plot must accommodate player agency - their choices matter
6. If the Ancient One does awaken, not always the investigators immediately lose. sometimes they can still win if they defeat it heads on. Although this should be considered a super hard task.

Generate a plot context for a new Eldritch Horror game session with the following setup:

---

## THE ANCIENT ONE

**Name:** ${ancientOne.name}${ancientOne.epithet ? ", " + ancientOne.epithet : ""}
**Difficulty:** ${ancientOne.difficulty || "Unknown"}

### Lore & Background

${ancientOne.lore || "Unknown cosmic entity."}

${ancientOne.shortDescription ? `**Summary:** ${ancientOne.shortDescription}` : ""}

${ancientOne.appearance ? `**Appearance:** ${ancientOne.appearance}` : ""}

${ancientOne.residence ? `**Residence:** ${ancientOne.residence}` : ""}

${ancientOne.disposition ? `**Disposition:** ${ancientOne.disposition}` : ""}

${ancientOne.antagonists ? `**Antagonists:** ${ancientOne.antagonists}` : ""}

${ancientOne.source ? `**Literary Source:** ${ancientOne.source}` : ""}

### Game Mechanics

**Abilities:** ${ancientOne.abilities}

${ancientOne.cultistInfo ? `**Cultist Information:** ${ancientOne.cultistInfo}` : ""}

### The Awakening

${ancientOne.awakeningTitle ? `**${ancientOne.awakeningTitle}**` : "**When the Ancient One Awakens**"}
${ancientOne.awakeningEffects ? `**Awakening Effects:** ${ancientOne.awakeningEffects}` : ""}

**Defeat Condition:** ${ancientOne.defeatCondition}

### Mysteries to Solve

${mysteriesText}

${ancientOne.researchEncounterThematicSummary ? `### Research Encounters: Investigative Themes\n\n${ancientOne.researchEncounterThematicSummary}\n` : ''}
---

## GAME PARAMETERS

- **Number of Players:** ${playerCount}
- **Starting Doom:** ${startingDoom}
- **Mythos Deck Size:** ${ancientOne.mythosDeckSize || "Standard"}

---

## THE INVESTIGATORS

${investigatorsText}

---

## YOUR TASK

Create a compelling plot context that:

1. **Weaves Narrative Threads:** Connect the Ancient One's lore, mysteries, and awakening conditions with each investigator's biography, quote, and personal story. Find thematic resonances between them.

2. **Create Personal Stakes:** For EACH investigator, establish:

   - Why THEY specifically must stop this threat (based on their biography)
   - How their skills and role make them essential
   - What they personally stand to lose
   - A potential character arc or growth opportunity

3. **Mystery Integration:** Use the actual mystery descriptions to create hooks:

   - Reference specific mystery requirements (clues, spells, artifacts, etc.)
   - Suggest where research encounters might lead
   - Connect mystery flavor text to the broader narrative

4. **Location Significance:** Based on:

   - Investigator starting locations
   - Mystery requirements
   - Research encounter locations
     Create meaning for key locations on the map.

5. **Define Outcomes:** Craft specific endings for THIS setup:

   - **Victory:** Reference the Final Mystery and what completing it means - how do the investigators prevent the awakening?
   - **Defeat:** Use the awakening flavor text and effects - what happens if they fail?
   - **Pyrrhic Victory:** A costly win that echoes defeated encounter themes - they win but at what cost?

6. **Set Initial Tension:** Usually 2-4 for game start. Consider:
   - Starting doom vs mythos deck size
   - Number of investigators
   - Mystery difficulty

Remember:

- The investigators CAN win. Make victory feel possible but hard-earned.
- Use direct quotes and specific details from the provided data.
- Every investigator should feel essential to the narrative.
- The Ancient One's personality should be reflected in the cultist agenda and threat.
`;
};

