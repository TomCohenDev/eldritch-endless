import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../models/encounter.dart';
import '../models/game_state.dart';
import '../models/timeline_event.dart';
import '../services/grok_service.dart';
import '../services/data_loader.dart';
import '../theme/eldritch_theme.dart';
import 'skill_icon_text.dart';

class EncounterCardDialog extends StatefulWidget {
  final EncounterType encounterType;
  final String subType;
  final GameState gameState;

  const EncounterCardDialog({
    super.key,
    required this.encounterType,
    required this.subType,
    required this.gameState,
  });

  /// Show the encounter card dialog and return the result
  static Future<EncounterResult?> show({
    required BuildContext context,
    required EncounterType encounterType,
    required String subType,
    required GameState gameState,
  }) {
    return showDialog<EncounterResult>(
      context: context,
      barrierDismissible: false,
      builder: (context) => EncounterCardDialog(
        encounterType: encounterType,
        subType: subType,
        gameState: gameState,
      ),
    );
  }

  @override
  State<EncounterCardDialog> createState() => _EncounterCardDialogState();
}

enum EncounterOutcome {
  passed,
  failed,
  finished, // For encounters without pass/fail conditions
}

class EncounterResult {
  final Encounter encounter;
  final String generatedText;
  final TimelineEvent event;
  final EncounterOutcome outcome;

  const EncounterResult({
    required this.encounter,
    required this.generatedText,
    required this.event,
    required this.outcome,
  });
}

