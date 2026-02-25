import 'package:flutter/material.dart';
import '../models/encounter.dart';
import '../theme/eldritch_theme.dart';

class EncounterPanel extends StatelessWidget {
  final Function(EncounterType, String) onEncounterSelected;
  final bool isProcessing;

  const EncounterPanel({
    super.key,
    required this.onEncounterSelected,
    required this.isProcessing,
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
              'ENCOUNTERS',
              style: context.eldritchType.menuLabel.copyWith(
                color: EldritchColors.occultPurple,
                fontSize: 6,
                fontWeight: FontWeight.w700,
                letterSpacing: 1,
              ),
            ),
          ),

          // Encounter buttons — location is always picked in the game screen
          // before the encounter card is drawn.
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              children: [
                _EncounterButton(
                  icon: Icons.auto_stories,
                  label: 'General',
                  color: Colors.amber,
                  isProcessing: isProcessing,
                  onTap: () =>
                      onEncounterSelected(EncounterType.general, 'General'),
                ),
                _EncounterButton(
                  icon: Icons.pin_drop,
                  label: 'Location',
                  color: Colors.orange,
                  isProcessing: isProcessing,
                  // subType resolved from chosen location in game_screen
                  onTap: () =>
                      onEncounterSelected(EncounterType.location, ''),
                ),
                _EncounterButton(
                  icon: Icons.search,
                  label: 'Research',
                  color: Colors.purple,
                  isProcessing: isProcessing,
                  onTap: () =>
                      onEncounterSelected(EncounterType.research, 'Research'),
                ),
                _EncounterButton(
                  icon: Icons.explore,
                  label: 'Expedition',
                  color: Colors.teal,
                  isProcessing: isProcessing,
                  // subType resolved from chosen location in game_screen
                  onTap: () =>
                      onEncounterSelected(EncounterType.expedition, ''),
                ),
                _EncounterButton(
                  icon: Icons.blur_on,
                  label: 'Other World',
                  color: Colors.indigo,
                  isProcessing: isProcessing,
                  onTap: () => onEncounterSelected(
                      EncounterType.otherWorld, 'Other World'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _EncounterButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  final bool isProcessing;

  const _EncounterButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
    required this.isProcessing,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Material(
        color: EldritchColors.parchmentLight.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: isProcessing ? null : onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  icon,
                  color: isProcessing ? EldritchColors.parchmentGreyed : color,
                  size: 20,
                ),
                const SizedBox(height: 4),
                Text(
                  label,
                  style: context.eldritchType.menuLabel.copyWith(
                    color: isProcessing
                        ? EldritchColors.parchmentGreyed
                        : EldritchColors.deepInk,
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
