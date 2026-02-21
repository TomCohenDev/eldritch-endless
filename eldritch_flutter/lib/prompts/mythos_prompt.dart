import '../models/mythos_card.dart';
import '../models/game_state.dart';

class MythosPrompt {
  static String buildPrompt({
    required MythosCard card,
    required GameState gameState,
  }) {
    final ancientOneName = gameState.ancientOne.name;
    final storyContext = gameState.storyGeneration?.stagePlans;
    final currentStagePlan = _getStagePlan(storyContext, gameState.currentStage);

    // Build investigator locations string
    final investigatorLocations = gameState.players
        .map((p) => '${p.displayName}: ${p.currentLocation}')
        .join(', ');

    return '''You are a cosmic horror narrator. Generate atmospheric flavor text for this Mythos card.

## GAME CONTEXT
Ancient One: $ancientOneName
Current Stage: ${gameState.currentStage}/3
Stage Theme: $currentStagePlan
Doom Track: ${gameState.doomTrack}
Investigator Locations: $investigatorLocations

## MYTHOS CARD
Title: ${card.title}
Color: ${card.color} (${_getColorMeaning(card.color)})
Traits: ${card.traits}
Original Flavor: ${card.flavorText}
Effect: ${card.effectText}

## INSTRUCTIONS
Write 2-3 sentences of atmospheric flavor text that:
1. Connects to $ancientOneName's awakening
2. Matches the ${card.color} card intensity
3. Foreshadows or explains the card's effect
4. Builds cosmic dread appropriate to Stage ${gameState.currentStage}

Be evocative but concise - this is read aloud during play.
Do not include the mechanical effects, only the flavor narrative.''';
  }

  static String _getStagePlan(StagePlans? plans, int stage) {
    if (plans == null) return 'The darkness grows';
    switch (stage) {
      case 1:
        return plans.stage1;
      case 2:
        return plans.stage2;
      case 3:
        return plans.stage3;
      default:
        return 'Unknown';
    }
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
}
