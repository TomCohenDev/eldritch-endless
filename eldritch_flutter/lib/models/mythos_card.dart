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

  factory MythosCard.fromJson(Map<String, dynamic> json) {
    // Parse the fullText field to extract card properties
    String fullText = json['fullText'] ?? '';

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
      rawWikitext: json['rawWikitext'] ?? '',
    );
  }

  static String _extractField(String fullText, String fieldName) {
    final regex = RegExp('\\|$fieldName\\s*=\\s*([^\\|]+)', caseSensitive: false);
    final match = regex.firstMatch(fullText);
    return match?.group(1)?.trim() ?? '';
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
