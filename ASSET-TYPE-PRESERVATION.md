# Asset Type Preservation - Updated Prompt

## ✅ What Changed

The AI prompt now explicitly instructs to preserve **specific asset types** from the original card.

## 🎯 The Problem

**Before:**
- Card says: "gain 1 **Incantation** Spell"
- AI generated: `assetsGained: ["Spell"]` ❌

**After:**
- Card says: "gain 1 **Incantation** Spell"
- AI generates: `assetsGained: ["Incantation Spell"]` ✅

## 📋 Asset Types to Preserve

### Spell Types
- `"Incantation Spell"` - Ritual spells
- `"Talent"` - Special abilities
- `"Spell"` - Generic (only if no type specified)

### Item Types
- `"Common Item"` - Basic items
- `"Unique Item"` - Special items
- `"Artifact"` - Powerful relics
- `"Item"` - Generic (only if no type specified)

### Other Types
- `"Ally"` - Companions
- `"Service"` - Services from locations
- `"Blessing"` - Divine boons
- `"Asset"` - Generic (only if no type specified)

## 🔍 How to Extract from Cards

The encounter card JSON includes a `links` array that shows specific types:

```json
{
  "text": "...gain 1 Incantation Spell.",
  "links": [
    {
      "text": "Incantation",
      "href": "/wiki/Incantation"
    }
  ]
}
```

The AI should:
1. Look at the `links` array
2. Find asset-related links (Incantation, Common Item, etc.)
3. Use those exact names in `assetsGained`

## 📝 Updated Prompt Instructions

### In "Mechanical Preservation Rules":
```markdown
- If the card says "Gain 1 **Incantation** Spell", use `assetsGained: ["Incantation Spell"]`
- If the card says "Gain 1 Spell" (generic), use `assetsGained: ["Spell"]`
- **PRESERVE SPECIFIC TYPES**: Look for linked text
- **Extract from links**: The card's `links` array shows types
```

### In "CRITICAL RULES #5":
```markdown
### 5. PRESERVE EXACT MECHANICS
- **PRESERVE SPECIFIC ASSET TYPES**: Check the card's `links` array
  - "gain 1 Incantation Spell" → `["Incantation Spell"]` NOT `["Spell"]`
  - "gain 1 Common Item" → `["Common Item"]` NOT `["Item"]`
```

### In "MECHANICAL TRANSLATION REFERENCE":
```markdown
**Assets (PRESERVE SPECIFIC TYPES):**
- "Gain 1 Incantation Spell" → `assetsGained: ["Incantation Spell"]`
- "Gain 1 Talent" → `assetsGained: ["Talent"]`
- "Gain 1 Common Item" → `assetsGained: ["Common Item"]`
- "Gain an Artifact" → `assetsGained: ["Artifact"]`
- "Gain an Ally" → `assetsGained: ["Ally"]`
- "Gain 1 Spell" (generic) → `assetsGained: ["Spell"]`
```

## 🎲 Example

**Original Card:**
```
An anonymous patient pleads with you to share what you've learned.
You may spend 1 Clue to share what you know.
If you spend the Clue, the man begins chanting; gain 1 Incantation Spell.

Links: [Clue, Incantation]
```

**AI Should Generate:**
```json
{
  "id": "node_pass",
  "text": "The patient's eyes light up. Ancient words spill from his lips...",
  "type": "outcome",
  "effects": {
    "assetsGained": ["Incantation Spell"]  // ✅ Specific type preserved
  }
}
```

**NOT:**
```json
{
  "effects": {
    "assetsGained": ["Spell"]  // ❌ Lost the specific type
  }
}
```

---

**Result**: The AI will now preserve exact asset types, making game mechanics more accurate and specific! 🎯✨

