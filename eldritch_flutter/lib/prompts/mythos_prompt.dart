import '../models/mythos_card.dart';
import '../models/game_state.dart';

class MythosPrompt {
  static String buildPrompt({
    required MythosCard card,
    required GameState gameState,
  }) {
    final ancientOneName = gameState.ancientOne.name;
    final stagePlanText = _getStagePlanText(gameState);
    final fullStoryContext = _buildStoryContext(gameState);
    final fullTimelineContext = _buildTimelineContext(gameState);

    // Build investigator locations string
    final investigatorLocations = gameState.players
        .map((p) => '${p.displayName}: ${p.currentLocation}')
        .join(', ');

    // Target word count based on original flavor
    final targetWordCount = _wordCount(card.flavorText);
    final actualTarget = targetWordCount > 0 ? targetWordCount : 30;

    return '''You are narrating a Mythos card for Eldritch Horror.
Your job is to RETELL the flavor text so it fits this specific game's story context.

## PURPOSE (STRICT)
- Rewrite the flavor text to connect with the current game narrative.
- Keep wording evocative but concise - this is read aloud during play.
- Do NOT include mechanical effects, only narrative flavor.

## MYTHOS CARD TYPE: ${card.color.toUpperCase()}
${_getColorDescription(card.color)}

## CARD DETAILS
- Title: ${card.title}
- Traits: ${card.traits}
- Color: ${card.color} (${_getColorMeaning(card.color)})
- Difficulty: ${card.difficulty}

## ORIGINAL FLAVOR TEXT
${card.flavorText.isNotEmpty ? card.flavorText : '(No original flavor text)'}

## CARD EFFECT (for context only - do NOT include in output)
${card.effectText}
${card.reckoningEffect.isNotEmpty ? 'Reckoning: ${card.reckoningEffect}' : ''}

## CURRENT GAME STATE
- Ancient One: $ancientOneName
- Current Stage: ${gameState.currentStage}/3
- Stage Theme: $stagePlanText
- Doom Track: ${gameState.doomTrack}/${gameState.ancientOne.startingDoom}
- Investigator Locations: $investigatorLocations

## STORY CONTEXT (FULL)
$fullStoryContext

## TIMELINE CONTEXT (FULL)
$fullTimelineContext

## HARD RULES
1) Write 2-3 sentences of atmospheric flavor text.
2) Connect to $ancientOneName's presence and the current stage theme.
3) Match the ${card.color} card intensity (${_getColorMeaning(card.color)}).
4) Foreshadow or explain the card's effect narratively.
5) Build cosmic dread appropriate to Stage ${gameState.currentStage}.
6) Keep length close to original (target about $actualTarget words, +/- 20%).
7) Output ONLY the flavor text directly, no prefix or labels.''';
  }

  static String _getStagePlanText(GameState gameState) {
    final plans = gameState.storyGeneration?.stagePlans;
    if (plans == null) {
      return _getStageDescription(gameState.currentStage);
    }
    switch (gameState.currentStage) {
      case 1:
        return plans.stage1;
      case 2:
        return plans.stage2;
      case 3:
        return plans.stage3;
      default:
        return _getStageDescription(gameState.currentStage);
    }
  }

  static String _getStageDescription(int stage) {
    switch (stage) {
      case 1:
        return 'Early investigation, subtle wrongness';
      case 2:
        return 'Growing threat, reality fraying';
      case 3:
        return 'Final confrontation, desperate times';
      default:
        return 'Unknown';
    }
  }

  static String _buildStoryContext(GameState gameState) {
    final story = gameState.storyGeneration;
    if (story == null) {
      return '- No generated story found.';
    }

    final buffer = StringBuffer();
    buffer.writeln('Ancient One Story:');
    buffer.writeln(story.ancientOneHook);
    buffer.writeln();

    buffer.writeln('Investigator Stories:');
    if (story.investigatorStories.isEmpty) {
      buffer.writeln('- None available.');
    } else {
      for (final investigatorStory in story.investigatorStories) {
        buffer.writeln('- ${investigatorStory.name}: ${investigatorStory.story}');
      }
    }

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

    if (allEvents.isEmpty) {
      return '- No timeline events yet.';
    }

    allEvents.sort();
    return allEvents.map((event) => '- $event').join('\n');
  }

  static int _wordCount(String text) {
    final cleaned = text.trim();
    if (cleaned.isEmpty) return 0;
    return cleaned.split(RegExp(r'\s+')).where((part) => part.isNotEmpty).length;
  }

  static String _getColorMeaning(String color) {
    switch (color.toLowerCase()) {
      case 'green':
        return 'mild events, early warnings';
      case 'yellow':
        return 'moderate danger, escalating threats';
      case 'blue':
        return 'severe events, major complications';
      default:
        return 'unknown severity';
    }
  }

  static String _getColorDescription(String color) {
    switch (color.toLowerCase()) {
      case 'green':
        return '''Green mythos cards represent mild disturbances - whispers of wrongness,
minor setbacks, and early omens. The horror is subtle, creeping rather than overt.''';
      case 'yellow':
        return '''Yellow mythos cards represent escalating danger - reality bends,
threats manifest more openly, and the investigators face mounting pressure.''';
      case 'blue':
        return '''Blue mythos cards represent severe cosmic events - the veil tears,
ancient powers stir directly, and catastrophic consequences unfold.''';
      default:
        return 'Unknown card severity.';
    }
  }
}
