import 'dart:convert';
import 'package:flutter/services.dart';
import '../models/ancient_one.dart';
import '../models/investigator.dart';
import '../models/mythos_card.dart';
import '../models/encounter.dart';

class DataLoader {
  static List<AncientOne>? _cachedAncientOnes;
  static List<Investigator>? _cachedInvestigators;
  static List<MythosCard>? _cachedMythosCards;
  static Map<String, List<Encounter>>? _cachedEncounters;

  /// Load all Ancient Ones from bundled JSON
  Future<List<AncientOne>> loadAncientOnes() async {
    if (_cachedAncientOnes != null) return _cachedAncientOnes!;

    final jsonString = await rootBundle.loadString('assets/json/ancient_ones_detailed.json');
    final List<dynamic> jsonList = jsonDecode(jsonString);
    _cachedAncientOnes = jsonList.map((json) => AncientOne.fromJson(json)).toList();
    return _cachedAncientOnes!;
  }

  /// Load all Investigators from bundled JSON
  Future<List<Investigator>> loadInvestigators() async {
    if (_cachedInvestigators != null) return _cachedInvestigators!;

    final jsonString = await rootBundle.loadString('assets/json/investigators_detailed.json');
    final List<dynamic> jsonList = jsonDecode(jsonString);
    _cachedInvestigators = jsonList.map((json) => Investigator.fromJson(json)).toList();
    return _cachedInvestigators!;
  }

  /// Load all Mythos Cards from bundled JSON
  Future<List<MythosCard>> loadMythosCards() async {
    if (_cachedMythosCards != null) return _cachedMythosCards!;

    final jsonString = await rootBundle.loadString('assets/json/mythos_cards.json');
    final dynamic jsonData = jsonDecode(jsonString);

    // Handle different JSON structures
    if (jsonData is List) {
      _cachedMythosCards = jsonData.map((json) => MythosCard.fromJson(json as Map<String, dynamic>)).toList();
    } else if (jsonData is Map<String, dynamic>) {
      final List<dynamic> cards = jsonData['cards'] ?? jsonData['data'] ?? [];
      _cachedMythosCards = cards.map((json) => MythosCard.fromJson(json as Map<String, dynamic>)).toList();
    } else {
      _cachedMythosCards = [];
    }

    return _cachedMythosCards!;
  }

  /// Load general encounters
  Future<List<Encounter>> loadGeneralEncounters() async {
    return _loadEncounterFile('assets/json/encounters/general-encounter.json', EncounterType.general);
  }

  /// Load location encounters
  Future<List<Encounter>> loadLocationEncounters() async {
    return _loadEncounterFile('assets/json/encounters/location-encounter.json', EncounterType.location);
  }

  /// Load expedition encounters
  Future<List<Encounter>> loadExpeditionEncounters() async {
    return _loadEncounterFile('assets/json/encounters/expedition-encounters.json', EncounterType.expedition);
  }

  /// Load other world encounters
  Future<List<Encounter>> loadOtherWorldEncounters() async {
    return _loadEncounterFile('assets/json/encounters/other-world-encounters.json', EncounterType.otherWorld);
  }

  /// Load special encounters
  Future<List<Encounter>> loadSpecialEncounters() async {
    return _loadEncounterFile('assets/json/encounters/special-encounters.json', EncounterType.special);
  }

  /// Load all encounters
  Future<Map<String, List<Encounter>>> loadAllEncounters() async {
    if (_cachedEncounters != null) return _cachedEncounters!;

    final general = await loadGeneralEncounters();
    final location = await loadLocationEncounters();
    final expedition = await loadExpeditionEncounters();
    final otherWorld = await loadOtherWorldEncounters();
    final special = await loadSpecialEncounters();

    _cachedEncounters = {
      'general': general,
      'location': location,
      'expedition': expedition,
      'otherWorld': otherWorld,
      'special': special,
    };

    return _cachedEncounters!;
  }

