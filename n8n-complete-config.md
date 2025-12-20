# Updated n8n Encounter Generation Configuration

## Complete JavaScript Node Code (pick encounter)

```javascript
// Get the encounter data (the large JSON from the Set node)
const encounterData = $input.first().json;

// Get the original request data (from Webhook)
// TRY MULTIPLE SOURCES to ensure we find the filters
let webhookData = {};

try {
  // 1. Try getting directly from the named Webhook node
  const whItem = $('Encounter Webhook').first();
  webhookData = whItem.json.body || whItem.json; 
} catch (e) {
  // 2. Fallback: Check if the previous node passed the filters along with the data
  // (Sometimes useful if we merge data upstream)
  webhookData = $input.first().json; 
}

// Extract filters with fallbacks (Support both camelCase from frontend and snake_case)
const encounterType = webhookData.encounterType || webhookData.encounter_type || encounterData.encounter_type; 
const location = webhookData.investigator?.location || webhookData.location || encounterData.location;
const spaceType = webhookData.spaceType || webhookData.space_type || encounterData.space_type || "City"; // Default to City if missing
const ancientOne = webhookData.gameContext?.ancientOneName || webhookData.ancient_one || encounterData.ancient_one;
const otherWorld = webhookData.otherWorld || webhookData.other_world || encounterData.other_world;

// Find the active investigator's specific narrative thread
const activeInvId = webhookData.investigator?.id || webhookData.activeInvestigator?.id;
const allThreads = webhookData.plotContext?.investigatorThreads || [];
const activeThread = allThreads.find(t => t.playerId === activeInvId) || {};

// Build the consolidated Game Context for the LLM
// The frontend sends separated `gameContext`, `plotContext`, `investigator` objects.
// We merge them here so the LLM prompt can access them via `{{ $json.game_context... }}`
const gameContext = {
  // Base game stats (round, doom, etc.)
  ...(webhookData.gameContext || webhookData.game_context || {}),
  
  // Plot context - preserve as-is
  plotContext: {
      ...(webhookData.plotContext || webhookData.plot_context || {}),
  },
  
  // Active Investigator - merge with thread data
  activeInvestigator: {
      ...(webhookData.investigator || {}),
      // If investigatorThread exists in plotContext, overlay it
      ...(webhookData.plotContext?.investigatorThread || {})
  },
  
  // Narrative history
  recentNarrative: webhookData.roundTimeline?.actions?.length > 0 ? 
    `Recent actions in Round ${webhookData.roundTimeline.round}: ` + 
    webhookData.roundTimeline.actions.map(a => a.description).join(". ") 
    : "The investigation has just begun.",
    
  majorPlotPoints: webhookData.plotContext?.majorPlotPoints || [],
  
  // Location info
  location: location,
  space_type: spaceType
};

let pool = [];
let metadata = {
  title: encounterData.title,
  intro: encounterData.intro
};

// Add any additional rules/effects documentation
if (encounterData.combat_rules) metadata.combat_rules = encounterData.combat_rules;
if (encounterData.effects_on_research_encounters) metadata.effects = encounterData.effects_on_research_encounters;
if (encounterData.effects_on_other_world_encounters) metadata.effects = encounterData.effects_on_other_world_encounters;
if (encounterData.effects_on_expeditions) metadata.effects = encounterData.effects_on_expeditions;
if (encounterData.defeated_resolution_steps) metadata.defeated_rules = encounterData.defeated_resolution_steps;
if (encounterData.other_rules) metadata.other_rules = encounterData.other_rules;

// LOGIC: Select the pool based on type
switch (encounterType) {
  case 'location':
    // Structure: encounters.{location}.tables[]
    if (encounterData.encounters?.[location]?.tables) {
      pool = encounterData.encounters[location].tables;
      metadata.location_info = encounterData.encounters[location].text || null;
    }
    break;

  case 'general':
    // Structure: encounters.{"City Encounters" | "Wilderness Encounters" | "Sea Encounters"}.tables[]
    const generalKey = (spaceType || 'City') + ' Encounters';
    if (encounterData.encounters?.[generalKey]?.tables) {
      pool = encounterData.encounters[generalKey].tables;
    }
    break;

  case 'research':
    // Structure: ancient_ones.{ancient_one}.encounters.{City|Wilderness|Sea}[]
    // Note: Frontend sends ancientOneName in gameContext, or ancientOne at top level
    const aoName = ancientOne;
    if (aoName && encounterData.ancient_ones?.[aoName]?.encounters?.[spaceType]) {
      pool = encounterData.ancient_ones[aoName].encounters[spaceType];
      metadata.ancient_one_info = {
        name: aoName,
        set: encounterData.ancient_ones[aoName].set
      };
    }
    break;

  case 'expedition':
    // Structure: encounters.{location}.tables[] (location = "The Amazon", "Antarctica", etc.)
    if (encounterData.encounters?.[location]?.tables) {
      pool = encounterData.encounters[location].tables;
    }
    break;

  case 'other_world':
    // Structure: encounters.{other_world}.tables[]
    if (encounterData.encounters?.[otherWorld]?.tables) {
      pool = encounterData.encounters[otherWorld].tables;
    }
    break;

  case 'special':
    // Structure: encounters.{mystery_name}.tables[]
    // Filter by ancient_one - check if the encounter group text mentions the ancient one
    const targetAo = ancientOne;
    if (encounterData.encounters) {
      for (const [key, val] of Object.entries(encounterData.encounters)) {
        // Check if this mystery/encounter group is related to the ancient one
        if (val.text && targetAo && val.text.toLowerCase().includes(targetAo.toLowerCase())) {
          if (val.tables) {
            pool.push(...val.tables);
          }
        }
      }
    }
    break;

  case 'combat':
  case 'defeated':
    // No card selection - return rules only
    return [{
      json: {
        encounter_type: encounterType,
        metadata: metadata,
        selected_cards: [],
        rules_only: true,
        game_context: gameContext
      }
    }];
}

// Check if we found any matching encounters
if (pool.length === 0) {
  return [{
    json: {
      error: `No encounters found for type: ${encounterType}`,
      debug_info: {
         found_in_webhook: !!webhookData.encounterType,
         filters: { location, spaceType, ancientOne, otherWorld },
         available_keys: encounterType === 'general' ? Object.keys(encounterData.encounters || {}) : []
      },
      encounter_type: encounterType,
      metadata: metadata,
      selected_cards: [],
      game_context: gameContext
    }
  }];
}

// Random selection of 2 unique cards
const selectedCards = [];
const numToSelect = 2;

if (pool.length <= numToSelect) {
    // If pool is small, take everything
    selectedCards.push(...pool);
} else {
    // Select unique indices
    const indices = new Set();
    while (indices.size < numToSelect) {
        indices.add(Math.floor(Math.random() * pool.length));
    }
    indices.forEach(index => selectedCards.push(pool[index]));
}

return [{
  json: {
    encounter_type: encounterType,
    metadata: metadata,
    selected_cards: selectedCards,
    total_matching: pool.length,
    game_context: gameContext,
    body: webhookData // Pass through for prompt access
  }
}];
```

