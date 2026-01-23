# Recent Encounters in n8n Webhook - Implementation

## ✅ What's Fixed

The `recentEncounters` field is now included in every webhook call to n8n and available in the AI prompt.

## 📤 What Gets Sent to n8n

### New Field in Webhook Body: `recentEncounters`

```json
{
  "sessionId": "...",
  "encounterType": "location",
  "investigator": {...},
  "gameContext": {...},
  "plotContext": {...},
  "roundTimeline": {...},
  
  "recentEncounters": [
    {
      "title": "Shadowed Discovery",
      "location": "Rome",
      "investigatorName": "Skids O'Toole",
      "summary": "You enter the dark alley, shadows closing in...",
      "choicesMade": ["Investigate", "pass test"],
      "outcome": {
        "cluesGained": 1,
        "conditionsGained": ["Debt"]
      }
    },
    {
      "title": "Cult Meeting",
      "location": "Arkham",
      "investigatorName": "Ashcan Pete",
      "summary": "You stumble upon a midnight gathering...",
      "choicesMade": ["Hide and Listen", "fail test"],
      "outcome": {
        "sanityChange": -2
      }
    }
  ]
}
```

## 🎯 What Gets Included

- **Last 3 encounters** that have full history saved
- **Only encounters** (not other narrative events like mythos)
- **From any investigator** (party-wide context)

Each encounter includes:
- `title` - Name of the encounter
- `location` - Where it happened
- `investigatorName` - Who experienced it
- `summary` - First paragraph of the encounter
- `choicesMade` - All choices/test results (e.g., "Investigate", "Passed Lore test")
- `outcome` - Final mechanical effects

## 📝 How It Appears in the AI Prompt

```markdown
**Recent Encounters:**
- Shadowed Discovery (Rome): You enter the dark alley, shadows closing in...
  Choices: Investigate, pass test
  
- Cult Meeting (Arkham): You stumble upon a midnight gathering...
  Choices: Hide and Listen, fail test
```

## 🤖 AI Can Now Reference Previous Encounters

The AI can write encounters that reference past events:

> "You return to the dark alley in Rome where you last found that strange symbol. The debt you incurred still weighs on you..."

> "The cultists you spotted in Arkham seem to have followed you here. They remember you..."

## 📋 Code Changes

### 1. **Updated Type** (`types/index.ts`):
```typescript
export interface GenerateEncounterRequest {
  // ... existing fields ...
  
  recentEncounters?: Array<{
    title: string;
    location: string;
    investigatorName: string;
    summary: string;
    choicesMade: string[];
    outcome: any;
  }>;
}
```

### 2. **Updated Builder** (`utils/encounterContext.ts`):
```typescript
// Build recent encounters context (last 3 encounters with full history)
const recentEncounters = (state.narrativeLog || [])
  .filter(event => event.type === 'encounter' && event.encounterHistory)
  .slice(-3)
  .map(event => {
    // Extract player, choices, outcome
    return {
      title: event.title,
      location: encounterPlayer?.location || 'Unknown',
      investigatorName: encounterPlayer?.investigator?.title || 'Unknown',
      summary: event.content.split('\n\n')[0],
      choicesMade: event.encounterHistory!.nodes
        .filter(n => n.choiceMade || n.testResult)
        .map(n => n.choiceMade || `${n.testResult} test`),
      outcome: event.encounterHistory!.finalOutcome || {},
    };
  });
```

### 3. **Updated Prompt** (`generate-encounters-prompt.md`):
```markdown
**Recent Encounters:**
{{ $json.body.recentEncounters && $json.body.recentEncounters.length > 0 ? 
   $json.body.recentEncounters.map(enc => 
     `- ${enc.title} (${enc.location}): ${enc.summary}\n  Choices: ${enc.choicesMade.join(', ')}`
   ).join('\n') 
   : "No previous encounters yet." 
}}
```

## 🔍 In Your Webhook Debug

You should now see in the n8n webhook test:

```
recentEncounters
recentEncounters[0]
  title: "Shadowed Discovery"
  location: "Rome"
  investigatorName: "Skids O'Toole"
  summary: "You enter the dark..."
  choicesMade
    choicesMade[0]: "Investigate"
    choicesMade[1]: "pass test"
  outcome
    cluesGained: 1
    conditionsGained
      conditionsGained[0]: "Debt"
```

---

**Result**: The AI now has full context of what happened in previous encounters and can create narrative continuity! 🎲📖✨


