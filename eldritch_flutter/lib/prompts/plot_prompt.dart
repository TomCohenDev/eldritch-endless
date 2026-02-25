import '../models/ancient_one.dart';
import '../models/investigator.dart';

class PlotPrompt {
  static String buildPrompt({
    required AncientOne ancientOne,
    required List<Investigator> investigators,
  }) {
    final investigatorNames =
        investigators.map((i) => i.name.replaceAll('"', '')).join(', ');
    final investigatorDetails = investigators.map((i) {
      final bioLength = i.biography.length > 200 ? 200 : i.biography.length;
      return '''- ${i.name.replaceAll('"', '')} (${i.profession}): ${i.biography.substring(0, bioLength)}...
  Quote: "${i.quote}"''';
    }).join('\n');

    // Build the investigator stories template
    final investigatorStoriesTemplate = investigators.map((i) {
      final cleanName = i.name.replaceAll('"', '');
      return '''    {
      "name": "$cleanName",
      "story": "[Clean text for display - NO audio tags]",
      "storyNarration": "[Text WITH audio tags for voice acting - see examples below]"
      "involvement": "half a paragraph about how $cleanName became involved (~100 words)"
    }''';
    }).join(',\n');

    return '''You are an EXPERT cosmic horror narrator and voice director for Eldritch Horror. Generate a JSON story with PROFESSIONAL NARRATION.

## ANCIENT ONE: ${ancientOne.name}
- Title: ${ancientOne.epithet}
- Lore: ${ancientOne.lore}
- Awakening: ${ancientOne.awakeningTitle}
- Flavor: ${ancientOne.awakeningFlavor}

## INVESTIGATORS
$investigatorDetails

## AUDIO TAG REFERENCE (for narration fields ONLY)
Use these tags to create CINEMATIC, PROFESSIONAL voice acting:

**Emotional Delivery:**
- [slowly] - deliberate, ominous pacing
- [whispers] - intimate, secretive, terrifying
- [trembling] - fear, uncertainty
- [gravely] - serious, foreboding
- [breathless] - panic, urgency
- [sad] - melancholy, loss
- [ominous] - dark, threatening
- [excited] - building tension
- [sighs] - weariness, resignation
- [gulps] - shock, horror
- [groans] - pain, suffering
- [screams] - terror
- [shouts] - anger, rage
- [laughs] - dark creepy humor, irony


**Dramatic Pauses:**
- Use ellipsis (...) for dramatic pauses
- Use em-dashes (—) for interrupted thoughts

**Emphasis:**
- CAPITALIZE key words for emphasis
- Use exclamation marks sparingly for impact

**Sound Effects (use sparingly):**
- [thunder rumbles] - atmospheric
- [wind howling] - desolation
- [distant screams] - horror
- [heartbeat] - tension

## EXAMPLE PROFESSIONAL NARRATION:
"[slowly] In the forgotten depths... beneath the dying stars... [whispers] something STIRS. [thunder rumbles] The ancient seals, [trembling] carved by hands long turned to dust, [gravely] have begun to CRACK. [ominous] And in that darkness... in that INFINITE void... [breathless] IT remembers. It has ALWAYS remembered."

## INSTRUCTIONS
1. Write atmospheric, Lovecraftian prose building DREAD
2. The "ancientOneHook" is for DISPLAY (no tags)
3. The "ancientOneHookNarration" is for VOICE ACTING (with professional audio tags)
4. Same for investigator stories: "story" = display, "storyNarration" = voice acting
5. Make narration CINEMATIC - vary pace, emotion, and intensity
6. Use audio tags THROUGHOUT the narration text, not just at the start

## REQUIRED OUTPUT FORMAT
Respond with ONLY valid JSON. No markdown, no explanation.

{
  "ancientOneHook": "2 paragraphs about why ${ancientOne.name} is awakening NOW. Clean text for display - NO audio tags.",
  "ancientOneHookNarration": "Same content but WITH professional audio tags throughout for dramatic voice acting. Use [slowly], [whispers], [gravely], [trembling], [ominous], pauses (...), and EMPHASIS. Make it CINEMATIC.",
  "investigatorStories": [
$investigatorStoriesTemplate
  ],
  "stagePlans": {
    "stage1": "Early investigation: strange occurrences, gathering clues, first hints of the threat",
    "stage2": "Escalation: true scope revealed, cultists act openly, reality frays, racing against doom",
    "stage3": "Final confrontation: ${ancientOne.name}'s influence is undeniable, desperate action needed"
  }
}

CRITICAL REQUIREMENTS:
- Output ONLY the JSON object
- All strings must be properly escaped
- Do NOT use markdown code blocks
- "story" fields = clean display text (NO audio tags)
- "Narration" fields = dramatic voice acting text (WITH audio tags throughout)
- Make narrative specific to ${ancientOne.name} and: $investigatorNames
- Tone: ATMOSPHERIC DREAD, cosmic horror, building tension, horror elements, gratuitous violence and gore, taboo subjects, and other horror elements
- Narration should sound like a professional audiobook narrator''';
  }
}
