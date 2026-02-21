import 'package:flutter/material.dart';
import '../models/encounter.dart';
import '../models/player.dart';
import '../theme/eldritch_theme.dart';

class EncounterPanel extends StatelessWidget {
  final Function(EncounterType, String) onEncounterSelected;
  final bool isProcessing;
  final Player? activePlayer;

  const EncounterPanel({
    super.key,
    required this.onEncounterSelected,
    required this.isProcessing,
    this.activePlayer,
  });

  // City locations for Location encounters
  static const _cityLocations = [
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

  // Expedition/wilderness locations and their mapping to expedition types
  static const _expeditionLocations = {
    'Amazon': 'The Amazon',
    'The Amazon': 'The Amazon',
    'Antarctica': 'Antarctica',
    'Heart of Africa': 'Heart of Africa',
    'The Heart of Africa': 'Heart of Africa',
    'Africa': 'Heart of Africa',
    'Himalayas': 'The Himalayas',
    'The Himalayas': 'The Himalayas',
    'Pyramids': 'The Pyramids',
    'The Pyramids': 'The Pyramids',
    'Tunguska': 'Tunguska',
  };

  /// Check if location is a city
  bool _isCity(String location) {
    return _cityLocations.any(
      (city) => location.toLowerCase().contains(city.toLowerCase()),
    );
  }

  /// Get expedition type from location, or null if not at expedition
  String? _getExpeditionType(String location) {
    for (final entry in _expeditionLocations.entries) {
      if (location.toLowerCase().contains(entry.key.toLowerCase())) {
        return entry.value;
      }
    }
    return null;
  }

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
                  onTap: () => _handleLocationEncounter(context),
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
                  onTap: () => _handleExpeditionEncounter(context),
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

  /// Handle Location encounter - auto-select if player is in a city
  void _handleLocationEncounter(BuildContext context) {
    final location = activePlayer?.currentLocation;
    if (location != null && _isCity(location)) {
      // Find the matching city name
      final matchedCity = _cityLocations.firstWhere(
        (city) => location.toLowerCase().contains(city.toLowerCase()),
        orElse: () => location,
      );
      onEncounterSelected(EncounterType.location, matchedCity);
    } else {
      // Show dialog to select location
      _showLocationDialog(context);
    }
  }

  /// Handle Expedition encounter - auto-select if player is at expedition location
  void _handleExpeditionEncounter(BuildContext context) {
    final location = activePlayer?.currentLocation;
    if (location != null) {
      final expeditionType = _getExpeditionType(location);
      if (expeditionType != null) {
        onEncounterSelected(EncounterType.expedition, expeditionType);
        return;
      }
    }
    // Show dialog to select expedition
    _showExpeditionDialog(context);
  }

  void _showLocationDialog(BuildContext context) {
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
              Text(
                activePlayer != null
                    ? 'Player at: ${activePlayer!.currentLocation}\nSelect Location:'
                    : 'Select Location',
                style: const TextStyle(
                  color: EldritchColors.parchmentLight,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _cityLocations.map((location) {
                  final isCurrentLocation = activePlayer?.currentLocation
                          .toLowerCase()
                          .contains(location.toLowerCase()) ??
                      false;
                  return ActionChip(
                    label: Text(location),
                    backgroundColor: isCurrentLocation
                        ? Colors.orange
                        : EldritchColors.storm,
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
      'The Amazon',
      'Antarctica',
      'Heart of Africa',
      'The Himalayas',
      'The Pyramids',
      'Tunguska',
    ];

    final currentExpedition = activePlayer != null
        ? _getExpeditionType(activePlayer!.currentLocation)
        : null;

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
              Text(
                activePlayer != null
                    ? 'Player at: ${activePlayer!.currentLocation}\nSelect Expedition:'
                    : 'Select Expedition',
                style: const TextStyle(
                  color: EldritchColors.parchmentLight,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: expeditions.map((expedition) {
                  final isCurrentExpedition = currentExpedition == expedition;
                  return ActionChip(
                    label: Text(expedition),
                    backgroundColor: isCurrentExpedition
                        ? Colors.teal
                        : EldritchColors.storm,
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
