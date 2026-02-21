import 'package:flutter/material.dart';
import '../models/game_state.dart';
import '../models/mythos_card.dart';
import '../theme/eldritch_theme.dart';

class MythosDeckDialog extends StatelessWidget {
  final GameState gameState;

  const MythosDeckDialog({
    super.key,
    required this.gameState,
  });

  static Future<void> show({
    required BuildContext context,
    required GameState gameState,
  }) {
    return showDialog(
      context: context,
      builder: (context) => MythosDeckDialog(gameState: gameState),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: EldritchColors.deepSea,
      insetPadding: const EdgeInsets.all(24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 600),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: EldritchColors.leatherDark,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(4),
                  topRight: Radius.circular(4),
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.layers,
                    color: EldritchColors.parchmentLight,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'MYTHOS DECK',
                          style: TextStyle(
                            color: EldritchColors.parchmentLight,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 2,
                            fontSize: 16,
                          ),
                        ),
                        Text(
                          'Current Stage: ${gameState.currentStage}',
                          style: TextStyle(
                            color: EldritchColors.parchmentLight.withValues(alpha: 0.7),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white60),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            // Content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _buildStageSection(context, 1),
                    const SizedBox(height: 16),
                    _buildStageSection(context, 2),
                    const SizedBox(height: 16),
                    _buildStageSection(context, 3),
                    if (gameState.mythosDiscard.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      _buildDrawnCardsSection(context),
                    ],
                  ],
                ),
              ),
            ),
            // Footer
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Used: ${gameState.usedMythosIds.length} cards',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.6),
                      fontSize: 12,
                    ),
                  ),
                  Text(
                    'Remaining: ${gameState.totalRemainingMythosCards}',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.6),
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStageSection(BuildContext context, int stageNum) {
    final tracker = gameState.stageTrackers[stageNum];
    final originalComp = _getOriginalComposition(stageNum);
    final isCurrentStage = gameState.currentStage == stageNum;
    final isCompleted = tracker?.isEmpty ?? true;

    final originalTotal = originalComp.green + originalComp.yellow + originalComp.blue;
    final remainingTotal = tracker?.total ?? 0;
    final drawnCount = originalTotal - remainingTotal;

    return Container(
      decoration: BoxDecoration(
        color: isCurrentStage
            ? EldritchColors.ritual.withValues(alpha: 0.2)
            : Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isCurrentStage
              ? EldritchColors.ritual
              : Colors.white.withValues(alpha: 0.1),
          width: isCurrentStage ? 2 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Stage header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: isCurrentStage
                  ? EldritchColors.ritual.withValues(alpha: 0.3)
                  : Colors.white.withValues(alpha: 0.05),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(7),
                topRight: Radius.circular(7),
              ),
            ),
            child: Row(
              children: [
                if (isCompleted && stageNum < gameState.currentStage)
                  const Icon(Icons.check_circle, color: Colors.green, size: 18)
                else if (isCurrentStage)
                  const Icon(Icons.play_circle_fill, color: EldritchColors.ritual, size: 18)
                else
                  Icon(Icons.circle_outlined, color: Colors.white.withValues(alpha: 0.3), size: 18),
                const SizedBox(width: 8),
                Text(
                  'STAGE $stageNum',
                  style: TextStyle(
                    color: isCurrentStage ? EldritchColors.ritual : Colors.white70,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2,
                    fontSize: 14,
                  ),
                ),
                const Spacer(),
                // Progress
                Text(
                  '$drawnCount / $originalTotal drawn',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.6),
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          // Color breakdown
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildColorProgress('Green', Colors.green,
                    tracker?.green ?? 0, originalComp.green),
                _buildColorProgress('Yellow', Colors.orange,
                    tracker?.yellow ?? 0, originalComp.yellow),
                _buildColorProgress('Blue', Colors.blue,
                    tracker?.blue ?? 0, originalComp.blue),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildColorProgress(String label, Color color, int remaining, int total) {
    final drawn = total - remaining;

    return Column(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.2),
            shape: BoxShape.circle,
            border: Border.all(color: color, width: 2),
          ),
          child: Center(
            child: Text(
              '$remaining',
              style: TextStyle(
                color: color,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.7),
            fontSize: 10,
          ),
        ),
        Text(
          '$drawn/$total used',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.5),
            fontSize: 9,
          ),
        ),
      ],
    );
  }

  Widget _buildDrawnCardsSection(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.05),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(7),
                topRight: Radius.circular(7),
              ),
            ),
            child: Row(
              children: [
                const Icon(Icons.history, color: Colors.white54, size: 18),
                const SizedBox(width: 8),
                Text(
                  'DRAWN CARDS (${gameState.mythosDiscard.length})',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Wrap(
              spacing: 6,
              runSpacing: 6,
              children: gameState.mythosDiscard.map((card) => _buildCardChip(card)).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCardChip(MythosCard card) {
    final cardColor = _getCardColor(card.color);

    return Tooltip(
      message: '${card.title}\n${card.effectText}',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: cardColor.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(4),
          border: Border.all(
            color: cardColor.withValues(alpha: 0.6),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: cardColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 120),
              child: Text(
                card.title,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.9),
                  fontSize: 11,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Color _getCardColor(String color) {
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

  StageMythosTracker _getOriginalComposition(int stage) {
    switch (stage) {
      case 1:
        return StageMythosTracker.fromStageComposition(
            gameState.ancientOne.mythosDeck.stage1);
      case 2:
        return StageMythosTracker.fromStageComposition(
            gameState.ancientOne.mythosDeck.stage2);
      case 3:
        return StageMythosTracker.fromStageComposition(
            gameState.ancientOne.mythosDeck.stage3);
      default:
        return const StageMythosTracker(green: 0, yellow: 0, blue: 0);
    }
  }
}
