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
              'ENCOUNTER',
              style: context.eldritchType.menuLabel.copyWith(
                color: EldritchColors.occultPurple,
                fontSize: 10,
                letterSpacing: 1,
              ),
            ),
          ),

          // Encounter buttons
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
                  onTap: () => _showLocationDialog(context),
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
                  onTap: () => _showExpeditionDialog(context),
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

  void _showSubTypeDialog(
      BuildContext context, EncounterType type, String subType) {
    onEncounterSelected(type, subType);
  }

  void _showLocationDialog(BuildContext context) {
    final locations = [
      'Arkham',
      'Buenos Aires',
      'Istanbul',
      'London',
      'Rome',
      'San Francisco',
      'Shanghai',
      'Sydney',
      'Tokyo',
    ];

    showModalBottomSheet(
      context: context,
      backgroundColor: EldritchColors.deepSea,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Select Location',
                style: TextStyle(
                  color: EldritchColors.parchmentLight,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: locations.map((location) {
                  return ActionChip(
                    label: Text(location),
                    backgroundColor: EldritchColors.storm,
                    labelStyle:
                        const TextStyle(color: EldritchColors.parchmentLight),
                    onPressed: () {
                      Navigator.pop(context);
                      onEncounterSelected(EncounterType.location, location);
                    },
                  );
                }).toList(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showExpeditionDialog(BuildContext context) {
    final expeditions = [
      'Africa',
      'Americas',
      'Asia-Australia',
      'Europe',
      'Antarctica',
      'The Pyramids',
    ];

    showModalBottomSheet(
      context: context,
      backgroundColor: EldritchColors.deepSea,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Select Expedition',
                style: TextStyle(
                  color: EldritchColors.parchmentLight,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: expeditions.map((expedition) {
                  return ActionChip(
                    label: Text(expedition),
                    backgroundColor: EldritchColors.storm,
                    labelStyle:
                        const TextStyle(color: EldritchColors.parchmentLight),
                    onPressed: () {
                      Navigator.pop(context);
                      onEncounterSelected(EncounterType.expedition, expedition);
                    },
                  );
                }).toList(),
              ),
            ],
          ),
        ),
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
