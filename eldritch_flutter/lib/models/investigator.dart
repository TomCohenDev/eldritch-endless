class Investigator {
  final String name;
  final int pageId;
  final String profession;
  final String role;
  final String set;
  final Skills skills;
  final int health;
  final int sanity;
  final String startingLocation;
  final List<StartingEquipment> startingEquipment;
  final String personalStory;
  final String quote;
  final String biography;
  final String abilities;
  final String teamRole;
  final String rulings;
  final String origin;
  final DefeatedEncounters defeatedEncounters;

  Investigator({
    required this.name,
    required this.pageId,
    required this.profession,
    required this.role,
    required this.set,
    required this.skills,
    required this.health,
    required this.sanity,
    required this.startingLocation,
    required this.startingEquipment,
    required this.personalStory,
    required this.quote,
    required this.biography,
    required this.abilities,
    required this.teamRole,
    required this.rulings,
    required this.origin,
    required this.defeatedEncounters,
  });

  factory Investigator.fromJson(Map<String, dynamic> json) {
    return Investigator(
      name: json['name'] ?? '',
      pageId: json['pageId'] ?? 0,
      profession: json['profession'] ?? '',
      role: json['role'] ?? '',
      set: json['set'] ?? '',
      skills: Skills.fromJson(json['skills'] ?? {}),
      health: json['health'] ?? 0,
      sanity: json['sanity'] ?? 0,
      startingLocation: json['startingLocation'] ?? '',
      startingEquipment: (json['startingEquipment'] as List<dynamic>?)
              ?.map((e) => StartingEquipment.fromJson(e))
              .toList() ??
          [],
      personalStory: json['personalStory'] ?? '',
      quote: json['quote'] ?? '',
      biography: json['biography'] ?? '',
      abilities: json['abilities'] ?? '',
      teamRole: json['teamRole'] ?? '',
      rulings: json['rulings'] ?? '',
      origin: json['origin'] ?? '',
      defeatedEncounters:
          DefeatedEncounters.fromJson(json['defeatedEncounters'] ?? {}),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'pageId': pageId,
      'profession': profession,
      'role': role,
      'set': set,
      'skills': skills.toJson(),
      'health': health,
      'sanity': sanity,
      'startingLocation': startingLocation,
      'startingEquipment': startingEquipment.map((e) => e.toJson()).toList(),
      'personalStory': personalStory,
      'quote': quote,
      'biography': biography,
      'abilities': abilities,
      'teamRole': teamRole,
      'rulings': rulings,
      'origin': origin,
      'defeatedEncounters': defeatedEncounters.toJson(),
    };
  }
}

class Skills {
  final int lore;
  final int influence;
  final int observation;
  final int strength;
  final int will;

  Skills({
    required this.lore,
    required this.influence,
    required this.observation,
    required this.strength,
    required this.will,
  });

  factory Skills.fromJson(Map<String, dynamic> json) {
    return Skills(
      lore: json['lore'] ?? 0,
      influence: json['influence'] ?? 0,
      observation: json['observation'] ?? 0,
      strength: json['strength'] ?? 0,
      will: json['will'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'lore': lore,
      'influence': influence,
      'observation': observation,
      'strength': strength,
      'will': will,
    };
  }
}

class StartingEquipment {
  final int count;
  final String item;

  StartingEquipment({
    required this.count,
    required this.item,
  });

  factory StartingEquipment.fromJson(Map<String, dynamic> json) {
    return StartingEquipment(
      count: json['count'] ?? 1,
      item: json['item'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'count': count,
      'item': item,
    };
  }
}

class DefeatedEncounters {
  final String lossOfHealth;
  final String lossOfSanity;

  DefeatedEncounters({
    required this.lossOfHealth,
    required this.lossOfSanity,
  });

  factory DefeatedEncounters.fromJson(Map<String, dynamic> json) {
    return DefeatedEncounters(
      lossOfHealth: json['lossOfHealth'] ?? '',
      lossOfSanity: json['lossOfSanity'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'lossOfHealth': lossOfHealth,
      'lossOfSanity': lossOfSanity,
    };
  }
}
