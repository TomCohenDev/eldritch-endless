import 'dart:math';
import 'package:flutter/material.dart';
import '../models/game_state.dart';
import '../models/timeline_event.dart';
import '../models/encounter.dart';
import '../services/storage_service.dart';
import '../services/grok_service.dart';
import '../theme/eldritch_theme.dart';
import '../widgets/player_bar.dart';
import '../widgets/timeline.dart';
import '../widgets/story_panel.dart';
import '../widgets/encounter_panel.dart';
import '../widgets/encounter_card_dialog.dart';
import '../widgets/mythos_card_dialog.dart';
import '../widgets/mythos_deck_dialog.dart';
import '../widgets/ending_dialog.dart';
import '../widgets/add_investigator_dialog.dart';
import '../models/player.dart';

class GameScreen extends StatefulWidget {
  final GameState initialGameState;

  const GameScreen({
    super.key,
    required this.initialGameState,
  });

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  late GameState _gameState;
  final StorageService _storageService = StorageService();
  final GrokService _grokService = GrokService.instance;
  final bool _isProcessing = false;

  // ── Location data ────────────────────────────────────────────────────────

  static const _cities = [
    'Arkham', 'Buenos Aires', 'Istanbul', 'London', 'Rome',
    'San Francisco', 'Shanghai', 'Sydney', 'Tokyo',
  ];

  static const _wilderness = [
    'The Amazon', 'Antarctica', 'Heart of Africa',
    'The Himalayas', 'The Pyramids', 'Tunguska',
  ];

  static const _numberedSpaces = [
    'Space 1',  'Space 2',  'Space 3',  'Space 4',  'Space 5',
    'Space 6',  'Space 7',  'Space 8',  'Space 9',  'Space 10',
    'Space 11', 'Space 12', 'Space 13', 'Space 14', 'Space 15',
    'Space 16', 'Space 17', 'Space 18', 'Space 19', 'Space 20',
    'Space 21',
  ];

  static const _spaceLabels = {
    'Space 1': 'Alaskan Coast',       'Space 2': 'North Pacific',
    'Space 3': 'South Pacific',       'Space 4': 'Canadian Wilderness',
    'Space 5': 'Heartland',           'Space 6': 'Deep South',
    'Space 7': 'Central America',     'Space 8': 'Caribbean',
    'Space 9': 'Greenland',           'Space 10': 'West Africa',
    'Space 11': 'South Atlantic',     'Space 12': 'Southern Ocean',
    'Space 13': 'Arctic Ocean',       'Space 14': 'Northern Europe',
    'Space 15': 'South Africa',       'Space 16': 'Central Russia',
    'Space 17': 'Urban India',        'Space 18': 'Indian Ocean',
    'Space 19': 'Eastern Siberia',    'Space 20': 'South East Asia',
    'Space 21': 'Northern Territories',
  };

  static const _expeditionMap = {
    'The Amazon': 'The Amazon',    'Amazon': 'The Amazon',
    'Antarctica': 'Antarctica',
    'Heart of Africa': 'Heart of Africa',
    'The Himalayas': 'The Himalayas', 'Himalayas': 'The Himalayas',
    'The Pyramids': 'The Pyramids',   'Pyramids': 'The Pyramids',
    'Tunguska': 'Tunguska',
  };

