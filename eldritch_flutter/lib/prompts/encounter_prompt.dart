import '../models/encounter.dart';
import '../models/game_state.dart';

class EncounterPrompt {
  static String buildPrompt({
    required Encounter encounterA,
    required Encounter encounterB,
    required GameState gameState,
    required EncounterType requestedType,
    required String requestedSubType,
  }) {
    final activePlayer = gameState.activePlayer;
    final investigatorName = activePlayer?.investigator.name.replaceAll('"', '') ?? 'Unknown Investigator';
    final ancientOneName = gameState.ancientOne.name;
    final currentLocation = activePlayer?.currentLocation ?? 'Unknown';
    final locationType = _getLocationType(currentLocation);
    final stagePlanText = _getStagePlanText(gameState);
    final fullStoryContext = _buildStoryContext(gameState);
    final fullTimelineContext = _buildTimelineContext(gameState);
    final targetWordCount = _wordCount(encounterA.rawText);

    return '''You are rewriting one Eldritch Horror encounter for live play.
Your job is to RETELL one existing encounter template so it fits this specific game's story context.

## PURPOSE (STRICT)
- Pick either TEMPLATE A or TEMPLATE B (whichever fits better).
- Retell the chosen template in the same mechanics and structure.
- Keep wording tight: similar length to the chosen template.
- Do NOT invent new tests, new outcomes, or new bonuses.

## GENERATION TARGET
- Generate encounter for investigator: $investigatorName
- Requested encounter type: ${requestedType.name}
- Requested encounter subtype: $requestedSubType

## CURRENT GAME STATE
- Ancient One: $ancientOneName
- Active Investigator: $investigatorName
- Current Location: $currentLocation ($locationType)
- Current Stage: ${gameState.currentStage}/3
- Stage Meaning: $stagePlanText

## STORY CONTEXT (FULL)
$fullStoryContext

## TIMELINE CONTEXT (FULL, INCLUDE ALL EVENTS)
$fullTimelineContext

## TEMPLATE A (${encounterA.type.name} / ${encounterA.subType})
${encounterA.rawText}

## TEMPLATE B (${encounterB.type.name} / ${encounterB.subType})
${encounterB.rawText}

## HARD RULES
1) Choose exactly one template (A or B) and keep ALL of its mechanics exactly:
   - Skill tests stay the same
   - Pass/fail results stay the same
   - Bonuses/rewards/penalties stay the same
2) Rewrite only narrative flavor to fit this game's context.
3) Keep overall structure and order of the chosen template.
4) Keep length close to the chosen template (target about $targetWordCount words, +/- 15%).
5) Output ONLY the result in this format:
SELECTED_TEMPLATE: A or B
RETOLD_ENCOUNTER:
<final encounter text>''';
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

  /// Determine the location type (city, wilderness, sea) from location name
  static String _getLocationType(String location) {
    // Common city locations
    const cities = [
      'Arkham', 'Buenos Aires', 'Istanbul', 'London', 'Rome',
      'San Francisco', 'Shanghai', 'Sydney', 'Tokyo',
    ];
    // Wilderness locations
    const wilderness = [
      'Amazon', 'Antarctica', 'Himalayas', 'Pyramids', 'Tunguska',
    ];
    // Sea spaces
    const sea = [
      'Sea', 'Ocean', 'Atlantic', 'Pacific', 'Indian',
    ];

    final loc = location.toLowerCase();
    for (final city in cities) {
      if (loc.contains(city.toLowerCase())) return 'City';
    }
    for (final wild in wilderness) {
      if (loc.contains(wild.toLowerCase())) return 'Wilderness';
    }
    for (final s in sea) {
      if (loc.contains(s.toLowerCase())) return 'Sea';
    }
    return 'City'; // Default to city
  }
}
