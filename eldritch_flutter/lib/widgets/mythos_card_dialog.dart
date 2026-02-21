import 'dart:math' as math;
import 'dart:math' show Random;
import 'package:flutter/material.dart';
import '../models/mythos_card.dart';
import '../models/game_state.dart';
import '../models/timeline_event.dart';
import '../services/grok_service.dart';
import '../services/data_loader.dart';
import '../theme/eldritch_theme.dart';

class MythosCardDialog extends StatefulWidget {
  final GameState gameState;

  const MythosCardDialog({
    super.key,
    required this.gameState,
  });

  /// Show the mythos card dialog and return the result
  static Future<MythosResult?> show({
    required BuildContext context,
    required GameState gameState,
  }) {
    return showDialog<MythosResult>(
      context: context,
      barrierDismissible: false,
      builder: (context) => MythosCardDialog(
        gameState: gameState,
      ),
    );
  }

  @override
  State<MythosCardDialog> createState() => _MythosCardDialogState();
}

class MythosResult {
  final MythosCard card;
  final String generatedText;
  final TimelineEvent event;
  final GameState updatedGameState;

  const MythosResult({
    required this.card,
    required this.generatedText,
    required this.event,
    required this.updatedGameState,
  });
}

class _MythosCardDialogState extends State<MythosCardDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _flipController;
  late Animation<double> _flipAnimation;

  final GrokService _grokService = GrokService.instance;
  final DataLoader _dataLoader = DataLoader();
  final Random _random = Random();

  bool _isFlipped = false;
  bool _isGenerating = false;
  bool _hasDrawn = false;
  bool _hasError = false;
  bool _showingOriginal = false;
  String _errorMessage = '';
  String _generatedText = '';
  MythosCard? _drawnCard;
  GameState? _updatedGameState;

  @override
  void initState() {
    super.initState();
    _flipController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _flipAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _flipController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _flipController.dispose();
    super.dispose();
  }

  Future<void> _drawAndGenerate() async {
    debugPrint('[Mythos DEBUG] _drawAndGenerate: ENTRY');
    debugPrint(
        '[Mythos DEBUG] Current stage: ${widget.gameState.currentStage}');

    final tracker = widget.gameState.currentStageTracker;
    debugPrint(
        '[Mythos DEBUG] Stage tracker: green=${tracker?.green}, yellow=${tracker?.yellow}, blue=${tracker?.blue}');
    debugPrint(
        '[Mythos DEBUG] Used mythos IDs: ${widget.gameState.usedMythosIds.length}');
    debugPrint(
        '[Mythos DEBUG] Total remaining cards: ${widget.gameState.totalRemainingMythosCards}');

    // Check if current stage has cards remaining
    if (!widget.gameState.hasCardsInCurrentStage) {
      debugPrint('[Mythos DEBUG] ERROR: No cards remaining in current stage!');
      setState(() {
        _hasDrawn = true;
        _hasError = true;
        _errorMessage =
            'No more mythos cards in Stage ${widget.gameState.currentStage}!';
      });
      return;
    }

    setState(() {
      _hasDrawn = true;
      _isGenerating = true;
    });

    try {
      // Step 1: Pick a random color based on stage weights
      final pickedColor = widget.gameState.pickRandomMythosColor();
      debugPrint('[Mythos DEBUG] Picked color: $pickedColor');

      if (pickedColor == null) {
        throw Exception('Failed to pick a color - stage may be empty');
      }

      // Step 2: Load all mythos cards
      debugPrint('[Mythos DEBUG] Loading all mythos cards...');
      final allCards = await _dataLoader.loadMythosCards();
      debugPrint('[Mythos DEBUG] Loaded ${allCards.length} total mythos cards');

      // Step 3: Filter by color and not used
      final availableCards = allCards.where((card) {
        final colorMatch =
            card.color.toLowerCase() == pickedColor.toLowerCase();
        final notUsed =
            !widget.gameState.usedMythosIds.contains(card.pageId.toString());
        return colorMatch && notUsed;
      }).toList();

      debugPrint(
          '[Mythos DEBUG] Available $pickedColor cards: ${availableCards.length}');

      if (availableCards.isEmpty) {
        throw Exception('No available $pickedColor cards! All have been used.');
      }

      // Step 4: Pick a random card
      final card = availableCards[_random.nextInt(availableCards.length)];
      debugPrint('[Mythos DEBUG] Drew card: ${card.title} (${card.color})');
      debugPrint('[Mythos DEBUG] Card pageId: ${card.pageId}');
      debugPrint(
          '[Mythos DEBUG] Card flavor text length: ${card.flavorText.length}');
      debugPrint('[Mythos DEBUG] Card effect: ${card.effectText}');

      // Step 5: Update game state
      final newState = widget.gameState.recordMythosDrawn(card);
      debugPrint(
          '[Mythos DEBUG] Updated state - new stage tracker: green=${newState.stageTrackers[newState.currentStage]?.green}, yellow=${newState.stageTrackers[newState.currentStage]?.yellow}, blue=${newState.stageTrackers[newState.currentStage]?.blue}');

      setState(() {
        _drawnCard = card;
        _updatedGameState = newState;
        _generatedText = ''; // Start empty for streaming
      });

      // Step 6: Generate with Grok if available
      debugPrint('[Mythos DEBUG] Checking Grok initialization...');
      if (!_grokService.isInitialized) {
        debugPrint('[Mythos DEBUG] Grok not initialized, initializing...');
        await _grokService.initialize();
      }

      debugPrint(
          '[Mythos DEBUG] Grok isInitialized: ${_grokService.isInitialized}');

      if (_grokService.isInitialized) {
        try {
          debugPrint('[Mythos DEBUG] Starting stream generation...');
          final buffer = StringBuffer();
          int tokenCount = 0;

          await for (final token in _grokService.streamMythosText(
            card: card,
            gameState: widget.gameState,
          )) {
            tokenCount++;
            buffer.write(token);
            if (tokenCount % 10 == 0) {
              debugPrint(
                  '[Mythos DEBUG] Received $tokenCount tokens, current length: ${buffer.length}');
            }
            setState(() {
              _generatedText = buffer.toString();
            });
          }

          debugPrint(
              '[Mythos DEBUG] Stream complete! Total tokens: $tokenCount, final length: ${buffer.length}');
        } catch (e, stack) {
          debugPrint('[Mythos DEBUG] Grok generation FAILED: $e');
          debugPrint('[Mythos DEBUG] Stack trace: $stack');
          debugPrint('[Mythos DEBUG] Falling back to original text');
          setState(() {
            _generatedText = card.flavorText;
          });
        }
      } else {
        // Fallback to original text
        debugPrint('[Mythos DEBUG] Grok not available, using original text');
        setState(() {
          _generatedText = card.flavorText;
        });
      }

      debugPrint('[Mythos DEBUG] Generation complete, flipping card...');
      setState(() {
        _isGenerating = false;
      });

      // Only flip when generation is complete
      _flipCard();
      debugPrint('[Mythos DEBUG] Card flipped, EXIT OK');
    } catch (e, stack) {
      debugPrint('[Mythos DEBUG] FATAL ERROR: $e');
      debugPrint('[Mythos DEBUG] Stack trace: $stack');
      setState(() {
        _hasError = true;
        _errorMessage = e.toString();
        _isGenerating = false;
      });
      // Flip to show error
      _flipCard();
    }
  }

  void _flipCard() {
    if (_isFlipped) {
      _flipController.reverse();
    } else {
      _flipController.forward();
    }
    setState(() {
      _isFlipped = !_isFlipped;
    });
  }

  void _toggleOriginal() {
    setState(() {
      _showingOriginal = !_showingOriginal;
    });
  }

  void _completeMythos() {
    if (_drawnCard == null || _updatedGameState == null) return;

    final event = TimelineEvent.mythos(
      title: 'MYTHOS: ${_drawnCard!.title}',
      description: '$_generatedText\n\n${_drawnCard!.effectText}',
      playerId: 'global',
      mythosData: _drawnCard!.toJson(),
    );

    Navigator.of(context).pop(MythosResult(
      card: _drawnCard!,
      generatedText: _generatedText,
      event: event,
      updatedGameState: _updatedGameState!,
    ));
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

  /// Build the icons bar showing mythos card icons
  Widget _buildIconsBar(MythosCard card) {
    final icons = card.icons;
    if (icons.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _getMythosColor(card.color).withValues(alpha: 0.15),
        border: Border(
          bottom: BorderSide(
            color: _getMythosColor(card.color).withValues(alpha: 0.3),
            width: 1,
          ),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: icons.map((icon) {
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Tooltip(
              message: icon.displayName,
              child: Image.asset(
                icon.assetPath,
                width: 24,
                height: 24,
                errorBuilder: (_, __, ___) => Icon(
                  Icons.help_outline,
                  size: 20,
                  color: _getMythosColor(card.color),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(24),
      child: AnimatedBuilder(
        animation: _flipAnimation,
        builder: (context, child) {
          final angle = _flipAnimation.value * math.pi;
          final isFrontVisible = angle < math.pi / 2;

          return Transform(
            alignment: Alignment.center,
            transform: Matrix4.identity()
              ..setEntry(3, 2, 0.001)
              ..rotateY(angle),
            child: isFrontVisible
                ? _buildCardFront()
                : Transform(
                    alignment: Alignment.center,
                    transform: Matrix4.identity()..rotateY(math.pi),
                    child: _buildCardBack(),
                  ),
          );
        },
      ),
    );
  }

  static const _cardAspectRatio = 63.0 / 88.0;

  Widget _buildCardFront() {
    return ConstrainedBox(
      constraints: BoxConstraints(
        maxWidth: 320,
        maxHeight: MediaQuery.of(context).size.height * 0.75,
      ),
      child: AspectRatio(
        aspectRatio: _cardAspectRatio,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.6),
                blurRadius: 25,
                spreadRadius: 5,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.asset(
                  'assets/images/encounter-cards/Mythos_Card.webp',
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    // Fallback to a colored container if image not found
                    return Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            EldritchColors.ritual,
                            EldritchColors.deepSea,
                          ],
                        ),
                      ),
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.warning_amber,
                              color: Colors.white.withValues(alpha: 0.8),
                              size: 64,
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'MYTHOS',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.9),
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 8,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
                // Close button
                Positioned(
                  top: 4,
                  right: 4,
                  child: GestureDetector(
                    onTap: () => Navigator.of(context).pop(),
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.5),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.close,
                        color: Colors.white70,
                        size: 14,
                      ),
                    ),
                  ),
                ),
                // Generation overlay - shows streaming text
                if (_isGenerating)
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.85),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Column(
                        children: [
                          // Header with spinner
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color:
                                  EldritchColors.ritual.withValues(alpha: 0.3),
                              borderRadius: const BorderRadius.only(
                                topLeft: Radius.circular(10),
                                topRight: Radius.circular(10),
                              ),
                            ),
                            child: Row(
                              children: [
                                const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                        EldritchColors.ritual),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Text(
                                  _drawnCard != null
                                      ? _drawnCard!.title.toUpperCase()
                                      : 'GENERATING...',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 1,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // Streaming text
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.all(12),
                              child: SingleChildScrollView(
                                child: Text(
                                  _generatedText.isEmpty
                                      ? 'Generating flavor text...'
                                      : _generatedText,
                                  style: TextStyle(
                                    color: _generatedText.isEmpty
                                        ? Colors.white54
                                        : Colors.white.withValues(alpha: 0.9),
                                    fontSize: 14,
                                    fontStyle: _generatedText.isEmpty
                                        ? FontStyle.italic
                                        : FontStyle.normal,
                                    height: 1.4,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                // Error overlay
                if (_hasError && !_isFlipped)
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.85),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.error_outline,
                            color: EldritchColors.bloodSeal,
                            size: 48,
                          ),
                          const SizedBox(height: 16),
                          const Text(
                            'DECK EMPTY',
                            style: TextStyle(
                              color: EldritchColors.bloodSeal,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 2,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 24),
                            child: Text(
                              _errorMessage,
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 13,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                          const SizedBox(height: 24),
                          ElevatedButton(
                            onPressed: () => Navigator.of(context).pop(),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.grey.shade700,
                              foregroundColor: Colors.white,
                            ),
                            child: const Text('CLOSE'),
                          ),
                        ],
                      ),
                    ),
                  ),
                // Draw button at bottom (only show if not drawn yet and no error)
                if (!_hasDrawn && !_hasError)
                  Positioned(
                    bottom: 16,
                    left: 16,
                    right: 16,
                    child: Row(
                      children: [
                        Expanded(
                          child: ElevatedButton(
                            onPressed: () => Navigator.of(context).pop(),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.grey.shade700,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            child: const Text(
                              'CANCEL',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                letterSpacing: 2,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            onPressed: _drawAndGenerate,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: EldritchColors.ritual,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            child: const Text(
                              'DRAW',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                letterSpacing: 2,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCardBack() {
    final card = _drawnCard;
    if (card == null) return const SizedBox.shrink();

    final displayText = _showingOriginal ? card.flavorText : _generatedText;

    return ConstrainedBox(
      constraints: BoxConstraints(
        maxWidth: 320,
        maxHeight: MediaQuery.of(context).size.height * 0.75,
      ),
      child: AspectRatio(
        aspectRatio: _cardAspectRatio,
        child: Container(
          decoration: BoxDecoration(
            color: EldritchColors.parchmentWarm,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: EldritchColors.leatherDark,
              width: 2,
            ),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: Stack(
              fit: StackFit.expand,
              children: [
                // Background
                Positioned.fill(
                  child: Opacity(
                    opacity: 0.8,
                    child: Image.asset(
                      EldritchColors.parchmentBackgroundAsset,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) =>
                          Container(color: EldritchColors.parchmentWarm),
                    ),
                  ),
                ),
                // Content
                Positioned.fill(
                  child: Padding(
                    padding: const EdgeInsets.only(
                        top: 68, bottom: 56, left: 14, right: 14),
                    child: SingleChildScrollView(
                      child: _hasError
                          ? Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  Icons.error_outline,
                                  color: EldritchColors.bloodSeal,
                                  size: 40,
                                ),
                                const SizedBox(height: 12),
                                const Text(
                                  'Error drawing mythos',
                                  style: TextStyle(
                                    color: EldritchColors.bloodSeal,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  _errorMessage,
                                  style: const TextStyle(
                                    color: EldritchColors.fadedText,
                                    fontSize: 11,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            )
                          : Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Flavor text
                                Text(
                                  displayText,
                                  style: const TextStyle(
                                    color: EldritchColors.deepInk,
                                    fontSize: 20,
                                    fontWeight: FontWeight.w500,
                                    fontStyle: FontStyle.italic,
                                    fontFamily: 'Crimson Text',
                                  ),
                                ),
                                const SizedBox(height: 16),
                                const Divider(color: EldritchColors.fadedText),
                                const SizedBox(height: 12),
                                // Effect
                                const Text(
                                  'EFFECT',
                                  style: TextStyle(
                                    color: Color.fromARGB(255, 80, 78, 75),
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 2,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  card.effectText,
                                  style: const TextStyle(
                                    color: EldritchColors.deepInk,
                                    fontSize: 18,
                                    fontWeight: FontWeight.w500,
                                    fontFamily: 'Crimson Text',
                                  ),
                                ),
                                if (card.hasReckoning) ...[
                                  const SizedBox(height: 12),
                                  const Text(
                                    'RECKONING',
                                    style: TextStyle(
                                      color: EldritchColors.bloodSeal,
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 2,
                                    ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    card.reckoningEffect,
                                    style: const TextStyle(
                                      color: EldritchColors.deepInk,
                                      fontSize: 18,
                                      fontWeight: FontWeight.w500,
                                      fontFamily: 'Crimson Text',
                                    ),
                                  ),
                                ],
                              ],
                            ),
                    ),
                  ),
                ),
                // Header
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: EldritchColors.leatherDark
                              .withValues(alpha: 0.85),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.warning_amber,
                              color: _getMythosColor(card.color),
                              size: 14,
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                card.title.toUpperCase(),
                                style: const TextStyle(
                                  color: EldritchColors.parchmentLight,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1,
                                  fontSize: 10,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            GestureDetector(
                              onTap: _toggleOriginal,
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: _showingOriginal
                                      ? Colors.orange.withValues(alpha: 0.9)
                                      : Colors.white.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  _showingOriginal ? 'ORIGINAL' : 'AI TEXT',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 8,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                            GestureDetector(
                              onTap: () => Navigator.of(context).pop(),
                              child: const Icon(
                                Icons.close,
                                color: Colors.white60,
                                size: 14,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Icons bar
                      _buildIconsBar(card),
                    ],
                  ),
                ),
                // Bottom button
                Positioned(
                  bottom: 8,
                  left: 10,
                  right: 10,
                  child: ElevatedButton(
                    onPressed:
                        (!_isGenerating && !_hasError) ? _completeMythos : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor:
                          EldritchColors.ritual.withValues(alpha: 0.9),
                      foregroundColor: Colors.white,
                      disabledBackgroundColor:
                          Colors.grey.withValues(alpha: 0.5),
                      disabledForegroundColor: Colors.white54,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text(
                      'CLOSE',
                      style:
                          TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