class _EncounterCardDialogState extends State<EncounterCardDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _flipController;
  late Animation<double> _flipAnimation;

  final GrokService _grokService = GrokService.instance;
  final DataLoader _dataLoader = DataLoader();

  bool _isFlipped = false;
  bool _isGenerating = true;
  bool _hasError = false;
  bool _showingOriginal = false;
  String _errorMessage = '';
  String _generatedText = '';
  Encounter? _selectedEncounter;

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

    // Start generating immediately
    _generateEncounter();
  }

  @override
  void dispose() {
    _flipController.dispose();
    super.dispose();
  }

  String _getCardImagePath() {
    switch (widget.encounterType) {
      case EncounterType.general:
        return 'assets/images/encounter-cards/General_Encounter.webp';
      case EncounterType.otherWorld:
        return 'assets/images/encounter-cards/Other_World_Encounter.webp';
      case EncounterType.research:
        final ancientOneName =
            widget.gameState.ancientOne.name.replaceAll(' ', '-');
        return 'assets/images/encounter-cards/${ancientOneName}_Research_Encounter.webp';
      case EncounterType.expedition:
        return 'assets/images/encounter-cards/Expedition_Encounter.webp';
      case EncounterType.location:
        return _getLocationCardImage(widget.subType);
      default:
        return 'assets/images/encounter-cards/General_Encounter.webp';
    }
  }

  /// Returns the asset path for the City/Wilderness/Sea icon badge,
  /// or null if the subType doesn't map to one.
  String? _getGeneralTypeIcon(String subType) {
    switch (subType.toLowerCase()) {
      case 'city encounters':      return 'assets/images/City.webp';
      case 'wilderness encounters': return 'assets/images/Wilderness.webp';
      case 'sea encounters':        return 'assets/images/Sea.webp';
      default: return null;
    }
  }

  String _getLocationCardImage(String location) {
    final locationMap = {
      'Arkham': 'Americas',
      'Buenos Aires': 'Americas',
      'San Francisco': 'Americas',
      'London': 'Europe',
      'Rome': 'Europe',
      'Istanbul': 'Europe',
      'Tokyo': 'Asia-Australia',
      'Shanghai': 'Asia-Australia',
      'Sydney': 'Asia-Australia',
    };
    final region = locationMap[location] ?? 'General';
    return 'assets/images/encounter-cards/${region}_Encounter.webp';
  }

  String? _getExpeditionOverlayImage(String expedition) {
    final expeditionMap = {
      'The Amazon': 'The_Amazon',
      'Amazon': 'The_Amazon',
      'Antarctica': 'Antarctica',
      'Heart of Africa': 'The_Heart_of_Africa',
      'The Heart of Africa': 'The_Heart_of_Africa',
      'The Himalayas': 'The_Himalayas',
      'Himalayas': 'The_Himalayas',
      'The Pyramids': 'The_Pyramids',
      'Pyramids': 'The_Pyramids',
      'Tunguska': 'Tunguska',
    };
    final cardName = expeditionMap[expedition];
    if (cardName == null) return null;
    return 'assets/images/encounter-cards/$cardName.webp';
  }

  Future<void> _generateEncounter() async {
    try {
      final allEncounters = await _dataLoader.getRandomEncounters(
        widget.encounterType,
        subType: widget.subType,
        count: 20,
      );

      final availableEncounters = allEncounters
          .where((e) => !widget.gameState.usedEncounterIds.contains(e.id))
          .toList();

      if (availableEncounters.isEmpty) {
        if (allEncounters.isEmpty) {
          throw Exception('No encounter templates found');
        }
        availableEncounters.addAll(allEncounters);
      }

      availableEncounters.shuffle();
      final encounter = availableEncounters.first;

      setState(() {
        _selectedEncounter = encounter;
      });

      if (!_grokService.isInitialized) {
        await _grokService.initialize();
      }

      if (!_grokService.isInitialized) {
        throw Exception(
            'Grok API is not configured. Add your API key in Settings.');
      }

      final result = await _grokService.generateEncounter(
        encounter: encounter,
        gameState: widget.gameState,
        requestedType: widget.encounterType,
        requestedSubType: widget.subType,
      );

      setState(() {
        _generatedText = result;
        _isGenerating = false;
      });

      _flipCard();
    } catch (e) {
      setState(() {
        _hasError = true;
        _errorMessage = e.toString();
        _isGenerating = false;
      });
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

  void _completeEncounter(EncounterOutcome outcome) {
    if (_selectedEncounter == null || _generatedText.isEmpty) return;

    final activePlayer = widget.gameState.activePlayer;
    if (activePlayer == null) return;

    final encounterLabel =
        widget.subType.trim().isEmpty ? 'General' : widget.subType;

    final outcomeLabel = switch (outcome) {
      EncounterOutcome.passed => ' - PASSED',
      EncounterOutcome.failed => ' - FAILED',
      EncounterOutcome.finished => '',
    };

    final encounterData = _selectedEncounter!.toJson();
    encounterData['outcome'] = outcome.name;

    final event = TimelineEvent.encounter(
      title:
          '${widget.encounterType.name.toUpperCase()} Encounter: $encounterLabel$outcomeLabel',
      description: _generatedText,
      playerId: activePlayer.id,
      encounterData: encounterData,
    );

    Navigator.of(context).pop(EncounterResult(
      encounter: _selectedEncounter!,
      generatedText: _generatedText,
      event: event,
      outcome: outcome,
    ));
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
                  _getCardImagePath(),
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Image.asset(
                      'assets/images/encounter-cards/General_Encounter.webp',
                      fit: BoxFit.cover,
                    );
                  },
                ),
                if (widget.encounterType == EncounterType.expedition &&
                    _getExpeditionOverlayImage(widget.subType) != null)
                  Transform.rotate(
                    angle: -math.pi / 18.0,
                    alignment: Alignment(-1, 0),
                    child: FractionallySizedBox(
                      widthFactor: 1.2,
                      child: Image.asset(
                        _getExpeditionOverlayImage(widget.subType)!,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                      ),
                    ),
                  ),
                // Location type badge for general encounters
                if (widget.encounterType == EncounterType.general &&
                    _getGeneralTypeIcon(widget.subType) != null)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Image.asset(
                      _getGeneralTypeIcon(widget.subType)!,
                      width: 44,
                      height: 44,
                      errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                    ),
                  ),
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
                if (_isGenerating)
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.4),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            SizedBox(
                              width: 28,
                              height: 28,
                              child: CircularProgressIndicator(
                                strokeWidth: 3,
                                valueColor: const AlwaysStoppedAnimation<Color>(
                                    Colors.white),
                              ),
                            ),
                            const SizedBox(height: 12),
                            const Text(
                              'GENERATING...',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 2,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
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

  Widget _buildCardBack() {
    final displayText =
        _showingOriginal ? (_selectedEncounter?.rawText ?? '') : _generatedText;

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
                Positioned.fill(
                  child: Padding(
                    padding: const EdgeInsets.only(
                        top: 36, bottom: 56, left: 14, right: 14),
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
                                  'Error generating encounter',
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
                          : SkillIconText(
                              text: displayText,
                              iconSize: 22,
                              style: const TextStyle(
                                color: EldritchColors.deepInk,
                                fontSize: 18,
                                fontWeight: FontWeight.w500,
                                // height: 1.5,
                                fontFamily: 'Crimson Text',
                              ),
                            ),
                    ),
                  ),
                ),
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: EldritchColors.leatherDark.withValues(alpha: 0.85),
                      // borderRadius: const BorderRadius.only(
                      //   topLeft: Radius.circular(6),
                      //   topRight: Radius.circular(6),
                      // ),
                    ),
                    child: Row(
                      children: [
                        if (widget.encounterType == EncounterType.general &&
                            _getGeneralTypeIcon(widget.subType) != null)
                          Image.asset(
                            _getGeneralTypeIcon(widget.subType)!,
                            width: 16,
                            height: 16,
                            errorBuilder: (_, __, ___) => Icon(
                              _getEncounterIcon(),
                              color: EldritchColors.parchmentLight,
                              size: 14,
                            ),
                          )
                        else
                          Icon(
                            _getEncounterIcon(),
                            color: EldritchColors.parchmentLight,
                            size: 14,
                          ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            widget.subType.isEmpty
                                ? widget.encounterType.name.toUpperCase()
                                : widget.subType.toUpperCase(),
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
                ),
                Positioned(
                  bottom: 8,
                  left: 10,
                  right: 10,
                  child: Row(
                    children: [
                      Expanded(
                        child: ElevatedButton(
                          onPressed: (!_isGenerating && !_hasError)
                              ? () => _completeEncounter(EncounterOutcome.passed)
                              : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor:
                                Colors.green.shade700.withValues(alpha: 0.9),
                            foregroundColor: Colors.white,
                            disabledBackgroundColor:
                                Colors.grey.withValues(alpha: 0.5),
                            disabledForegroundColor: Colors.white54,
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: const Text('PASS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: (!_isGenerating && !_hasError)
                              ? () => _completeEncounter(EncounterOutcome.failed)
                              : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor:
                                EldritchColors.bloodSeal.withValues(alpha: 0.9),
                            foregroundColor: Colors.white,
                            disabledBackgroundColor:
                                Colors.grey.withValues(alpha: 0.5),
                            disabledForegroundColor: Colors.white54,
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: const Text('FAIL', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: (!_isGenerating && !_hasError)
                              ? () => _completeEncounter(EncounterOutcome.finished)
                              : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor:
                                EldritchColors.ritual.withValues(alpha: 0.9),
                            foregroundColor: Colors.white,
                            disabledBackgroundColor:
                                Colors.grey.withValues(alpha: 0.5),
                            disabledForegroundColor: Colors.white54,
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: const Text('FINISH', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
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

  IconData _getEncounterIcon() {
    switch (widget.encounterType) {
      case EncounterType.general:
        return Icons.auto_stories;
      case EncounterType.location:
        return Icons.pin_drop;
      case EncounterType.research:
        return Icons.search;
      case EncounterType.expedition:
        return Icons.explore;
      case EncounterType.otherWorld:
        return Icons.blur_on;
      default:
        return Icons.auto_stories;
    }
  }
}
