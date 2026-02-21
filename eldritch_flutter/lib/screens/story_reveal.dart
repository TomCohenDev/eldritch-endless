import 'dart:async';
import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import '../models/ancient_one.dart';
import '../models/investigator.dart';
import '../models/player.dart';
import '../models/game_state.dart';
import '../models/timeline_event.dart';
import '../theme/eldritch_theme.dart';
import '../services/storage_service.dart';
import '../services/elevenlabs_service.dart';
import 'game_screen.dart';

class StoryReveal extends StatefulWidget {
  final AncientOne selectedAncientOne;
  final List<Investigator> selectedInvestigators;
  final NarratorVoice selectedVoice;
  final StoryGeneration storyGeneration;

  const StoryReveal({
    super.key,
    required this.selectedAncientOne,
    required this.selectedInvestigators,
    required this.selectedVoice,
    required this.storyGeneration,
  });

  @override
  State<StoryReveal> createState() => _StoryRevealState();
}

class _StoryRevealState extends State<StoryReveal> {
  final ScrollController _scrollController = ScrollController();
  final StorageService _storageService = StorageService();
  bool _isCreatingGame = false;

  // Narration state
  ElevenLabsService? _elevenLabsService;
  bool _isGeneratingAudio = false;
  bool _isPlaying = false;
  bool _hasAudio = false;
  String? _audioFilePath;
  String? _narrationError;
  bool _hasElevenLabsKey = false;
  Duration _playPosition = Duration.zero;
  Duration? _playDuration;
  StreamSubscription<Duration>? _positionSubscription;
  StreamSubscription<Duration?>? _durationSubscription;

  @override
  void initState() {
    super.initState();
    _logStoryData();
    _checkElevenLabsKey();
  }

  void _cancelPlaybackSubscriptions() {
    _positionSubscription?.cancel();
    _positionSubscription = null;
    _durationSubscription?.cancel();
    _durationSubscription = null;
  }

  @override
  void dispose() {
    _cancelPlaybackSubscriptions();
    _elevenLabsService?.dispose();
    super.dispose();
  }

  Future<void> _checkElevenLabsKey() async {
    final key = await _storageService.getElevenLabsApiKey();
    setState(() {
      _hasElevenLabsKey = key != null && key.isNotEmpty;
    });
    print('[StoryReveal] ElevenLabs API key present: $_hasElevenLabsKey');
  }

  void _logStoryData() {
    print('[StoryReveal] ====== STORY REVEAL SCREEN LOADED ======');
    print('[StoryReveal] Ancient One: ${widget.selectedAncientOne.name}');
    print(
        '[StoryReveal] Investigators: ${widget.selectedInvestigators.length}');
    print('[StoryReveal] Voice: ${widget.selectedVoice.name}');
    print(
        '[StoryReveal] Voice ElevenLabs ID: ${widget.selectedVoice.elevenLabsId}');
    print('[StoryReveal]');
    print('[StoryReveal] --- STORY GENERATION DATA ---');
    print('[StoryReveal] Ancient One Hook (display):');
    print('[StoryReveal] "${widget.storyGeneration.ancientOneHook}"');
    print('[StoryReveal]');
    print('[StoryReveal] Ancient One Hook (narration with tags):');
    print('[StoryReveal] "${widget.storyGeneration.ancientOneHookNarration}"');
    print('[StoryReveal]');
    print(
        '[StoryReveal] Investigator Stories (${widget.storyGeneration.investigatorStories.length}):');
    if (widget.storyGeneration.investigatorStories.isEmpty) {
      print('[StoryReveal] WARNING: No investigator stories!');
    }
    for (int i = 0;
        i < widget.storyGeneration.investigatorStories.length;
        i++) {
      final story = widget.storyGeneration.investigatorStories[i];
      print('[StoryReveal]   [$i] ${story.name}:');
      print('[StoryReveal]       Display: "${story.story}"');
      print('[StoryReveal]       Narration: "${story.storyNarration}"');
    }
    print('[StoryReveal]');
    print('[StoryReveal] Full Narration Script:');
    print('[StoryReveal] "${widget.storyGeneration.fullNarrationScript}"');
    print('[StoryReveal] ====== END STORY DATA ======');
  }

