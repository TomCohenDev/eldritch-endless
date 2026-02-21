import '../models/game_state.dart';

class EndingPrompt {
  static String buildPrompt({
    required GameState gameState,
    required bool isVictory,
    required String playerNotes,
  }) {
    final ancientOne = gameState.ancientOne;
    final investigatorNames = gameState.players
        .map((p) => p.investigator.name.replaceAll('"', ''))
        .join(', ');

    final storyContext = _buildStoryContext(gameState);
    final timelineContext = _buildTimelineContext(gameState);
    final outcome = isVictory ? 'VICTORY' : 'DEFEAT';
    final outcomeDesc = isVictory
        ? 'The investigators have WON against ${ancientOne.name}. Write a triumphant but bittersweet ending — cosmic horror leaves scars even in victory.'
        : 'The investigators have LOST to ${ancientOne.name}. Write a devastating, tragic ending — the ancient one\'s power is unstoppable.';

    return '''You are an EXPERT cosmic horror narrator and voice director for Eldritch Horror. Generate the ENDING of this game as a JSON response with PROFESSIONAL NARRATION.

## OUTCOME: $outcome
$outcomeDesc

## ANCIENT ONE: ${ancientOne.name}
- Title: ${ancientOne.epithet}
- Lore: ${ancientOne.lore}

## INVESTIGATORS
$investigatorNames

## STORY CONTEXT (FULL CAMPAIGN)
$storyContext

## TIMELINE (ALL EVENTS THAT HAPPENED DURING THE GAME)
$timelineContext

## PLAYER NOTES ON THE ENDING
${playerNotes.isEmpty ? 'No additional notes provided.' : playerNotes}

## AUDIO TAG REFERENCE (for narration field ONLY)
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

## INSTRUCTIONS
1. Write an ending: 3 paragraphs only. Keep it punchy — no long-winded prose. Aim for roughly 250 words total.
2. Reference the investigators BY NAME — one brief line per investigator is enough.
3. Reference 3–4 key events from the timeline to ground the ending; do not list many.
4. For ${isVictory ? 'victory' : 'defeat'}: ${isVictory ? 'convey relief but lasting trauma, the cost of cosmic knowledge, bittersweet triumph' : 'convey despair, the futility against cosmic forces, the horror of the ancient one awakening fully'}.
5. The "ending" field is for DISPLAY (no audio tags, clean text).
6. The "endingNarration" field is for VOICE ACTING (with professional audio tags throughout).
7. Make the narration CINEMATIC — vary pace, emotion, and intensity.

## REQUIRED OUTPUT FORMAT
Respond with ONLY valid JSON. No markdown, no explanation.

{
  "ending": "3 paragraphs. Clean text for display — NO audio tags. Mention each investigator briefly by name. Reference 3–4 key timeline events. Keep it concise and impactful.",
  "endingNarration": "Same SHORT content but WITH professional audio tags for voice acting. Use [slowly], [whispers], [gravely], [trembling], [ominous], [sad], pauses (...), and EMPHASIS. CINEMATIC but brief."
}

CRITICAL REQUIREMENTS:
- Output ONLY the JSON object
- All strings must be properly escaped
- Do NOT use markdown code blocks
- "ending" = clean display text (NO audio tags)
- "endingNarration" = dramatic voice acting text (WITH audio tags throughout)
- MUST mention each investigator: $investigatorNames
- MUST reference  3–4 key timeline events (not many)
- SHORT: 3 paragraphs only (250 words). 
- Tone: ${isVictory ? 'bittersweet triumph, relief mixed with cosmic dread, hard-won victory' : 'devastating tragedy, cosmic horror, inevitable doom, gratuitous darkness'}
- Narration should sound like a professional audiobook narrator delivering a brief, punchy FINALE''';
  }

  static String _buildStoryContext(GameState gameState) {
    final story = gameState.storyGeneration;
    if (story == null) return '- No generated story found.';

    final buffer = StringBuffer();
    buffer.writeln('Ancient One Story:');
    buffer.writeln(story.ancientOneHook);
    buffer.writeln();

    buffer.writeln('Investigator Stories:');
    if (story.investigatorStories.isEmpty) {
      buffer.writeln('- None available.');
    } else {
      for (final investigatorStory in story.investigatorStories) {
        buffer
            .writeln('- ${investigatorStory.name}: ${investigatorStory.story}');
      }
    }
    buffer.writeln();

    buffer.writeln('Stage Plans:');
    buffer.writeln('- Stage 1: ${story.stagePlans.stage1}');
    buffer.writeln('- Stage 2: ${story.stagePlans.stage2}');
    buffer.writeln('- Stage 3: ${story.stagePlans.stage3}');

    return buffer.toString().trim();
  }

  static String _buildTimelineContext(GameState gameState) {
    final allEvents = <String>[];

    for (final player in gameState.players) {
      for (final event in player.timeline) {
        allEvents.add(
          '${event.timestamp.toIso8601String()} | ${player.displayName} | ${event.type.name} | ${event.title} | ${event.description}',
        );
      }
    }

    for (final event in gameState.globalTimeline) {
      allEvents.add(
        '${event.timestamp.toIso8601String()} | GLOBAL | ${event.type.name} | ${event.title} | ${event.description}',
      );
    }

    if (allEvents.isEmpty) return '- No timeline events yet.';

    allEvents.sort();
    return allEvents.map((event) => '- $event').join('\n');
  }
}
