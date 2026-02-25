/// Enum representing mythos card icon types
enum MythosIcon {
  advanceOmen,
  reckoning,
  spawnGates,
  monsterSurge,
  spawnClues,
  spawnRumor,
  eldritchToken,
}

/// Extension to get asset paths for mythos icons
extension MythosIconAsset on MythosIcon {
  String get assetPath {
    switch (this) {
      case MythosIcon.advanceOmen:
        return 'assets/images/Advance_Omen.webp';
      case MythosIcon.reckoning:
        return 'assets/images/Mythos_Reckoning.webp';
      case MythosIcon.spawnGates:
        return 'assets/images/Spawn_Gates.webp';
      case MythosIcon.monsterSurge:
        return 'assets/images/Monster_Surge.webp';
      case MythosIcon.spawnClues:
        return 'assets/images/Spawn_Clues.webp';
      case MythosIcon.spawnRumor:
        return 'assets/images/Spawn_Rumor.webp';
      case MythosIcon.eldritchToken:
        return 'assets/images/Eldritch_Token.webp';
    }
  }

  String get displayName {
    switch (this) {
      case MythosIcon.advanceOmen:
        return 'Advance Omen';
      case MythosIcon.reckoning:
        return 'Reckoning';
      case MythosIcon.spawnGates:
        return 'Spawn Gates';
      case MythosIcon.monsterSurge:
        return 'Monster Surge';
      case MythosIcon.spawnClues:
        return 'Spawn Clues';
      case MythosIcon.spawnRumor:
        return 'Spawn Rumor';
      case MythosIcon.eldritchToken:
        return 'Eldritch Token';
    }
  }
}

class MythosCard {
  final String title;
  final int pageId;
  final String expansion;
  final List<String> categories;
  final String traits;
  final String color;
  final String difficulty;
  final String flavorText;
  final String effectText;
  final String reckoningEffect;
  final String rawWikitext;

  MythosCard({
    required this.title,
    required this.pageId,
    required this.expansion,
    required this.categories,
    required this.traits,
    required this.color,
    required this.difficulty,
    required this.flavorText,
    required this.effectText,
    required this.reckoningEffect,
    required this.rawWikitext,
  });

  /// Get the icons for this card based on its color
  /// Green: Advance Omen, Monster Surge, Spawn Clues
  /// Yellow: Advance Omen, Reckoning, Spawn Gates
  /// Blue: Spawn Clues (+ Spawn Rumor for Rumor cards, Eldritch Token if applicable)
  List<MythosIcon> get icons {
    switch (color.toLowerCase()) {
      case 'green':
        return [
          MythosIcon.advanceOmen,
          MythosIcon.monsterSurge,
          MythosIcon.spawnClues,
        ];
      case 'yellow':
        return [
          MythosIcon.advanceOmen,
          MythosIcon.reckoning,
          MythosIcon.spawnGates,
        ];
      case 'blue':
        final blueIcons = <MythosIcon>[MythosIcon.spawnClues];
        // Blue cards with Rumor trait spawn rumors
        if (traits.toLowerCase().contains('rumor')) {
          blueIcons.add(MythosIcon.spawnRumor);
        }
        // Check for eldritch token placement in effect text
        if (effectText.toLowerCase().contains('eldritch') ||
            rawWikitext.toLowerCase().contains('eldritch')) {
          blueIcons.add(MythosIcon.eldritchToken);
        }
        return blueIcons;
      default:
        return [];
    }
  }

  factory MythosCard.fromJson(Map<String, dynamic> json) {
    // Parse the fullText field to extract card properties
    String fullText = json['fullText'] ?? '';
    final rawWikitext = json['rawWikitext'] ?? '';

    return MythosCard(
      title: json['title'] ?? '',
      pageId: json['pageId'] ?? 0,
      expansion: json['infobox']?['expansion'] ?? json['cardData']?['expansion'] ?? '',
      categories: List<String>.from(json['categories'] ?? []),
      traits: _extractField(fullText, 'Traits'),
      color: _extractField(fullText, 'Color'),
      difficulty: _extractField(fullText, 'Difficulty'),
      flavorText: _extractField(fullText, 'Flavor'),
      effectText: _extractField(fullText, 'Effect'),
      reckoningEffect: _extractField(fullText, 'Reckoning'),
      rawWikitext: rawWikitext,
    );
  }

  /// Effect text from rawWikitext, preserving {{template}} markers for icon rendering.
  String get effectTextRaw => _extractFieldFromRaw(rawWikitext, 'Effect');

  /// Reckoning text from rawWikitext, preserving {{template}} markers for icon rendering.
  String get reckoningEffectRaw => _extractFieldFromRaw(rawWikitext, 'Reckoning');