  Future<void> _generateAndPlayNarration() async {
    print('[StoryReveal] _generateAndPlayNarration called');

    // Get API key
    final apiKey = await _storageService.getElevenLabsApiKey();
    if (apiKey == null || apiKey.isEmpty) {
      setState(() {
        _narrationError =
            'ElevenLabs API key not configured. Add it in Settings.';
      });
      print('[StoryReveal] ERROR: No ElevenLabs API key');
      return;
    }

    setState(() {
      _isGeneratingAudio = true;
      _narrationError = null;
    });

    try {
      // Initialize service if needed
      _elevenLabsService ??= ElevenLabsService(apiKey: apiKey);

      // Get the full narration script with audio tags
      final narrationText = widget.storyGeneration.fullNarrationScript;

      print('[StoryReveal] Generating audio for narration...');
      print('[StoryReveal] Using voice: ${widget.selectedVoice.elevenLabsId}');
      print(
          '[StoryReveal] Narration text length: ${narrationText.length} chars');

      // Generate audio
      final audioPath = await _elevenLabsService!.generateSpeech(
        text: narrationText,
        voiceId: widget.selectedVoice.elevenLabsId,
      );

      setState(() {
        _audioFilePath = audioPath;
        _hasAudio = true;
        _isGeneratingAudio = false;
      });

      print('[StoryReveal] Audio generated, starting playback...');

      // Start playback
      await _playNarration();
    } catch (e) {
      print('[StoryReveal] ERROR generating audio: $e');
      setState(() {
        _isGeneratingAudio = false;
        _narrationError = 'Failed to generate narration: $e';
      });
    }
  }

  Future<void> _playNarration() async {
    if (_audioFilePath == null || _elevenLabsService == null) return;

    try {
      await _elevenLabsService!.playAudio(_audioFilePath!);
      setState(() {
        _isPlaying = true;
      });

      // Listen to player state changes
      _elevenLabsService!.playerStateStream.listen((state) {
        if (mounted) {
          setState(() {
            _isPlaying = state.playing;
          });
          if (state.processingState == ProcessingState.completed) {
            print('[StoryReveal] Narration playback completed');
            setState(() {
              _isPlaying = false;
              _playPosition = _playDuration ?? Duration.zero;
            });
            _cancelPlaybackSubscriptions();
          }
        }
      });

      // Listen to position and duration for progress bar
      _durationSubscription = _elevenLabsService!.durationStream.listen((d) {
        if (mounted && d != null) setState(() => _playDuration = d);
      });
      _positionSubscription = _elevenLabsService!.positionStream.listen((p) {
        if (mounted) setState(() => _playPosition = p);
      });
    } catch (e) {
      print('[StoryReveal] ERROR playing audio: $e');
      setState(() {
        _narrationError = 'Failed to play narration: $e';
      });
    }
  }

  Future<void> _togglePlayback() async {
    if (_elevenLabsService == null) return;

    if (_isPlaying) {
      await _elevenLabsService!.pauseAudio();
    } else if (_hasAudio) {
      await _elevenLabsService!.resumeAudio();
    }
  }

  Future<void> _stopNarration() async {
    if (_elevenLabsService == null) return;
    await _elevenLabsService!.stopAudio();
    _cancelPlaybackSubscriptions();
    setState(() {
      _isPlaying = false;
      _playPosition = Duration.zero;
      _playDuration = null;
    });
  }

