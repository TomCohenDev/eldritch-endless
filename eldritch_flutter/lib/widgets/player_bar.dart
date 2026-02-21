import 'package:flutter/material.dart';
import '../models/player.dart';
import '../theme/eldritch_theme.dart';

class PlayerBar extends StatelessWidget {
  final List<Player> players;
  final String activePlayerId;
  final Function(String) onPlayerSelected;

  const PlayerBar({
    super.key,
    required this.players,
    required this.activePlayerId,
    required this.onPlayerSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 80,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      color: EldritchColors.parchmentWarm.withValues(alpha: 0.85),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: players.length,
        itemBuilder: (context, index) {
          final player = players[index];
          final isActive = player.id == activePlayerId;
          return _PlayerChip(
            player: player,
            isActive: isActive,
            onTap: () => onPlayerSelected(player.id),
          );
        },
      ),
    );
  }
}

class _PlayerChip extends StatelessWidget {
  final Player player;
  final bool isActive;
  final VoidCallback onTap;

  const _PlayerChip({
    required this.player,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isActive
              ? EldritchColors.ritual.withValues(alpha: 0.9)
              : EldritchColors.parchmentLight.withValues(alpha: 0.85),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isActive
                ? EldritchColors.ritualSoft
                : EldritchColors.parchmentGreyed.withValues(alpha: 0.6),
            width: 2,
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              player.displayName,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    color: isActive ? EldritchColors.parchmentLight : EldritchColors.deepInk,
                    fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                    fontSize: 13,
                  ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Health
                Icon(
                  Icons.favorite,
                  size: 12,
                  color: isActive ? EldritchColors.bloodSeal : EldritchColors.bloodSeal.withValues(alpha: 0.7),
                ),
                const SizedBox(width: 2),
                Text(
                  '${player.currentHealth}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: isActive ? EldritchColors.parchmentLight : EldritchColors.uiNeutral,
                    fontSize: 11,
                  ),
                ),
                const SizedBox(width: 8),
                // Sanity
                Icon(
                  Icons.psychology,
                  size: 12,
                  color: isActive ? Colors.blue[200] : Colors.blue[400],
                ),
                const SizedBox(width: 2),
                Text(
                  '${player.currentSanity}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: isActive ? EldritchColors.parchmentLight : EldritchColors.uiNeutral,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
