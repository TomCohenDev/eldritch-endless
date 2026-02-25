import 'package:flutter/material.dart';
import '../models/player.dart';
import '../theme/eldritch_theme.dart';

class ActionPanel extends StatelessWidget {
  final VoidCallback? onPlayerDeath;
  final Player? activePlayer;

  const ActionPanel({
    super.key,
    this.onPlayerDeath,
    this.activePlayer,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 80,
      color: EldritchColors.parchmentWarm.withValues(alpha: 0.82),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(8),
            child: Text(
              'ACTIONS',
              style: context.eldritchType.menuLabel.copyWith(
                color: EldritchColors.occultPurple,
                fontSize: 6,
                fontWeight: FontWeight.w700,
                letterSpacing: 1,
              ),
            ),
          ),

          // Action buttons
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              children: [
                _ActionButton(
                  icon: Icons.dangerous,
                  label: 'Death',
                  onTap: () => _showDeathConfirmDialog(context),
                  danger: true,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showDeathConfirmDialog(BuildContext context) {
    final playerName = activePlayer?.displayName ?? 'this investigator';
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: EldritchColors.deepSea,
        title: const Text(
          'Investigator Dies',
          style: TextStyle(color: EldritchColors.bloodSeal),
        ),
        content: Text(
          'Mark $playerName as dead?\n\nThey will remain visible but greyed out.',
          style: const TextStyle(color: EldritchColors.parchmentLight),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          TextButton(
            style: TextButton.styleFrom(
                foregroundColor: EldritchColors.bloodSeal),
            onPressed: () {
              Navigator.pop(ctx);
              onPlayerDeath?.call();
            },
            child: const Text('MARK AS DEAD'),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool danger;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.danger = false,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = danger
        ? EldritchColors.bloodSeal.withValues(alpha: 0.15)
        : EldritchColors.parchmentLight.withValues(alpha: 0.9);
    final fgColor =
        danger ? EldritchColors.bloodSeal : EldritchColors.fadedText;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Material(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, color: fgColor, size: 20),
                const SizedBox(height: 4),
                Text(
                  label,
                  style: context.eldritchType.menuLabel.copyWith(
                    color: fgColor,
                    fontSize: 9,
                    letterSpacing: 0.3,
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