  Future<void> _startGame() async {
    // Stop narration if playing
    await _stopNarration();

    setState(() {
      _isCreatingGame = true;
    });

    try {
      // Mythos deck is now dynamic - cards are drawn randomly based on stage composition
      // The stageTrackers will be initialized automatically from ancientOne.mythosDeck

      // Create players from investigators
      final players = widget.selectedInvestigators
          .map((inv) => Player(investigator: inv))
          .toList();

      // Create the initial "Begin Investigation" story event
      // Use display text (without audio tags)
      final investigatorStoryMaps = widget.storyGeneration.investigatorStories
          .map((s) => {'name': s.name, 'story': s.story})
          .toList();

      final storyEvent = TimelineEvent.story(
        ancientOneName: widget.selectedAncientOne.name,
        ancientOneHook: widget.storyGeneration.ancientOneHook,
        investigatorStories: investigatorStoryMaps,
      );

      print('[StoryReveal] Created initial story event for timeline');
      print('[StoryReveal] Story event ID: ${storyEvent.id}');

      // Create initial placement events for each investigator
      final placementEvents = <TimelineEvent>[];
      for (int i = 0; i < players.length; i++) {
        final player = players[i];
        final placementEvent = TimelineEvent.placement(
          investigatorName: player.displayName,
          location: player.currentLocation,
          playerId: player.id,
        );
        placementEvents.add(placementEvent);
        print(
            '[StoryReveal] Created placement event: ${player.displayName} at ${player.currentLocation}');
      }

      // Create game state with story event and placement events in global timeline
      // stageTrackers will be auto-initialized from ancientOne.mythosDeck
      final gameState = GameState(
        name: 'vs ${widget.selectedAncientOne.name}',
        ancientOne: widget.selectedAncientOne,
        players: players,
        narratorVoice: widget.selectedVoice,
        storyGeneration: widget.storyGeneration,
        globalTimeline: [
          storyEvent,
          ...placementEvents
        ], // Story event followed by placements
      );

      // Save the game
      await _storageService.saveGame(gameState);

      // Navigate to game screen
      if (mounted) {
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(
            builder: (context) => GameScreen(initialGameState: gameState),
          ),
          (route) => route.isFirst,
        );
      }
    } catch (e) {
      setState(() {
        _isCreatingGame = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error starting game: $e'),
            backgroundColor: EldritchColors.bloodSeal,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EldritchColors.parchmentWarm,
      body: Stack(
        children: [
          const ParchmentBackground(),
          CustomScrollView(
            controller: _scrollController,
            slivers: [
              // App bar with Ancient One image
              SliverAppBar(
                expandedHeight: 250,
                pinned: true,
                backgroundColor: EldritchColors.leatherDark,
                foregroundColor: EldritchColors.parchmentLight,
                flexibleSpace: FlexibleSpaceBar(
                  title: Text(
                    widget.selectedAncientOne.name,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: EldritchColors.parchmentLight,
                      shadows: [
                        Shadow(color: EldritchColors.deepInk, blurRadius: 4)
                      ],
                    ),
                  ),
                  background: Stack(
                    fit: StackFit.expand,
                    children: [
                      // Ancient One image
                      Image.asset(
                        _getAncientOneImagePath(widget.selectedAncientOne.name),
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  EldritchColors.leatherMid,
                                  EldritchColors.leatherDark,
                                ],
                              ),
                            ),
                            child: const Center(
                              child: Icon(
                                Icons.auto_awesome,
                                size: 80,
                                color: EldritchColors.occultPurple,
                              ),
                            ),
                          );
                        },
                      ),
                      // Gradient overlay for text
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              EldritchColors.deepInk.withOpacity(0.7),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Content
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Narration controls
                      if (_hasElevenLabsKey) ...[
                        _NarrationControls(
                          isGenerating: _isGeneratingAudio,
                          isPlaying: _isPlaying,
                          hasAudio: _hasAudio,
                          error: _narrationError,
                          position: _playPosition,
                          duration: _playDuration,
                          onPlay: _generateAndPlayNarration,
                          onToggle: _togglePlayback,
                          onStop: _stopNarration,
                          voiceName: widget.selectedVoice.name,
                        ),
                        const SizedBox(height: 24),
                      ],

                      // Ancient One hook
                      const Text(
                        'THE AWAKENING',
                        style: TextStyle(
                          color: EldritchColors.occultPurple,
                          fontSize: 22,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 3,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        widget.storyGeneration.ancientOneHook,
                        style: const TextStyle(
                          color: EldritchColors.deepInk,
                          fontSize: 20,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 32),

                      // Investigator stories
                      const Text(
                        'THE INVESTIGATORS',
                        style: TextStyle(
                          color: EldritchColors.occultPurple,
                          fontSize: 20,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 3,
                        ),
                      ),
                      const SizedBox(height: 16),
                      // Show investigator stories or fallback if empty
                      if (widget.storyGeneration.investigatorStories.isEmpty)
                        ...widget.selectedInvestigators.map((inv) {
                          return _InvestigatorStoryCard(
                            name: inv.name.replaceAll('"', ''),
                            story:
                                'A mysterious connection draws ${inv.name.replaceAll('"', '')} into this cosmic conflict...',
                            imagePath: _getInvestigatorImagePath(inv.name),
                          );
                        })
                      else
                        ...widget.storyGeneration.investigatorStories
                            .map((story) {
                          return _InvestigatorStoryCard(
                            name: story.name,
                            story: story.story,
                            imagePath: _getInvestigatorImagePath(story.name),
                          );
                        }),
                      const SizedBox(height: 24),

                      // Begin button
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton(
                          onPressed: _isCreatingGame ? null : _startGame,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: EldritchColors.occultPurple,
                            foregroundColor: EldritchColors.highlightPaper,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: _isCreatingGame
                              ? const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        valueColor:
                                            AlwaysStoppedAnimation<Color>(
                                                EldritchColors.highlightPaper),
                                      ),
                                    ),
                                    SizedBox(width: 12),
                                    Text('PREPARING...'),
                                  ],
                                )
                              : const Text(
                                  'BEGIN INVESTIGATION',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 2,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _NarrationControls extends StatelessWidget {
  final bool isGenerating;
  final bool isPlaying;
  final bool hasAudio;
  final String? error;
  final Duration position;
  final Duration? duration;
  final VoidCallback onPlay;
  final VoidCallback onToggle;
  final VoidCallback onStop;
  final String voiceName;

  const _NarrationControls({
    required this.isGenerating,
    required this.isPlaying,
    required this.hasAudio,
    required this.error,
    required this.position,
    required this.duration,
    required this.onPlay,
    required this.onToggle,
    required this.onStop,
    required this.voiceName,
  });

  static String _formatDuration(Duration d) {
    final m = d.inMinutes;
    final s = d.inSeconds % 60;
    return '${m}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final total = duration?.inMilliseconds ?? 1;
    final current = position.inMilliseconds.clamp(0, total);
    final progress = total > 0 ? current / total : 0.0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: EldritchColors.occultPurple.withOpacity(0.4),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                Icons.record_voice_over,
                color: EldritchColors.occultPurple,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'NARRATION',
                      style: TextStyle(
                        color: EldritchColors.deepInk,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 2,
                      ),
                    ),
                    Text(
                      'Voice: $voiceName',
                      style: const TextStyle(
                        color: EldritchColors.fadedText,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              if (isGenerating)
                const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(
                        EldritchColors.occultPurple),
                  ),
                )
              else if (hasAudio)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    FilledButton.icon(
                      onPressed: onToggle,
                      icon: Icon(isPlaying ? Icons.pause : Icons.play_arrow,
                          size: 20),
                      label: Text(isPlaying ? 'Pause' : 'Play'),
                      style: FilledButton.styleFrom(
                        backgroundColor: EldritchColors.occultPurple,
                        foregroundColor: EldritchColors.highlightPaper,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton.icon(
                      onPressed: onStop,
                      icon: const Icon(Icons.stop, size: 18),
                      label: const Text('Stop'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: EldritchColors.fadedText,
                        side: const BorderSide(color: EldritchColors.fadedText),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                      ),
                    ),
                  ],
                )
              else
                FilledButton.icon(
                  onPressed: onPlay,
                  icon: const Icon(Icons.play_arrow, size: 20),
                  label: const Text('Listen'),
                  style: FilledButton.styleFrom(
                    backgroundColor: EldritchColors.occultPurple,
                    foregroundColor: EldritchColors.highlightPaper,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  ),
                ),
            ],
          ),
          if (hasAudio && duration != null && duration!.inMilliseconds > 0) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Text(
                  _formatDuration(position),
                  style: const TextStyle(
                    color: EldritchColors.fadedText,
                    fontSize: 11,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: LinearProgressIndicator(
                      value: progress,
                      backgroundColor: EldritchColors.parchmentGreyed,
                      valueColor: const AlwaysStoppedAnimation<Color>(
                          EldritchColors.occultPurple),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Text(
                  _formatDuration(duration!),
                  style: const TextStyle(
                    color: EldritchColors.fadedText,
                    fontSize: 11,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
          ],
          if (isGenerating)
            const Padding(
              padding: EdgeInsets.only(top: 12),
              child: Text(
                'Generating narration audio...',
                style: TextStyle(
                  color: EldritchColors.fadedText,
                  fontSize: 12,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),
          if (error != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                error!,
                style: const TextStyle(
                  color: EldritchColors.bloodSeal,
                  fontSize: 12,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _InvestigatorStoryCard extends StatelessWidget {
  final String name;
  final String story;
  final String imagePath;

  const _InvestigatorStoryCard({
    required this.name,
    required this.story,
    required this.imagePath,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Investigator image
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              width: 60,
              height: 60,
              child: Image.asset(
                imagePath,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Container(
                    color: EldritchColors.leatherMid,
                    child: const Icon(
                      Icons.person,
                      color: EldritchColors.occultPurple,
                      size: 30,
                    ),
                  );
                },
              ),
            ),
          ),
          const SizedBox(width: 16),
          // Name and story
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    color: EldritchColors.deepInk,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  story,
                  style: const TextStyle(
                    color: EldritchColors.nearBlackInk,
                    fontSize: 20,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StageCard extends StatelessWidget {
  final int stage;
  final String title;
  final String description;

  const _StageCard({
    required this.stage,
    required this.title,
    required this.description,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: EldritchColors.leatherMid,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: EldritchColors.leatherDark,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: EldritchColors.occultPurple.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Center(
                  child: Text(
                    stage.toString(),
                    style: const TextStyle(
                      color: EldritchColors.occultPurple,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Text(
                title,
                style: const TextStyle(
                  color: EldritchColors.deepInk,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            description,
            style: const TextStyle(
              fontFamily: 'Special Elite',
              color: EldritchColors.nearBlackInk,
              fontSize: 15,
              fontWeight: FontWeight.w600,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

/// Get the image asset path for an ancient one
String _getAncientOneImagePath(String name) {
  final fileName =
      name.replaceAll(' ', '_').replaceAll("'", '').replaceAll('"', '');
  return 'assets/ancient_ones_images/$fileName.webp';
}

/// Get the image asset path for an investigator
String _getInvestigatorImagePath(String name) {
  String fileName =
      name.replaceAll('"', '').replaceAll(' ', '_').replaceAll("'", '%27');
  return 'assets/investigator_images/$fileName.webp';
}
