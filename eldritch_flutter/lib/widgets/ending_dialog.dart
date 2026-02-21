import 'dart:async';
import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';
import '../models/game_state.dart';
import '../services/ai_service.dart';
import '../services/storage_service.dart';
import '../services/elevenlabs_service.dart';
import '../theme/eldritch_theme.dart';

class EndingDialog extends StatefulWidget {
  final GameState gameState;

  const EndingDialog({super.key, required this.gameState});

  static Future<void> show({
    required BuildContext context,
    required GameState gameState,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => EndingDialog(gameState: gameState),
    );
  }

  @override
  State<EndingDialog> createState() => _EndingDialogState();
}

enum _Phase { input, generating, reveal }

class _EndingDialogState extends State<EndingDialog> {
  final _notesController = TextEditingController();
  final _scrollController = ScrollController();
  bool _isVictory = true;
  _Phase _phase = _Phase.input;
  String? _error;

  EndingGeneration? _ending;

  // Narration state
  final StorageService _storageService = StorageService();
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
    _checkElevenLabsKey();
  }

  @override
  void dispose() {
    _notesController.dispose();
    _scrollController.dispose();
    _cancelPlaybackSubscriptions();
    _elevenLabsService?.dispose();
    super.dispose();
  }

  void _cancelPlaybackSubscriptions() {
    _positionSubscription?.cancel();
    _positionSubscription = null;
    _durationSubscription?.cancel();
    _durationSubscription = null;
  }

  Future<void> _checkElevenLabsKey() async {
    final key = await _storageService.getElevenLabsApiKey();
    setState(() {
      _hasElevenLabsKey = key != null && key.isNotEmpty;
    });
  }

  Future<void> _generate() async {
    final apiKey = await _storageService.getAnthropicApiKey();
    if (apiKey == null || apiKey.isEmpty) {
      setState(() {
        _error = 'Anthropic API key not configured. Add it in Settings.';
      });
      return;
    }

    setState(() {
      _phase = _Phase.generating;
      _error = null;
    });

    try {
      final aiService = AIService(apiKey: apiKey);
      final ending = await aiService.generateEnding(
        gameState: widget.gameState,
        isVictory: _isVictory,
        playerNotes: _notesController.text.trim(),
      );

      if (mounted) {
        setState(() {
          _ending = ending;
          _phase = _Phase.reveal;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _phase = _Phase.input;
          _error = 'Failed to generate ending: $e';
        });
      }
    }
  }

  Future<void> _generateAndPlayNarration() async {
    if (_ending == null) return;

    final apiKey = await _storageService.getElevenLabsApiKey();
    if (apiKey == null || apiKey.isEmpty) {
      setState(() {
        _narrationError = 'ElevenLabs API key not configured.';
      });
      return;
    }

    setState(() {
      _isGeneratingAudio = true;
      _narrationError = null;
    });

    try {
      _elevenLabsService ??= ElevenLabsService(apiKey: apiKey);

      final narrationText = _ending!.endingNarration;
      final voiceId = widget.gameState.narratorVoice.elevenLabsId;

      final audioPath = await _elevenLabsService!.generateSpeech(
        text: narrationText,
        voiceId: voiceId,
      );

      setState(() {
        _audioFilePath = audioPath;
        _hasAudio = true;
        _isGeneratingAudio = false;
      });

      await _playNarration();
    } catch (e) {
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

      _elevenLabsService!.playerStateStream.listen((state) {
        if (mounted) {
          setState(() {
            _isPlaying = state.playing;
          });
          if (state.processingState == ProcessingState.completed) {
            setState(() {
              _isPlaying = false;
              _playPosition = _playDuration ?? Duration.zero;
            });
            _cancelPlaybackSubscriptions();
          }
        }
      });

      _durationSubscription = _elevenLabsService!.durationStream.listen((d) {
        if (mounted && d != null) setState(() => _playDuration = d);
      });
      _positionSubscription = _elevenLabsService!.positionStream.listen((p) {
        if (mounted) setState(() => _playPosition = p);
      });
    } catch (e) {
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

  Future<void> _close() async {
    await _stopNarration();
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(24),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 600, maxHeight: 700),
        decoration: BoxDecoration(
          color: EldritchColors.leatherDark,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: _isVictory
                ? EldritchColors.brass.withValues(alpha: 0.6)
                : EldritchColors.bloodSeal.withValues(alpha: 0.6),
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: (_isVictory ? EldritchColors.brass : EldritchColors.bloodSeal)
                  .withValues(alpha: 0.3),
              blurRadius: 24,
              spreadRadius: 4,
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildHeader(),
            Flexible(
              child: switch (_phase) {
                _Phase.input => _buildInputPhase(),
                _Phase.generating => _buildGeneratingPhase(),
                _Phase.reveal => _buildRevealPhase(),
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    final title = switch (_phase) {
      _Phase.input => 'THE END APPROACHES',
      _Phase.generating => 'THE FATES ARE WRITING...',
      _Phase.reveal => _isVictory ? 'VICTORY' : 'DEFEAT',
    };

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: _isVictory
                ? EldritchColors.brass.withValues(alpha: 0.3)
                : EldritchColors.bloodSeal.withValues(alpha: 0.3),
          ),
        ),
      ),
      child: Row(
        children: [
          Icon(
            _phase == _Phase.reveal
                ? (_isVictory ? Icons.emoji_events : Icons.whatshot)
                : Icons.auto_stories,
            color: _isVictory ? EldritchColors.brass : EldritchColors.bloodSeal,
            size: 28,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: TextStyle(
                color: _isVictory
                    ? EldritchColors.brassHighlight
                    : EldritchColors.bloodSeal,
                fontSize: 18,
                fontWeight: FontWeight.bold,
                letterSpacing: 3,
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, color: EldritchColors.fadedText),
            onPressed: _close,
          ),
        ],
      ),
    );
  }

  Widget _buildInputPhase() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Outcome toggle
          const Text(
            'HOW DID THE GAME END?',
            style: TextStyle(
              color: EldritchColors.parchmentGreyed,
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 12),
          _buildOutcomeToggle(),
          const SizedBox(height: 24),

          // Notes field
          const Text(
            'ADDITIONAL DETAILS',
            style: TextStyle(
              color: EldritchColors.parchmentGreyed,
              fontSize: 12,
              fontWeight: FontWeight.bold,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _isVictory
                ? 'How did the investigators prevail? Any memorable moments?'
                : 'How did the investigators fall? What sealed their fate?',
            style: const TextStyle(
              color: EldritchColors.fadedText,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _notesController,
            maxLines: 5,
            style: const TextStyle(
              color: EldritchColors.parchmentLight,
              fontSize: 14,
            ),
            decoration: InputDecoration(
              hintText: _isVictory
                  ? 'e.g. "We sealed the gate just in time, but lost our best clue..."'
                  : 'e.g. "The doom track hit zero during the final mythos phase..."',
              hintStyle: TextStyle(
                color: EldritchColors.fadedText.withValues(alpha: 0.5),
                fontSize: 13,
              ),
              filled: true,
              fillColor: EldritchColors.deepInk,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(
                  color: EldritchColors.leatherMid.withValues(alpha: 0.5),
                ),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(
                  color: EldritchColors.leatherMid.withValues(alpha: 0.5),
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide(
                  color: _isVictory
                      ? EldritchColors.brass
                      : EldritchColors.bloodSeal,
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),

          if (_error != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: EldritchColors.bloodSeal.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline,
                      color: EldritchColors.bloodSeal, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _error!,
                      style: const TextStyle(
                          color: EldritchColors.bloodSeal, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          SizedBox(
            height: 48,
            child: ElevatedButton.icon(
              onPressed: _generate,
              icon: const Icon(Icons.auto_stories, size: 20),
              label: const Text(
                'GENERATE ENDING',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: _isVictory
                    ? EldritchColors.brass
                    : EldritchColors.bloodSeal,
                foregroundColor: EldritchColors.highlightPaper,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOutcomeToggle() {
    return Container(
      decoration: BoxDecoration(
        color: EldritchColors.deepInk,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _isVictory = true),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding:
                    const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                decoration: BoxDecoration(
                  color: _isVictory
                      ? EldritchColors.brass.withValues(alpha: 0.25)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  border: _isVictory
                      ? Border.all(color: EldritchColors.brass)
                      : null,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.emoji_events,
                      color: _isVictory
                          ? EldritchColors.brassHighlight
                          : EldritchColors.fadedText,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'VICTORY',
                      style: TextStyle(
                        color: _isVictory
                            ? EldritchColors.brassHighlight
                            : EldritchColors.fadedText,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _isVictory = false),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding:
                    const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                decoration: BoxDecoration(
                  color: !_isVictory
                      ? EldritchColors.bloodSeal.withValues(alpha: 0.25)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  border: !_isVictory
                      ? Border.all(color: EldritchColors.bloodSeal)
                      : null,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.whatshot,
                      color: !_isVictory
                          ? EldritchColors.bloodSeal
                          : EldritchColors.fadedText,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'DEFEAT',
                      style: TextStyle(
                        color: !_isVictory
                            ? EldritchColors.bloodSeal
                            : EldritchColors.fadedText,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGeneratingPhase() {
    return Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 48,
            height: 48,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation<Color>(
                _isVictory ? EldritchColors.brass : EldritchColors.bloodSeal,
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            _isVictory
                ? 'The stars align in your favor...'
                : 'Darkness consumes all hope...',
            style: const TextStyle(
              color: EldritchColors.parchmentGreyed,
              fontSize: 16,
              fontStyle: FontStyle.italic,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          const Text(
            'Generating your ending',
            style: TextStyle(
              color: EldritchColors.fadedText,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRevealPhase() {
    if (_ending == null) return const SizedBox.shrink();

    return SingleChildScrollView(
      controller: _scrollController,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Narration controls
          if (_hasElevenLabsKey) ...[
            _buildNarrationControls(),
            const SizedBox(height: 20),
          ],

          // Ending text
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: EldritchColors.deepInk.withValues(alpha: 0.6),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _isVictory
                    ? EldritchColors.brass.withValues(alpha: 0.2)
                    : EldritchColors.bloodSeal.withValues(alpha: 0.2),
              ),
            ),
            child: Text(
              _ending!.ending,
              style: const TextStyle(
                color: EldritchColors.parchmentLight,
                fontSize: 16,
                height: 1.7,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Close button
          SizedBox(
            height: 44,
            child: OutlinedButton(
              onPressed: _close,
              style: OutlinedButton.styleFrom(
                foregroundColor: EldritchColors.parchmentGreyed,
                side: const BorderSide(color: EldritchColors.fadedText),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text(
                'CLOSE',
                style: TextStyle(letterSpacing: 2),
              ),
            ),
          ),
        ],
      ),
    );
  }

  static String _formatDuration(Duration d) {
    final m = d.inMinutes;
    final s = d.inSeconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  Widget _buildNarrationControls() {
    final total = _playDuration?.inMilliseconds ?? 1;
    final current = _playPosition.inMilliseconds.clamp(0, total);
    final progress = total > 0 ? current / total : 0.0;
    final voiceName = widget.gameState.narratorVoice.name;
    final accentColor =
        _isVictory ? EldritchColors.brass : EldritchColors.bloodSeal;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: accentColor.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.record_voice_over, color: accentColor, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'NARRATION',
                      style: TextStyle(
                        color: EldritchColors.parchmentLight,
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
                        letterSpacing: 2,
                      ),
                    ),
                    Text(
                      'Voice: $voiceName',
                      style: const TextStyle(
                        color: EldritchColors.fadedText,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              if (_isGeneratingAudio)
                SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(accentColor),
                  ),
                )
              else if (_hasAudio)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    FilledButton.icon(
                      onPressed: _togglePlayback,
                      icon: Icon(
                          _isPlaying ? Icons.pause : Icons.play_arrow,
                          size: 18),
                      label: Text(_isPlaying ? 'Pause' : 'Play'),
                      style: FilledButton.styleFrom(
                        backgroundColor: accentColor,
                        foregroundColor: EldritchColors.highlightPaper,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                      ),
                    ),
                    const SizedBox(width: 6),
                    OutlinedButton.icon(
                      onPressed: _stopNarration,
                      icon: const Icon(Icons.stop, size: 16),
                      label: const Text('Stop'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: EldritchColors.fadedText,
                        side:
                            const BorderSide(color: EldritchColors.fadedText),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                      ),
                    ),
                  ],
                )
              else
                FilledButton.icon(
                  onPressed: _generateAndPlayNarration,
                  icon: const Icon(Icons.play_arrow, size: 18),
                  label: const Text('Listen'),
                  style: FilledButton.styleFrom(
                    backgroundColor: accentColor,
                    foregroundColor: EldritchColors.highlightPaper,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 6),
                  ),
                ),
            ],
          ),
          if (_hasAudio &&
              _playDuration != null &&
              _playDuration!.inMilliseconds > 0) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Text(
                  _formatDuration(_playPosition),
                  style: const TextStyle(
                    color: EldritchColors.fadedText,
                    fontSize: 10,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    child: LinearProgressIndicator(
                      value: progress,
                      backgroundColor: EldritchColors.parchmentGreyed,
                      valueColor: AlwaysStoppedAnimation<Color>(accentColor),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Text(
                  _formatDuration(_playDuration!),
                  style: const TextStyle(
                    color: EldritchColors.fadedText,
                    fontSize: 10,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
          ],
          if (_isGeneratingAudio)
            const Padding(
              padding: EdgeInsets.only(top: 8),
              child: Text(
                'Generating narration audio...',
                style: TextStyle(
                  color: EldritchColors.fadedText,
                  fontSize: 11,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),
          if (_narrationError != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                _narrationError!,
                style: const TextStyle(
                  color: EldritchColors.bloodSeal,
                  fontSize: 11,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