  Future<List<Encounter>> _loadEncounterFile(String path, EncounterType type) async {
    try {
      final jsonString = await rootBundle.loadString(path);
      final jsonData = jsonDecode(jsonString);
      final encounters = <Encounter>[];

      if (jsonData is Map<String, dynamic>) {
        // Handle structured encounter format
        final encounterData = jsonData['encounters'] as Map<String, dynamic>?;
        if (encounterData != null) {
          encounterData.forEach((subType, data) {
            if (data is Map<String, dynamic>) {
              final tables = data['tables'] as List<dynamic>? ?? [];
              for (final table in tables) {
                encounters.add(_parseEncounterFromTable(table, type, subType));
              }
            }
          });
        }
      } else if (jsonData is List) {
        // Handle simple array format
        for (final item in jsonData) {
          encounters.add(Encounter.fromJson({
            ...item,
            'type': type.name,
          }));
        }
      }

      return encounters;
    } catch (e) {
      print('Error loading encounters from $path: $e');
      return [];
    }
  }

  Encounter _parseEncounterFromTable(dynamic table, EncounterType type, String subType) {
    final id = table['ID #']?.toString() ?? '';
    final setData = table['Set'];
    final set = setData is Map ? (setData['text'] ?? '') : (setData?.toString() ?? '');
    final encounterData = table['Encounter'];
    final rawText = encounterData is Map ? (encounterData['text'] ?? '') : (encounterData?.toString() ?? '');

    return Encounter(
      id: id,
      type: type,
      subType: subType,
      set: set,
      rawText: rawText,
      skillTests: [],
      imageAsset: _getImageAsset(type, subType),
    );
  }

  String _getImageAsset(EncounterType type, String subType) {
    switch (type) {
      case EncounterType.general:
        if (subType.contains('City')) {
          return 'assets/images/encounter-cards/General_Encounter.webp';
        } else if (subType.contains('Wilderness')) {
          return 'assets/images/encounter-cards/General_Encounter.webp';
        } else if (subType.contains('Sea')) {
          return 'assets/images/encounter-cards/General_Encounter.webp';
        }
        return 'assets/images/encounter-cards/General_Encounter.webp';
      case EncounterType.otherWorld:
        return 'assets/images/encounter-cards/Other_World_Encounter.webp';
      case EncounterType.expedition:
        return 'assets/images/encounter-cards/Africa_Encounter.webp';
      default:
        return 'assets/images/encounter-cards/General_Encounter.webp';
    }
  }

  /// Get a random encounter of a specific type
  Future<Encounter?> getRandomEncounter(EncounterType type, {String? subType}) async {
    final filtered = await _getFilteredEncounters(type, subType: subType);

    if (filtered.isEmpty) return null;

    filtered.shuffle();
    return filtered.first;
  }

  /// Get multiple random encounters of a specific type/subtype (without duplicates)
  Future<List<Encounter>> getRandomEncounters(
    EncounterType type, {
    String? subType,
    int count = 2,
  }) async {
    final filtered = await _getFilteredEncounters(type, subType: subType);
    if (filtered.isEmpty) return [];

    filtered.shuffle();
    final maxCount = count < 1 ? 1 : count;
    return filtered.take(maxCount).toList();
  }

  Future<List<Encounter>> _getFilteredEncounters(
    EncounterType type, {
    String? subType,
  }) async {
    final allEncounters = await loadAllEncounters();
    final typeEncounters = allEncounters[type.name] ?? [];

    if (typeEncounters.isEmpty) return [];
    final normalizedSubType = subType?.trim().toLowerCase();
    if (normalizedSubType == null ||
        normalizedSubType.isEmpty ||
        normalizedSubType == 'general' ||
        normalizedSubType == 'general encounter') {
      return [...typeEncounters];
    }
    return typeEncounters.where((e) => e.subType == subType).toList();
  }

  /// Clear cached data (useful for testing or memory management)
  void clearCache() {
    _cachedAncientOnes = null;
    _cachedInvestigators = null;
    _cachedMythosCards = null;
    _cachedEncounters = null;
  }
}