## Complete LLM Prompt

See the updated `/Users/tomcohen/github/eldritch-endless/generate-encounters-prompt.md` file.

Key changes to the prompt:
1. **Second Person Only**: All text written addressing the investigator as "you"
2. **Unified Narrative**: No separation of "setup" and "description" - one flowing paragraph
3. **Brevity Requirements**: Max 2x the original card's word count
4. **Always 2-3 Choices**: Even if original has 1 or auto-test, create meaningful alternatives
5. **No Flavor Quotes**: Dialogue integrated naturally into the narrative
6. **Bigger Text Sizing**: Instructions reference mobile readability

## UI Changes

1. **Text Styling**: 
   - Main text: `text-base font-semibold` (up from `text-sm`)
   - Choices: `text-base font-semibold` (up from `text-sm`)
   - Test labels: `text-lg font-semibold` (up from default)
   - Consequences: `text-base font-semibold` with larger icons

2. **Back Navigation**:
   - History tracking via `encounterHistory` state array
   - Back button (ChevronLeft icon) in card header (only visible when history exists)
   - Navigation preserves all previous states
   - History resets on new encounter or completion

3. **Removed Elements**:
   - "Setup" section removed (no separate narrative field)
   - Flavor text removed (integrated into main text)
   - Simplified labels for second-person perspective

4. **Improved Touch Targets**:
   - Choice buttons: `p-4` (up from `p-3`)
   - Pass/Fail buttons: `py-4` (up from `py-3`)

