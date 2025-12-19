# n8n AI Node Setup Guide for Plot Generation

## The Problem
n8n's Structured Output Parser requires the AI to return **pure JSON** without any markdown formatting or extra text. Many AI models wrap their JSON in code blocks like ` ```json ... ``` `, which breaks the parser.

## Solution: Configure Your AI Node

### Step 1: AI Model Node Settings

#### For OpenAI (GPT-4, GPT-3.5)
1. In your OpenAI node, look for **"Response Format"** or **"JSON Mode"**
2. Set it to: **"JSON Object"** or **"json_object"**
3. This forces the model to return only JSON

#### For Anthropic (Claude)
1. Claude doesn't have a native JSON mode
2. Add to the **System Message** or beginning of prompt:
   ```
   You are a JSON API. Return ONLY valid JSON. No markdown code blocks. Start with { and end with }
   ```
3. Or use Claude's new "JSON mode" if available in your n8n version

#### For Other Models
1. Add explicit instructions to return JSON only
2. May need to post-process the output (see Step 4)

### Step 2: Structured Output Parser Configuration

Your parser schema looks correct. Keep this configuration:

```json
{
  "type": "object",
  "properties": {
    "premise": { "type": "string" },
    "currentAct": { "type": "string", "enum": ["rising", "confrontation", "climax", "resolution"] },
    "ancientOneMotivation": { "type": "string" },
    "cultistAgenda": { "type": "string" },
    "cosmicThreat": { "type": "string" },
    "investigatorThreads": { "type": "array", "items": { ... } },
    "mysteryHooks": { "type": "array", "items": { "type": "string" } },
    "locationSignificance": { "type": "object", "additionalProperties": { "type": "string" } },
    "possibleOutcomes": { "type": "object", "properties": { ... }, "required": [...] },
    "currentTension": { "type": "number", "minimum": 0, "maximum": 10 },
    "activeThemes": { "type": "array", "items": { "type": "string" } },
    "majorPlotPoints": { "type": "array", "items": { "type": "string" } }
  },
  "required": [
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
}
```

**Note**: `locationSignificance` is NOT in the required array, so it's optional. The AI can return an empty object `{}` if needed.

### Step 3: Basic LLM Chain Configuration

1. **Prompt**: Use the updated `generate-plot-prompt.md`
2. **Attach Structured Output Parser** to the AI model output
3. **Temperature**: 0.7-0.9 (creative but structured)
4. **Max Tokens**: 4000-8000 (plot contexts can be long)

### Step 4: Fallback - Add a Function Node (If Still Having Issues)

If you still get formatting errors, add a **Function** node BEFORE the Structured Output Parser:

```javascript
// Strip markdown code blocks from AI response
let text = $input.item.json.output;

// Remove ```json and ``` wrappers
text = text.replace(/^```json\s*/i, '').replace(/```\s*$/,'');

// Remove any leading/trailing whitespace
text = text.trim();

// Try to parse to validate
try {
  const parsed = JSON.parse(text);
  return { json: { output: JSON.stringify(parsed) } };
} catch (e) {
  // Log the problematic text for debugging
  console.log('Failed to parse:', text);
  throw new Error(`Invalid JSON: ${e.message}`);
}
```

### Step 5: Testing

1. **Test with a simple game setup**: 1 investigator, Cthulhu
2. **Check the execution log** in n8n to see the raw AI output
3. **Verify JSON structure**: Look for:
   - No ` ```json ` or ` ``` ` wrappers
   - Proper quotes around strings
   - `currentTension` is a number (not `"3"` but `3`)
   - All required fields present
   - No trailing commas

## Common Errors and Fixes

### Error: "Model output doesn't fit required format"

**Cause 1**: AI returned markdown code blocks
- **Fix**: Enable JSON mode in AI settings OR add Function node to strip markdown

**Cause 2**: Missing required field
- **Fix**: Check if all required fields in schema are in the response
- Check the execution log to see which field is missing

**Cause 3**: Wrong data type
- **Fix**: Most common - `currentTension` returned as string `"3"` instead of number `3`
- Solution: Emphasize in prompt that numbers should not be quoted

**Cause 4**: Trailing commas in JSON
- **Fix**: JSON spec doesn't allow trailing commas
- Example bad: `{"field": "value",}`
- Example good: `{"field": "value"}`

**Cause 5**: Single quotes instead of double quotes
- **Fix**: JSON requires double quotes `"` not single quotes `'`

### Error: "Timeout"

**Cause**: Plot generation is complex and takes time
- **Fix**: Increase timeout in the webhook/node settings to 60-120 seconds

## Recommended n8n Workflow Structure

```
1. Webhook (POST /game-start)
   ↓
2. Set Headers (CORS)
   ↓
3. Basic LLM Chain
   ├─ Prompt Template (with game data)
   ├─ OpenAI Chat Model (JSON mode enabled)
   └─ Structured Output Parser
   ↓
4. [Optional] Function Node (strip markdown if needed)
   ↓
5. Respond to Webhook (return JSON)
```

## Quick Checklist

- [ ] AI model set to JSON mode (if available)
- [ ] Prompt includes "You are a JSON API" instruction at top
- [ ] Structured Output Parser attached to AI model
- [ ] Timeout set to at least 60 seconds
- [ ] Test with 1 investigator first
- [ ] Check execution logs if errors occur
- [ ] Add Function node to strip markdown if needed

## Testing the Prompt

You can test the prompt locally with the AI before putting it in n8n:

1. Copy the prompt from `generate-plot-prompt.md`
2. Fill in sample data for one investigator and one Ancient One
3. Send to ChatGPT/Claude with "JSON mode" enabled
4. Verify the response is pure JSON without markdown
5. Copy that working configuration to n8n

Good luck! 🎲👹

