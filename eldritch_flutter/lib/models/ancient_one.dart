class AncientOne {
  final String name;
  final List<String> titles;
  final int pageId;
  final String difficulty;
  final int startingDoom;
  final int mythosDeckSize;
  final String mysteries;
  final String set;
  final String epithet;
  final String shortDescription;
  final String lore;
  final String appearance;
  final String residence;
  final String disposition;
  final String source;
  final String gameplayRules;
  final String setupInstructions;
  final String awakeningTitle;
  final String awakeningFlavor;
  final String awakeningEffects;
  final String finalMystery;
  final List<String> mysteryNames;
  final MythosDeck mythosDeck;
  final Map<String, List<ResearchEncounter>> researchEncounterDetails;

  AncientOne({
    required this.name,
    required this.titles,
    required this.pageId,
    required this.difficulty,
    required this.startingDoom,
    required this.mythosDeckSize,
    required this.mysteries,
    required this.set,
    required this.epithet,
    required this.shortDescription,
    required this.lore,
    required this.appearance,
    required this.residence,
    required this.disposition,
    required this.source,
    required this.gameplayRules,
    required this.setupInstructions,
    required this.awakeningTitle,
    required this.awakeningFlavor,
    required this.awakeningEffects,
    required this.finalMystery,
    required this.mysteryNames,
    required this.mythosDeck,
    required this.researchEncounterDetails,
  });

  factory AncientOne.fromJson(Map<String, dynamic> json) {
    return AncientOne(
      name: json['name'] ?? '',
      titles: List<String>.from(json['titles'] ?? []),
      pageId: json['pageId'] ?? 0,
      difficulty: json['difficulty'] ?? '',
      startingDoom: json['startingDoom'] ?? 0,
      mythosDeckSize: json['mythosDeckSize'] ?? 0,
      mysteries: json['mysteries'] ?? '',
      set: json['set'] ?? '',
      epithet: json['epithet'] ?? '',
      shortDescription: json['shortDescription'] ?? '',
      lore: json['lore'] ?? '',
      appearance: json['appearance'] ?? '',
      residence: json['residence'] ?? '',
      disposition: json['disposition'] ?? '',
      source: json['source'] ?? '',
      gameplayRules: json['gameplayRules'] ?? '',
      setupInstructions: json['setupInstructions'] ?? '',
      awakeningTitle: json['awakeningTitle'] ?? '',
      awakeningFlavor: json['awakeningFlavor'] ?? '',
      awakeningEffects: json['awakeningEffects'] ?? '',
      finalMystery: json['finalMystery'] ?? '',
      mysteryNames: List<String>.from(json['mysteryNames'] ?? []),
      mythosDeck: MythosDeck.fromJson(json['mythosDeck'] ?? {}),
      researchEncounterDetails: _parseResearchEncounters(json['researchEncounterDetails']),
    );
  }

  static Map<String, List<ResearchEncounter>> _parseResearchEncounters(dynamic data) {
    if (data == null) return {};
    final Map<String, List<ResearchEncounter>> result = {};
    if (data is Map<String, dynamic>) {
      data.forEach((key, value) {
        if (value is List) {
          result[key] = value.map((e) => ResearchEncounter.fromJson(e)).toList();
        }
      });
    }
    return result;
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'titles': titles,
      'pageId': pageId,
      'difficulty': difficulty,
      'startingDoom': startingDoom,
      'mythosDeckSize': mythosDeckSize,
      'mysteries': mysteries,
      'set': set,
      'epithet': epithet,
      'shortDescription': shortDescription,
      'lore': lore,
      'appearance': appearance,
      'residence': residence,
      'disposition': disposition,
      'source': source,
      'gameplayRules': gameplayRules,
      'setupInstructions': setupInstructions,
      'awakeningTitle': awakeningTitle,
      'awakeningFlavor': awakeningFlavor,
      'awakeningEffects': awakeningEffects,
      'finalMystery': finalMystery,
      'mysteryNames': mysteryNames,
      'mythosDeck': mythosDeck.toJson(),
      'researchEncounterDetails': researchEncounterDetails.map(
        (key, value) => MapEntry(key, value.map((e) => e.toJson()).toList()),
      ),
    };
  }
}

class MythosDeck {
  final StageComposition stage1;
  final StageComposition stage2;
  final StageComposition stage3;

  MythosDeck({
    required this.stage1,
    required this.stage2,
    required this.stage3,
  });

  factory MythosDeck.fromJson(Map<String, dynamic> json) {
    return MythosDeck(
      stage1: StageComposition.fromJson(json['stage1'] ?? {}),
      stage2: StageComposition.fromJson(json['stage2'] ?? {}),
      stage3: StageComposition.fromJson(json['stage3'] ?? {}),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'stage1': stage1.toJson(),
      'stage2': stage2.toJson(),
      'stage3': stage3.toJson(),
    };
  }
}

class StageComposition {
  final int green;
  final int yellow;
  final int blue;

  StageComposition({
    required this.green,
    required this.yellow,
    required this.blue,
  });

  factory StageComposition.fromJson(Map<String, dynamic> json) {
    return StageComposition(
      green: int.tryParse(json['green']?.toString() ?? '0') ?? 0,
      yellow: int.tryParse(json['yellow']?.toString() ?? '0') ?? 0,
      blue: int.tryParse(json['blue']?.toString() ?? '0') ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'green': green.toString(),
      'yellow': yellow.toString(),
      'blue': blue.toString(),
    };
  }
}

class ResearchEncounter {
  final String id;
  final String expansion;
  final String description;

  ResearchEncounter({
    required this.id,
    required this.expansion,
    required this.description,
  });

  factory ResearchEncounter.fromJson(Map<String, dynamic> json) {
    return ResearchEncounter(
      id: json['id'] ?? '',
      expansion: json['expansion'] ?? json['Set'] ?? '',
      description: json['description'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'expansion': expansion,
      'description': description,
    };
  }
}
