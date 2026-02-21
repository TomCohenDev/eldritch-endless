enum EncounterType {
  general,
  location,
  research,
  expedition,
  otherWorld,
  special,
  combat,
}

class Encounter {
  final String id;
  final EncounterType type;
  final String subType; // e.g., "City", "Wilderness", "Sea", specific location name
  final String set;
  final String rawText;
  final String generatedText; // AI-generated encounter text
  final List<SkillTest> skillTests;
  final String imageAsset;

  // Complex encounter sections (expedition, other world, special, etc.)
  final bool isComplex;
  final String initialText;
  final String passEffect;
  final String failEffect;

  Encounter({
    required this.id,
    required this.type,
    required this.subType,
    required this.set,
    required this.rawText,
    this.generatedText = '',
    required this.skillTests,
    required this.imageAsset,
    this.isComplex = false,
    this.initialText = '',
    this.passEffect = '',
    this.failEffect = '',
  });

  factory Encounter.fromJson(Map<String, dynamic> json) {
    return Encounter(
      id: json['id'] ?? json['ID #'] ?? '',
      type: _parseEncounterType(json['type'] ?? 'general'),
      subType: json['subType'] ?? '',
      set: json['set'] ?? json['Set']?['text'] ?? '',
      rawText: json['rawText'] ?? json['Encounter']?['text'] ?? '',
      generatedText: json['generatedText'] ?? '',
      skillTests: _parseSkillTests(json['rawText'] ?? json['Encounter']?['text'] ?? ''),
      imageAsset: json['imageAsset'] ?? _getImageAsset(json['type'] ?? 'general', json['subType'] ?? ''),
    );
  }

  static EncounterType _parseEncounterType(String type) {
    switch (type.toLowerCase()) {
      case 'general':
        return EncounterType.general;
      case 'location':
        return EncounterType.location;
      case 'research':
        return EncounterType.research;
      case 'expedition':
        return EncounterType.expedition;
      case 'otherworld':
      case 'other_world':
        return EncounterType.otherWorld;
      case 'special':
        return EncounterType.special;
      case 'combat':
        return EncounterType.combat;
      default:
        return EncounterType.general;
    }
  }

  static List<SkillTest> _parseSkillTests(String text) {
    final List<SkillTest> tests = [];
    final skillRegex = RegExp(r'\((\w+)\s*(?:-\s*(\d+))?\)');
    final matches = skillRegex.allMatches(text);

    for (final match in matches) {
      final skill = match.group(1)?.toLowerCase() ?? '';
      final modifier = int.tryParse(match.group(2) ?? '0') ?? 0;

      if (['lore', 'influence', 'observation', 'strength', 'will'].contains(skill)) {
        tests.add(SkillTest(skill: skill, modifier: modifier));
      }
    }

    return tests;
  }

  static String _getImageAsset(String type, String subType) {
    switch (type.toLowerCase()) {
      case 'general':
        return 'assets/images/encounter-cards/General_Encounter.webp';
      case 'otherworld':
      case 'other_world':
        return 'assets/images/encounter-cards/Other_World_Encounter.webp';
      default:
        // Try to match location-specific images
        final normalizedSubType = subType.replaceAll(' ', '_');
        return 'assets/images/encounter-cards/${normalizedSubType}_Encounter.webp';
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.name,
      'subType': subType,
      'set': set,
      'rawText': rawText,
      'generatedText': generatedText,
      'skillTests': skillTests.map((e) => e.toJson()).toList(),
      'imageAsset': imageAsset,
      'isComplex': isComplex,
      'initialText': initialText,
      'passEffect': passEffect,
      'failEffect': failEffect,
    };
  }

  Encounter copyWith({
    String? id,
    EncounterType? type,
    String? subType,
    String? set,
    String? rawText,
    String? generatedText,
    List<SkillTest>? skillTests,
    String? imageAsset,
    bool? isComplex,
    String? initialText,
    String? passEffect,
    String? failEffect,
  }) {
    return Encounter(
      id: id ?? this.id,
      type: type ?? this.type,
      subType: subType ?? this.subType,
      set: set ?? this.set,
      rawText: rawText ?? this.rawText,
      generatedText: generatedText ?? this.generatedText,
      skillTests: skillTests ?? this.skillTests,
      imageAsset: imageAsset ?? this.imageAsset,
      isComplex: isComplex ?? this.isComplex,
      initialText: initialText ?? this.initialText,
      passEffect: passEffect ?? this.passEffect,
      failEffect: failEffect ?? this.failEffect,
    );
  }
}

class SkillTest {
  final String skill;
  final int modifier;

  SkillTest({
    required this.skill,
    this.modifier = 0,
  });

  factory SkillTest.fromJson(Map<String, dynamic> json) {
    return SkillTest(
      skill: json['skill'] ?? '',
      modifier: json['modifier'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'skill': skill,
      'modifier': modifier,
    };
  }

  @override
  String toString() {
    if (modifier == 0) {
      return '($skill)';
    }
    return '($skill - $modifier)';
  }
}
