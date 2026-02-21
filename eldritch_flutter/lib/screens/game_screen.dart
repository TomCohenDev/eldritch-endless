import 'dart:math';
import 'package:flutter/material.dart';
import '../models/game_state.dart';
import '../models/timeline_event.dart';
import '../models/encounter.dart';
import '../models/mythos_card.dart';
import '../services/storage_service.dart';
import '../services/gemma_service.dart';
import '../services/data_loader.dart';
import '../theme/eldritch_theme.dart';
import '../widgets/player_bar.dart';
import '../widgets/timeline.dart';
import '../widgets/action_panel.dart';
import '../widgets/encounter_panel.dart';
import '../widgets/mythos_button.dart';
import '../widgets/skill_icon_text.dart';

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
  final GemmaService _gemmaService = GemmaService.instance;
  final DataLoader _dataLoader = DataLoader();
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    _gameState = widget.initialGameState;
    _initializeGemma();
  }

  Future<void> _initializeGemma() async {
    try {
      if (!_gemmaService.isInitialized) {
        await _gemmaService.initialize();
      }
    } catch (e) {
      print('Failed to initialize Gemma: $e');
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

  Future<void> _generateEncounter(EncounterType type, String subType) async {
    final activePlayer = _gameState.activePlayer;
    if (activePlayer == null) return;

    setState(() {
      _isProcessing = true;
    });

    try {
      // Get two random fitting encounter templates for AI selection.
      final encounterTemplates = await _dataLoader.getRandomEncounters(
        type,
        subType: subType,
        count: 2,
      );
      if (encounterTemplates.isEmpty) {
        throw Exception('No encounter found');
      }
      final encounterA = encounterTemplates.first;
      final encounterB = encounterTemplates.length > 1 ? encounterTemplates[1] : encounterTemplates.first;
      Encounter selectedEncounter;
      String generatedText;

      // Try to initialize local AI on demand (if model is installed but not loaded yet).
      if (!_gemmaService.isInitialized) {
        await _initializeGemma();
      }

      if (!_gemmaService.isInitialized) {
        throw Exception(
          'Local AI is not ready. Install/load the model in Settings > Local AI Model.',
        );
      }

      final generatedResult = await _gemmaService.generateEncounter(
        encounterA: encounterA,
        encounterB: encounterB,
        gameState: _gameState,
        requestedType: type,
        requestedSubType: subType,
      );
      generatedText = generatedResult.generatedText;
      selectedEncounter = generatedResult.selectedTemplate == 'B' ? encounterB : encounterA;

      // Create timeline event
      final encounterLabel = subType.trim().isEmpty ? 'General' : subType;
      final event = TimelineEvent.encounter(
        title: '${type.name.toUpperCase()} Encounter: $encounterLabel',
        description: generatedText,
        playerId: activePlayer.id,
        encounterData: selectedEncounter.toJson(),
      );

      final updatedPlayer = activePlayer.addTimelineEvent(event);

      setState(() {
        _gameState = _gameState.updatePlayer(updatedPlayer);
        _isProcessing = false;
      });
      _saveGame();

      // Show encounter dialog
      if (mounted) {
        _showEncounterDialog(generatedText, selectedEncounter);
      }
    } catch (e) {
      setState(() {
        _isProcessing = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error generating encounter: $e'),
            backgroundColor: EldritchColors.bloodSeal,
          ),
        );
      }
    }
  }

  void _showEncounterDialog(String text, Encounter encounter) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: EldritchColors.deepSea,
        title: Row(
          children: [
            const Icon(Icons.auto_stories, color: EldritchColors.occultPurple),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                '${encounter.type.name} Encounter',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.white),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: SkillIconText(
            text: text,
            style: context.eldritchType.loreBody.copyWith(color: Colors.white70),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Future<void> _drawMythos() async {
    setState(() {
      _isProcessing = true;
    });

    try {
      final (newState, card) = _gameState.drawMythosCard();

      if (card == null) {
        throw Exception('No more mythos cards!');
      }

      String generatedText = card.flavorText;

      // Try to generate with Gemma if available
      if (_gemmaService.isInitialized) {
        try {
          generatedText = await _gemmaService.generateMythosText(
            card: card,
            gameState: _gameState,
          );
        } catch (e) {
          print('Gemma generation failed, using original text: $e');
        }
      }

      // Create global timeline event
      final event = TimelineEvent.mythos(
        title: 'MYTHOS: ${card.title}',
        description: '$generatedText\n\n${card.effectText}',
        playerId: 'global',
        mythosData: card.toJson(),
      );

      setState(() {
        _gameState = newState.addGlobalEvent(event);
        _isProcessing = false;
      });
      _saveGame();

      // Show mythos dialog
      if (mounted) {
        _showMythosDialog(card, generatedText);
      }
    } catch (e) {
      setState(() {
        _isProcessing = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: EldritchColors.bloodSeal,
          ),
        );
      }
    }
  }

  void _showMythosDialog(MythosCard card, String generatedText) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: EldritchColors.deepSea,
        title: Row(
          children: [
            Icon(
              Icons.warning_amber,
              color: _getMythosColor(card.color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                card.title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.white),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Flavor text
              Text(
                generatedText,
                style: context.eldritchType.loreBody.copyWith(
                  color: Colors.white70,
                  fontStyle: FontStyle.italic,
                ),
              ),
              const SizedBox(height: 16),
              const Divider(color: Colors.white24),
              const SizedBox(height: 16),
              // Effect text
              const Text(
                'EFFECT',
                style: TextStyle(color: Colors.white54, fontSize: 12, letterSpacing: 2),
              ),
              const SizedBox(height: 8),
              Text(
                card.effectText,
                style: context.eldritchType.loreBody.copyWith(color: Colors.white),
              ),
              if (card.reckoningEffect.isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'RECKONING',
                  style: TextStyle(
                    color: Colors.red,
                    fontSize: 12,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  card.reckoningEffect,
                  style: context.eldritchType.loreQuote.copyWith(color: Colors.white70),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Color _getMythosColor(String color) {
    switch (color.toLowerCase()) {
      case 'green':
        return Colors.green;
      case 'yellow':
        return Colors.orange;
      case 'blue':
        return Colors.blue;
      default:
        return Colors.grey;
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
          // Stage indicator
          Container(
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
          const SizedBox(width: 8),
          // Doom track
          Container(
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
                      onEncounterSelected: _generateEncounter,
                      isProcessing: _isProcessing,
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
                    ),
                  ],
                ),
              ),

              // Bottom: Mythos button
              MythosButton(
                onPressed: _drawMythos,
                isProcessing: _isProcessing,
                cardsRemaining: _gameState.mythosDeck.length,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