  static String _extractField(String fullText, String fieldName) {
    final regex = RegExp('\\|$fieldName\\s*=\\s*([^\\|]+)', caseSensitive: false);
    final match = regex.firstMatch(fullText);
    String value = match?.group(1)?.trim() ?? '';
    // Remove trailing template closing braces and whitespace
    value = value.replaceAll(RegExp(r'[\s\n]*\}\}+[\s\n]*$'), '').trim();
    // Also remove any remaining }} anywhere
    value = value.replaceAll('}}', '').trim();
    return value;
  }

  /// Extracts a field from rawWikitext, keeping {{template}} markers intact.
  /// [[Wiki links]] are resolved to their display text.
  static String _extractFieldFromRaw(String rawWikitext, String fieldName) {
    if (rawWikitext.isEmpty) return '';

    // Find the field start (line beginning with |FieldName =)
    final startRegex = RegExp(
      r'^\s*\|' + RegExp.escape(fieldName) + r'\s*=\s*',
      caseSensitive: false,
      multiLine: true,
    );
    final startMatch = startRegex.firstMatch(rawWikitext);
    if (startMatch == null) return '';

    final contentStart = startMatch.end;
    // Find the next field boundary (a line starting with | + letter, or }})
    final nextFieldRegex = RegExp(r'\n\s*(?:\|[A-Za-z]|\}\})', multiLine: true);
    final nextMatch = nextFieldRegex.firstMatch(rawWikitext.substring(contentStart));
    final contentEnd = nextMatch != null
        ? contentStart + nextMatch.start
        : rawWikitext.length;

    String content = rawWikitext.substring(contentStart, contentEnd).trim();

    // Resolve [[Target|Display]] → "Display", [[Target]] → "Target"
    content = content.replaceAllMapped(RegExp(r'\[\[([^\]]+)\]\]'), (m) {
      final text = m.group(1)!;
      final pipe = text.indexOf('|');
      return pipe >= 0 ? text.substring(pipe + 1) : text;
    });

    // Strip wiki bold/italic markers
    content = content.replaceAll("'''", '').replaceAll("''", '');

    return content;
  }

  /// Extract how many eldritch tokens should be placed on this card.
  /// Checks {{Place ET|N}} in rawWikitext first (most reliable), then
  /// falls back to "N Eldritch Token" prose.
  int get eldritchTokenCount {
    // {{Place ET|N}} — the canonical placement template
    final placeET = RegExp(r'\{\{Place ET\|(\d+)\}\}', caseSensitive: false);
    final placeMatch = placeET.firstMatch(rawWikitext);
    if (placeMatch != null) {
      return int.tryParse(placeMatch.group(1) ?? '1') ?? 1;
    }

    // Fallback: prose like "place 4 Eldritch Tokens"
    final prose = RegExp(r'(\d+)\s+[Ee]ldritch\s+[Tt]oken', caseSensitive: false);
    final proseMatch = prose.firstMatch(effectText) ?? prose.firstMatch(rawWikitext);
    if (proseMatch != null) {
      return int.tryParse(proseMatch.group(1) ?? '1') ?? 1;
    }

    return 1;
  }

  /// Returns true if the reckoning effect has meaningful content
  bool get hasReckoning {
    if (reckoningEffect.isEmpty) return false;
    final normalized = reckoningEffect.toLowerCase().replaceAll(RegExp(r'\s+'), '');
    return normalized != 'n/a' && normalized != 'none' && normalized != '-' && normalized.isNotEmpty;
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'pageId': pageId,
      'expansion': expansion,
      'categories': categories,
      'traits': traits,
      'color': color,
      'difficulty': difficulty,
      'flavorText': flavorText,
      'effectText': effectText,
      'reckoningEffect': reckoningEffect,
      'rawWikitext': rawWikitext,
    };
  }

  /// Get cards for a specific stage based on color
  static List<MythosCard> getCardsForStage(
    List<MythosCard> allCards,
    int stage,
    int green,
    int yellow,
    int blue,
  ) {
    final greenCards = allCards.where((c) => c.color.toLowerCase() == 'green').toList();
    final yellowCards = allCards.where((c) => c.color.toLowerCase() == 'yellow').toList();
    final blueCards = allCards.where((c) => c.color.toLowerCase() == 'blue').toList();

    // Shuffle each deck
    greenCards.shuffle();
    yellowCards.shuffle();
    blueCards.shuffle();

    // Take the required number from each
    final stageCards = <MythosCard>[];
    stageCards.addAll(greenCards.take(green));
    stageCards.addAll(yellowCards.take(yellow));
    stageCards.addAll(blueCards.take(blue));

    // Shuffle the stage deck
    stageCards.shuffle();
    return stageCards;
  }
}