  // ── Lifecycle ────────────────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    _gameState = widget.initialGameState;
    _initializeGrok();
  }

  Future<void> _initializeGrok() async {
    try {
      if (!_grokService.isInitialized) {
        await _grokService.initialize();
      }
    } catch (e) {
      debugPrint('Failed to initialize Grok: $e');
    }
  }

  // ── Player actions ───────────────────────────────────────────────────────

  void _setActivePlayer(String playerId) {
    setState(() {
      _gameState = _gameState.copyWith(activePlayerId: playerId);
    });
    _saveGame();
  }

  void _handlePlayerDeath(String playerId) {
    final target = _gameState.players.where((p) => p.id == playerId).firstOrNull;
    if (target == null) return;

    final deathEvent = TimelineEvent.action(
      actionType: ActionType.death,
      playerId: target.id,
      description: '${target.displayName} has fallen.',
    );
    final deadPlayer = target
        .copyWith(isDead: true)
        .addTimelineEvent(deathEvent);

    setState(() {
      _gameState = _gameState.updatePlayer(deadPlayer);
    });
    _saveGame();
  }

  void _handleCustomEvent(
      String title, String description, String playerId) {
    final event = TimelineEvent.custom(
      title: title,
      description: description,
      playerId: playerId,
    );
    if (playerId == 'global') {
      setState(() {
        _gameState = _gameState.addGlobalEvent(event);
      });
    } else {
      final player =
          _gameState.players.where((p) => p.id == playerId).firstOrNull;
      if (player == null) return;
      setState(() {
        _gameState =
            _gameState.updatePlayer(player.addTimelineEvent(event));
      });
    }
    _saveGame();
  }

  Future<void> _handleAddInvestigator() async {
    final existingNames =
        _gameState.players.map((p) => p.investigator.name).toSet();

    final selected = await AddInvestigatorDialog.show(
      context: context,
      existingInvestigatorNames: existingNames,
    );
    if (selected == null) return;

    final newPlayer = Player(investigator: selected);
    final joinEvent = TimelineEvent.placement(
      investigatorName: selected.name.replaceAll('"', ''),
      location: selected.startingLocation,
      playerId: newPlayer.id,
    );

    setState(() {
      _gameState = _gameState.addPlayer(newPlayer.addTimelineEvent(joinEvent));
    });
    _saveGame();
  }

  // ── Encounter with location picker ──────────────────────────────────────

  Future<void> _openEncounterCard(EncounterType type, String subType) async {
    final activePlayer = _gameState.activePlayer;
    if (activePlayer == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select an active player first'),
          backgroundColor: EldritchColors.bloodSeal,
        ),
      );
      return;
    }

    // Step 1 — ask where the investigator is
    final selectedLocation =
        await _showLocationPicker(activePlayer.currentLocation);
    if (selectedLocation == null || !mounted) return;

    // Step 2 — update player location and record travel if it changed
    GameState stateForEncounter = _gameState;
    if (selectedLocation != activePlayer.currentLocation) {
      final travelEvent = TimelineEvent.action(
        actionType: ActionType.travel,
        playerId: activePlayer.id,
        description: '${activePlayer.currentLocation} → $selectedLocation',
      );
      final movedPlayer = activePlayer
          .addTimelineEvent(travelEvent)
          .copyWith(currentLocation: selectedLocation);
      stateForEncounter = _gameState.updatePlayer(movedPlayer);
      setState(() {
        _gameState = stateForEncounter;
      });
      _saveGame();
    }

    // Step 3 — resolve subType from the chosen location
    final effectiveSubType = _resolveSubType(type, subType, selectedLocation);

    // Step 4 — show encounter card
    if (!mounted) return;
    final result = await EncounterCardDialog.show(
      context: context,
      encounterType: type,
      subType: effectiveSubType,
      gameState: stateForEncounter,
    );

    if (result != null && mounted) {
      final freshPlayer = stateForEncounter.activePlayer;
      if (freshPlayer == null) return;
      setState(() {
        _gameState = stateForEncounter
            .updatePlayer(freshPlayer.addTimelineEvent(result.event))
            .markEncounterUsed(result.encounter.id);
      });
      _saveGame();
    }
  }

  /// Determines the encounter subType from the chosen location.
  /// General → 'City/Wilderness/Sea Encounters'; Location → city name;
  /// Expedition → expedition name; others unchanged.
  String _resolveSubType(EncounterType type, String original, String location) {
    if (type == EncounterType.general) {
      return _generalSubTypeFromLocation(location);
    }
    if (type == EncounterType.location) {
      return _cityFromLocation(location) ?? original;
    }
    if (type == EncounterType.expedition) {
      return _expeditionFromLocation(location) ?? original;
    }
    return original;
  }

  // Numbered space → location category used for general encounter filtering.
  static const _spaceLocationTypes = {
    'Space 1': 'city',       'Space 2': 'sea',        'Space 3': 'sea',
    'Space 4': 'wilderness', 'Space 5': 'city',        'Space 6': 'city',
    'Space 7': 'city',       'Space 8': 'sea',         'Space 9': 'wilderness',
    'Space 10': 'wilderness','Space 11': 'sea',        'Space 12': 'sea',
    'Space 13': 'sea',       'Space 14': 'city',       'Space 15': 'city',
    'Space 16': 'city',      'Space 17': 'city',       'Space 18': 'sea',
    'Space 19': 'wilderness','Space 20': 'city',       'Space 21': 'wilderness',
  };

  /// Maps a selected location to the subType key used in general-encounter.json.
  String _generalSubTypeFromLocation(String location) {
    // Numbered spaces have a fixed type
    final spaceType = _spaceLocationTypes[location];
    if (spaceType != null) return _locTypeToSubType(spaceType);

    final loc = location.toLowerCase();

    for (final city in _cities) {
      if (loc.contains(city.toLowerCase())) return 'City Encounters';
    }
    for (final wild in _wilderness) {
      if (loc.contains(wild.toLowerCase())) return 'Wilderness Encounters';
    }
    const seaKeywords = [
      'sea', 'ocean', 'atlantic', 'pacific', 'indian', 'arctic', 'antarctic',
    ];
    for (final keyword in seaKeywords) {
      if (loc.contains(keyword)) return 'Sea Encounters';
    }
    return 'City Encounters';
  }

  String _locTypeToSubType(String type) {
    switch (type) {
      case 'sea':        return 'Sea Encounters';
      case 'wilderness': return 'Wilderness Encounters';
      default:           return 'City Encounters';
    }
  }

  String? _cityFromLocation(String location) {
    for (final city in _cities) {
      if (location.toLowerCase().contains(city.toLowerCase())) return city;
    }
    return null;
  }

  String? _expeditionFromLocation(String location) {
    for (final entry in _expeditionMap.entries) {
      if (location.toLowerCase().contains(entry.key.toLowerCase())) {
        return entry.value;
      }
    }
    return null;
  }

  // ── Location picker (full travel menu) ──────────────────────────────────

  Future<String?> _showLocationPicker(String currentLocation) {
    final searchController = TextEditingController();
    final maxHeight = MediaQuery.of(context).size.height * 0.6;
    final activePlayer = _gameState.activePlayer;
    final imagePath = activePlayer != null
        ? 'assets/investigator_images/${activePlayer.investigator.name.replaceAll('"', '').replaceAll(' ', '_').replaceAll("'", '%27')}.webp'
        : null;

    return showModalBottomSheet<String>(
      context: context,
      backgroundColor: EldritchColors.deepSea,
      isScrollControlled: true,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (sheetContext, setSheetState) {
            final query = searchController.text;
            final bottomInset =
                MediaQuery.of(sheetContext).viewInsets.bottom;

            final filteredCities = _cities
                .where((l) => _matchesSearch(l, query))
                .toList();
            final filteredWilderness = _wilderness
                .where((l) => _matchesSearch(l, query))
                .toList();
            final filteredOther = _numberedSpaces
                .where((l) => _matchesSearch(l, query))
                .toList();

            return Padding(
              padding: EdgeInsets.only(bottom: bottomInset),
              child: SafeArea(
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxHeight: maxHeight),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Investigator portrait + name/location
                            if (activePlayer != null)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 12),
                                child: Row(
                                  children: [
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(8),
                                      child: Image.asset(
                                        imagePath!,
                                        width: 72,
                                        height: 90,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) =>
                                            Container(
                                          width: 72,
                                          height: 90,
                                          decoration: BoxDecoration(
                                            color: EldritchColors.leatherMid,
                                            borderRadius:
                                                BorderRadius.circular(8),
                                          ),
                                          child: const Icon(
                                            Icons.person,
                                            color: EldritchColors.occultPurple,
                                            size: 36,
                                          ),
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            activePlayer.investigator.name
                                                .replaceAll('"', ''),
                                            style: const TextStyle(
                                              color:
                                                  EldritchColors.parchmentLight,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 15,
                                            ),
                                          ),
                                          if (currentLocation.isNotEmpty) ...[
                                            const SizedBox(height: 4),
                                            Text(
                                              currentLocation,
                                              style: const TextStyle(
                                                color: EldritchColors.fadedText,
                                                fontSize: 12,
                                              ),
                                            ),
                                          ],
                                          const SizedBox(height: 8),
                                          const Text(
                                            'Where are you?',
                                            style: TextStyle(
                                              color:
                                                  EldritchColors.parchmentLight,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 16,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            else ...[
                              if (currentLocation.isNotEmpty)
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 4),
                                  child: Text(
                                    'Current: $currentLocation',
                                    style: const TextStyle(
                                      color: EldritchColors.fadedText,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                              const Text(
                                'Where are you?',
                                style: TextStyle(
                                  color: EldritchColors.parchmentLight,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                            ],
                            const SizedBox(height: 8),
                            TextField(
                              controller: searchController,
                              onChanged: (_) => setSheetState(() {}),
                              style: const TextStyle(
                                color: EldritchColors.parchmentLight,
                                fontSize: 14,
                              ),
                              decoration: InputDecoration(
                                hintText: 'Search locations...',
                                hintStyle: TextStyle(
                                  color: EldritchColors.fadedText
                                      .withValues(alpha: 0.6),
                                  fontSize: 13,
                                ),
                                prefixIcon: const Icon(
                                  Icons.search,
                                  color: EldritchColors.fadedText,
                                  size: 20,
                                ),
                                suffixIcon: query.isNotEmpty
                                    ? IconButton(
                                        icon: const Icon(Icons.clear,
                                            color: EldritchColors.fadedText,
                                            size: 18),
                                        onPressed: () {
                                          searchController.clear();
                                          setSheetState(() {});
                                        },
                                      )
                                    : null,
                                filled: true,
                                fillColor: EldritchColors.storm,
                                isDense: true,
                                contentPadding:
                                    const EdgeInsets.symmetric(
                                        horizontal: 12, vertical: 10),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: BorderSide.none,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Flexible(
                        child: SingleChildScrollView(
                          padding:
                              const EdgeInsets.fromLTRB(16, 0, 16, 16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (filteredCities.isNotEmpty) ...[
                                _buildLocationSection(
                                    'CITIES', filteredCities,
                                    currentLocation, Colors.orange,
                                    sheetContext),
                                const SizedBox(height: 12),
                              ],
                              if (filteredWilderness.isNotEmpty) ...[
                                _buildLocationSection(
                                    'WILDERNESS', filteredWilderness,
                                    currentLocation, Colors.teal,
                                    sheetContext),
                                const SizedBox(height: 12),
                              ],
                              if (filteredOther.isNotEmpty)
                                _buildLocationSection(
                                    'OTHER', filteredOther,
                                    currentLocation, Colors.blueGrey,
                                    sheetContext),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  bool _matchesSearch(String loc, String query) {
    if (query.isEmpty) return true;
    final q = query.toLowerCase();
    if (loc.toLowerCase().contains(q)) return true;
    final label = _spaceLabels[loc];
    return label != null && label.toLowerCase().contains(q);
  }

  Widget _buildLocationSection(String label, List<String> locations,
      String currentLoc, Color color, BuildContext sheetContext) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: EldritchColors.fadedText,
            fontSize: 10,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 6),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: locations
              .map((loc) =>
                  _buildLocationChip(sheetContext, loc, currentLoc, color))
              .toList(),
        ),
      ],
    );
  }

  Widget _buildLocationChip(BuildContext sheetContext, String loc,
      String currentLoc, Color color) {
    final isCurrent = currentLoc.toLowerCase() == loc.toLowerCase();
    final regionLabel = _spaceLabels[loc];
    final displayText =
        regionLabel != null ? '$loc — $regionLabel' : loc;

    return ActionChip(
      label: Text(displayText),
      backgroundColor: isCurrent ? color : EldritchColors.storm,
      labelStyle: TextStyle(
        color: EldritchColors.parchmentLight,
        fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
        fontSize: 12,
      ),
      onPressed: () => Navigator.pop(sheetContext, loc),
    );
  }

  // ── Mythos ───────────────────────────────────────────────────────────────

  Future<void> _openMythosCard() async {
    final result = await MythosCardDialog.show(
      context: context,
      gameState: _gameState,
    );

    if (result != null) {
      setState(() {
        _gameState = result.updatedGameState.addGlobalEvent(result.event);
      });
      _saveGame();
    }
  }

  // ── Timeline management ──────────────────────────────────────────────────

  void _reorderTimelineEvents(List<TimelineEvent> orderedEvents) {
    if (orderedEvents.isEmpty) return;

    final baseMs = orderedEvents
        .map((e) => e.timestamp.millisecondsSinceEpoch)
        .reduce(min);
    const stepMs = 1000;
    final idToTimestamp = <String, DateTime>{
      for (var i = 0; i < orderedEvents.length; i++)
        orderedEvents[i].id: DateTime.fromMillisecondsSinceEpoch(
            baseMs + i * stepMs),
    };

    final updatedPlayers = _gameState.players.map((player) {
      return player.copyWith(
        timeline: player.timeline.map((event) {
          final ts = idToTimestamp[event.id];
          return ts == null ? event : event.copyWith(timestamp: ts);
        }).toList(),
      );
    }).toList();

    final updatedGlobal = _gameState.globalTimeline.map((event) {
      final ts = idToTimestamp[event.id];
      return ts == null ? event : event.copyWith(timestamp: ts);
    }).toList();

    setState(() {
      _gameState = _gameState.copyWith(
        players: updatedPlayers,
        globalTimeline: updatedGlobal,
        lastPlayedAt: DateTime.now(),
      );
    });
    _saveGame();
  }

  void _deleteTimelineEvent(TimelineEvent event) {
    final updatedPlayers = _gameState.players.map((player) {
      return player.copyWith(
        timeline: player.timeline.where((e) => e.id != event.id).toList(),
      );
    }).toList();

    final updatedGlobal = _gameState.globalTimeline
        .where((e) => e.id != event.id)
        .toList();

    setState(() {
      _gameState = _gameState.copyWith(
        players: updatedPlayers,
        globalTimeline: updatedGlobal,
        lastPlayedAt: DateTime.now(),
      );
    });
    _saveGame();
  }

  // ── Persistence ──────────────────────────────────────────────────────────

  Future<void> _saveGame() async {
    await _storageService.saveGame(_gameState);
  }

  // ── Build ────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EldritchColors.parchmentWarm,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        leading: IconButton(
          icon: const Icon(Icons.home),
          onPressed: () => Navigator.of(context).pop(),
          tooltip: 'Home',
        ),
        title: Text(
          'vs ${_gameState.ancientOne.name}',
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontSize: 16),
        ),
        backgroundColor: EldritchColors.deepSea,
        actions: [
          GestureDetector(
            onTap: () => MythosDeckDialog.show(
                context: context, gameState: _gameState),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              margin: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                color: EldritchColors.ritual.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'Stage ${_gameState.currentStage}',
                style: context.eldritchType.statusBadge
                    .copyWith(color: EldritchColors.ritual),
              ),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () => EndingDialog.show(
                context: context, gameState: _gameState),
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              margin: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'Doom: ${_gameState.doomTrack}',
                style: context.eldritchType.statusBadge
                    .copyWith(color: Colors.red),
              ),
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Stack(
        children: [
          const ParchmentBackground(),
          Column(
            children: [
              // Player bar
              PlayerBar(
                players: _gameState.players,
                activePlayerId: _gameState.activePlayerId,
                onPlayerSelected: _setActivePlayer,
                onAddInvestigator: _handleAddInvestigator,
              ),

              // Main area
              Expanded(
                child: Row(
                  children: [
                    // Left: Encounter panel
                    EncounterPanel(
                      onEncounterSelected: _openEncounterCard,
                      isProcessing: _isProcessing,
                    ),

                    // Center: Timeline
                    Expanded(
                      child: Timeline(
                        events: _gameState.players
                            .expand((p) => p.timeline)
                            .toList(),
                        globalEvents: _gameState.globalTimeline,
                        players: _gameState.players,
                        onReorderEvents: _reorderTimelineEvents,
                        onDeleteEvent: _deleteTimelineEvent,
                      ),
                    ),

                    // Right: Story panel
                    StoryPanel(
                      players: _gameState.players,
                      activePlayerId: _gameState.activePlayerId,
                      onMythos: _openMythosCard,
                      onPlayerDeath: _handlePlayerDeath,
                      onAddInvestigator: _handleAddInvestigator,
                      onCustomEvent: _handleCustomEvent,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
