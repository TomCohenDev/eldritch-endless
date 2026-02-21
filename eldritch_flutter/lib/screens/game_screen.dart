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
import '../widgets/action_panel.dart';
import '../widgets/encounter_panel.dart';
import '../widgets/mythos_button.dart';
import '../widgets/encounter_card_dialog.dart';
import '../widgets/mythos_card_dialog.dart';
import '../widgets/mythos_deck_dialog.dart';
import '../widgets/ending_dialog.dart';

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
  bool _isProcessing = false;

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
      print('Failed to initialize Grok: $e');
      // Show warning but continue - encounters will use raw text
    }
  }

  void _setActivePlayer(String playerId) {
    setState(() {
      _gameState = _gameState.copyWith(activePlayerId: playerId);
    });
    _saveGame();
  }

  void _addActionToTimeline(ActionType actionType) {
    final activePlayer = _gameState.activePlayer;
    if (activePlayer == null) return;

    final event = TimelineEvent.action(
      actionType: actionType,
      playerId: activePlayer.id,
    );

    final updatedPlayer = activePlayer.addTimelineEvent(event);

    setState(() {
      _gameState = _gameState.updatePlayer(updatedPlayer);
    });
    _saveGame();
  }

  void _handleTravel(String destination) {
    final activePlayer = _gameState.activePlayer;
    if (activePlayer == null) return;

    final previousLocation = activePlayer.currentLocation;

    final event = TimelineEvent.action(
      actionType: ActionType.travel,
      playerId: activePlayer.id,
      description: '$previousLocation → $destination',
    );

    final updatedPlayer = activePlayer
        .addTimelineEvent(event)
        .copyWith(currentLocation: destination);

    setState(() {
      _gameState = _gameState.updatePlayer(updatedPlayer);
    });
    _saveGame();
  }

  void _addCustomNote(String title, String description) {
    final activePlayer = _gameState.activePlayer;
    if (activePlayer == null) return;

    final event = TimelineEvent.custom(
      title: title,
      description: description,
      playerId: activePlayer.id,
    );

    final updatedPlayer = activePlayer.addTimelineEvent(event);

    setState(() {
      _gameState = _gameState.updatePlayer(updatedPlayer);
    });
    _saveGame();
  }

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

    final result = await EncounterCardDialog.show(
      context: context,
      encounterType: type,
      subType: subType,
      gameState: _gameState,
    );

    if (result != null) {
      // Update player timeline with the encounter event
      final updatedPlayer = activePlayer.addTimelineEvent(result.event);

      // Mark encounter as used and update state
      setState(() {
        _gameState = _gameState
            .updatePlayer(updatedPlayer)
            .markEncounterUsed(result.encounter.id);
      });
      _saveGame();
    }
  }

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

  void _reorderTimelineEvents(List<TimelineEvent> orderedEvents) {
    if (orderedEvents.isEmpty) return;

    final baseMs = orderedEvents
        .map((e) => e.timestamp.millisecondsSinceEpoch)
        .reduce(min);
    final idToTimestamp = <String, DateTime>{};
    const stepMs = 1000;

    for (int index = 0; index < orderedEvents.length; index++) {
      idToTimestamp[orderedEvents[index].id] = DateTime.fromMillisecondsSinceEpoch(
        baseMs + index * stepMs,
      );
    }

    final updatedPlayers = _gameState.players.map((player) {
      return player.copyWith(
        timeline: player.timeline.map((event) {
          final updatedTs = idToTimestamp[event.id];
          return updatedTs == null ? event : event.copyWith(timestamp: updatedTs);
        }).toList(),
      );
    }).toList();

    final updatedGlobalTimeline = _gameState.globalTimeline.map((event) {
      final updatedTs = idToTimestamp[event.id];
      return updatedTs == null ? event : event.copyWith(timestamp: updatedTs);
    }).toList();

    setState(() {
      _gameState = _gameState.copyWith(
        players: updatedPlayers,
        globalTimeline: updatedGlobalTimeline,
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

    final updatedGlobalTimeline = _gameState.globalTimeline
        .where((e) => e.id != event.id)
        .toList();

    setState(() {
      _gameState = _gameState.copyWith(
        players: updatedPlayers,
        globalTimeline: updatedGlobalTimeline,
        lastPlayedAt: DateTime.now(),
      );
    });
    _saveGame();
  }

  Future<void> _saveGame() async {
    await _storageService.saveGame(_gameState);
  }

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
          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 16),
        ),
        backgroundColor: EldritchColors.deepSea,
        actions: [
          // Stage indicator (tap to show mythos deck)
          GestureDetector(
            onTap: () => MythosDeckDialog.show(
              context: context,
              gameState: _gameState,
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              margin: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                color: EldritchColors.ritual.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'Stage ${_gameState.currentStage}',
                style: context.eldritchType.statusBadge.copyWith(color: EldritchColors.ritual),
              ),
            ),
          ),
          const SizedBox(width: 8),
          // Doom track (tap to generate ending)
          GestureDetector(
            onTap: () => EndingDialog.show(
              context: context,
              gameState: _gameState,
            ),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              margin: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'Doom: ${_gameState.doomTrack}',
                style: context.eldritchType.statusBadge.copyWith(color: Colors.red),
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
              // Player selection bar
              PlayerBar(
                players: _gameState.players,
                activePlayerId: _gameState.activePlayerId,
                onPlayerSelected: _setActivePlayer,
              ),

              // Main content area
              Expanded(
                child: Row(
                  children: [
                    // Left: Encounter panel
                    EncounterPanel(
                      onEncounterSelected: _openEncounterCard,
                      isProcessing: _isProcessing,
                      activePlayer: _gameState.activePlayer,
                    ),

                    // Center: Timeline
                    Expanded(
                      child: Timeline(
                        events: _gameState.players
                            .expand((player) => player.timeline)
                            .toList(),
                        globalEvents: _gameState.globalTimeline,
                        players: _gameState.players,
                    onReorderEvents: _reorderTimelineEvents,
                    onDeleteEvent: _deleteTimelineEvent,
                      ),
                    ),

                    // Right: Action panel
                    ActionPanel(
                      onActionSelected: _addActionToTimeline,
                      onCustomNote: _addCustomNote,
                      onTravel: _handleTravel,
                      activePlayer: _gameState.activePlayer,
                    ),
                  ],
                ),
              ),

              // Bottom: Mythos button
              MythosButton(
                onPressed: _openMythosCard,
                isProcessing: false,
                cardsRemaining: _gameState.mythosDeck.length,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
