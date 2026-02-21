import '../models/encounter.dart';
import '../models/game_state.dart';

class EncounterPrompt {
  /// Build the appropriate prompt based on encounter complexity
  static String buildPrompt({
    required Encounter encounter,
    required GameState gameState,
    required EncounterType requestedType,
    required String requestedSubType,
  }) {
    if (encounter.isComplex) {
      return _buildComplexPrompt(
        encounter: encounter,
        gameState: gameState,
        requestedType: requestedType,
        requestedSubType: requestedSubType,
      );
    }
    return _buildRegularPrompt(
      encounter: encounter,
      gameState: gameState,
      requestedType: requestedType,
      requestedSubType: requestedSubType,
    );
  }

  /// Prompt for regular encounters (Location, Research, General)
  /// Single test/task with straightforward resolution.
  static String _buildRegularPrompt({
    required Encounter encounter,
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
    final targetWordCount = _wordCount(encounter.rawText);

    return '''You are rewriting an Eldritch Horror encounter for live play.
Your job is to RETELL this encounter template so it fits this specific game's story context.

## PURPOSE (STRICT)
- Retell the template keeping the same mechanics and structure.
- Keep wording tight: similar length to the template.
- Do NOT invent new tests, new outcomes, or new bonuses.

## ENCOUNTER TYPE: REGULAR
This is a regular encounter with a single test or task.
The investigator reads the text, resolves any skill test, and applies the result.

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

## ENCOUNTER TEMPLATE (${encounter.type.name} / ${encounter.subType})
${encounter.rawText}

## HARD RULES
1) Keep ALL mechanics from the template exactly:
   - Skill tests stay the same (e.g. "(Lore)", "(Strength -1)")
   - Pass/fail results stay the same
   - Bonuses/rewards/penalties stay the same
2) Rewrite only narrative flavor to fit this game's context.
3) Keep overall structure and order of the template.
4) Keep length close to the template (target about $targetWordCount words, +/- 15%).
5) Output ONLY the retold encounter text directly, no prefix or labels.''';
  }

  /// Prompt for complex encounters (Expedition, Other World, Special)
  /// Three sections: Initial test -> Pass effect / Fail effect
  static String _buildComplexPrompt({
    required Encounter encounter,
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

    final initialWordCount = _wordCount(encounter.initialText);
    final passWordCount = _wordCount(encounter.passEffect);
    final failWordCount = _wordCount(encounter.failEffect);

    return '''You are rewriting an Eldritch Horror COMPLEX encounter for live play.
Your job is to RETELL this encounter template so it fits this specific game's story context.

## PURPOSE (STRICT)
- Retell the template keeping the same mechanics and three-section structure.
- Keep wording tight: similar length to each section of the template.
- Do NOT invent new tests, new outcomes, or new bonuses.

## ENCOUNTER TYPE: COMPLEX (3 sections)
Complex encounters have three sections that MUST be preserved:
1. **INITIAL** - Sets the scene and presents the first skill test or choice.
2. **PASS** - Resolved if the investigator passes the initial test. Often contains a second test.
3. **FAIL** - Resolved if the investigator fails the initial test. May contain a consolation test.

The investigator resolves INITIAL first, then goes to PASS or FAIL based on their result.

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

## ENCOUNTER TEMPLATE (${encounter.type.name} / ${encounter.subType})

### INITIAL (target ~$initialWordCount words)
${encounter.initialText}

### PASS EFFECT (target ~$passWordCount words)
${encounter.passEffect}

### FAIL EFFECT (target ~$failWordCount words)
${encounter.failEffect}

## HARD RULES
1) Keep ALL mechanics from each section exactly:
   - Skill tests stay the same (e.g. "(Lore)", "(Strength -1)")
   - Pass/fail results stay the same
   - Bonuses/rewards/penalties stay the same
   - Conditions gained/lost stay the same
2) Rewrite only narrative flavor to fit this game's context.
3) MUST output exactly three sections using these markers:
   [INITIAL]
   (rewritten initial text here)
   [PASS]
   (rewritten pass effect here)
   [FAIL]
   (rewritten fail effect here)
4) Keep each section's length close to its template section.
5) Output ONLY the three sections with their markers. No other text.''';
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

  static const _numberedSpaceTypes = {
    'Space 1': 'City', 'Space 2': 'Sea', 'Space 3': 'Sea',
    'Space 4': 'Wilderness', 'Space 5': 'City', 'Space 6': 'City',
    'Space 7': 'City', 'Space 8': 'Sea', 'Space 9': 'Wilderness',
    'Space 10': 'Wilderness', 'Space 11': 'Sea', 'Space 12': 'Sea',
    'Space 13': 'Sea', 'Space 14': 'City', 'Space 15': 'City',
    'Space 16': 'City', 'Space 17': 'City', 'Space 18': 'Sea',
    'Space 19': 'Wilderness', 'Space 20': 'City', 'Space 21': 'Wilderness',
  };

  /// Determine the location type (city, wilderness, sea) from location name
  static String _getLocationType(String location) {
    final numbered = _numberedSpaceTypes[location];
    if (numbered != null) return numbered;

    const cities = [
      'Arkham', 'Buenos Aires', 'Istanbul', 'London', 'Rome',
      'San Francisco', 'Shanghai', 'Sydney', 'Tokyo',
    ];
    const wilderness = [
      'Amazon', 'Antarctica', 'Himalayas', 'Pyramids', 'Tunguska',
    ];
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
    return 'City';
  }
}
