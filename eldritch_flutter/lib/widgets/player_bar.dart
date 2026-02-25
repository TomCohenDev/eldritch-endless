import 'package:flutter/material.dart';
import '../models/player.dart';
import '../theme/eldritch_theme.dart';

class PlayerBar extends StatelessWidget {
  final List<Player> players;
  final String activePlayerId;
  final Function(String) onPlayerSelected;
  final VoidCallback? onAddInvestigator;

  const PlayerBar({
    super.key,
    required this.players,
    required this.activePlayerId,
    required this.onPlayerSelected,
    this.onAddInvestigator,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 80,
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      color: EldritchColors.parchmentWarm.withValues(alpha: 0.85),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        // players + 1 add-button slot
        itemCount: players.length + 1,
        itemBuilder: (context, index) {
          // Last item is the "add investigator" button
          if (index == players.length) {
            return _AddInvestigatorButton(
              onTap: onAddInvestigator,
            );
          }
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
    final isDead = player.isDead;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isDead
              ? EldritchColors.deepInk.withValues(alpha: 0.5)
              : isActive
                  ? EldritchColors.ritual.withValues(alpha: 0.9)
                  : EldritchColors.parchmentLight.withValues(alpha: 0.85),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDead
                ? EldritchColors.bloodSeal.withValues(alpha: 0.6)
                : isActive
                    ? EldritchColors.ritualSoft
                    : EldritchColors.parchmentGreyed.withValues(alpha: 0.6),
            width: 2,
          ),
        ),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            // Main content — greyed out when dead
            Opacity(
              opacity: isDead ? 0.45 : 1.0,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    player.displayName,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: isDead
                              ? EldritchColors.fadedText
                              : isActive
                                  ? EldritchColors.parchmentLight
                                  : EldritchColors.deepInk,
                          fontWeight:
                              isActive ? FontWeight.bold : FontWeight.normal,
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
                        color: isDead
                            ? EldritchColors.bloodSeal.withValues(alpha: 0.4)
                            : isActive
                                ? EldritchColors.bloodSeal
                                : EldritchColors.bloodSeal
                                    .withValues(alpha: 0.7),
                      ),
                      const SizedBox(width: 2),
                      Text(
                        '${player.currentHealth}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: isDead
                                  ? EldritchColors.fadedText
                                  : isActive
                                      ? EldritchColors.parchmentLight
                                      : EldritchColors.uiNeutral,
                              fontSize: 11,
                            ),
                      ),
                      const SizedBox(width: 8),
                      // Sanity
                      Icon(
                        Icons.psychology,
                        size: 12,
                        color: isDead
                            ? Colors.blue.withValues(alpha: 0.3)
                            : isActive
                                ? Colors.blue[200]
                                : Colors.blue[400],
                      ),
                      const SizedBox(width: 2),
                      Text(
                        '${player.currentSanity}',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: isDead
                                  ? EldritchColors.fadedText
                                  : isActive
                                      ? EldritchColors.parchmentLight
                                      : EldritchColors.uiNeutral,
                              fontSize: 11,
                            ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            // Red X overlay for dead investigators
            if (isDead)
              Positioned(
                top: -6,
                right: -6,
                child: Container(
                  width: 18,
                  height: 18,
                  decoration: BoxDecoration(
                    color: EldritchColors.bloodSeal,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: EldritchColors.deepInk,
                      width: 1,
                    ),
                  ),
                  child: const Icon(
                    Icons.close,
                    color: Colors.white,
                    size: 12,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _AddInvestigatorButton extends StatelessWidget {
  final VoidCallback? onTap;

  const _AddInvestigatorButton({this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: EldritchColors.occultPurple.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: EldritchColors.occultPurple.withValues(alpha: 0.45),
            width: 2,
          ),
        ),
        child: const Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.person_add,
              color: EldritchColors.occultPurple,
              size: 20,
            ),
            SizedBox(height: 4),
            Text(
              'Add',
              style: TextStyle(
                color: EldritchColors.occultPurple,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
