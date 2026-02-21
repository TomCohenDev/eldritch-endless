import 'package:flutter/material.dart';
import '../models/player.dart';
import '../models/timeline_event.dart';
import '../theme/eldritch_theme.dart';

class ActionPanel extends StatelessWidget {
  final Function(ActionType) onActionSelected;
  final Function(String, String) onCustomNote;
  final Function(String destination)? onTravel;
  final Player? activePlayer;

  const ActionPanel({
    super.key,
    required this.onActionSelected,
    required this.onCustomNote,
    this.onTravel,
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
                  icon: Icons.directions_walk,
                  label: 'Travel',
                  onTap: () => _showTravelDialog(context),
                ),
                _ActionButton(
                  icon: Icons.hotel,
                  label: 'Rest',
                  onTap: () => onActionSelected(ActionType.rest),
                ),
                _ActionButton(
                  icon: Icons.swap_horiz,
                  label: 'Trade',
                  onTap: () => onActionSelected(ActionType.trade),
                ),
                _ActionButton(
                  icon: Icons.luggage,
                  label: 'Prepare',
                  onTap: () => onActionSelected(ActionType.prepareTravel),
                ),
                _ActionButton(
                  icon: Icons.shopping_bag,
                  label: 'Acquire',
                  onTap: () => onActionSelected(ActionType.acquireAssets),
                ),
                _ActionButton(
                  icon: Icons.extension,
                  label: 'Component',
                  onTap: () => onActionSelected(ActionType.component),
                ),
                _ActionButton(
                  icon: Icons.place,
                  label: 'Local',
                  onTap: () => onActionSelected(ActionType.localAction),
                ),
                const Divider(
                    color: EldritchColors.parchmentGreyed, height: 16),
                _ActionButton(
                  icon: Icons.edit_note,
                  label: 'Custom',
                  onTap: () => _showCustomNoteDialog(context),
                  highlight: true,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static const _cities = [
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

  static const _wilderness = [
    'The Amazon',
    'Antarctica',
    'Heart of Africa',
    'The Himalayas',
    'The Pyramids',
    'Tunguska',
  ];

  // All numbered spaces sorted by number
  static const _numberedSpaces = [
    'Space 1', 'Space 2', 'Space 3', 'Space 4', 'Space 5',
    'Space 6', 'Space 7', 'Space 8', 'Space 9', 'Space 10',
    'Space 11', 'Space 12', 'Space 13', 'Space 14', 'Space 15',
    'Space 16', 'Space 17', 'Space 18', 'Space 19', 'Space 20',
    'Space 21',
  ];

  static const _spaceLabels = {
    'Space 1': 'Alaskan Coast',
    'Space 2': 'North Pacific',
    'Space 3': 'South Pacific',
    'Space 4': 'Canadian Wilderness',
    'Space 5': 'Heartland',
    'Space 6': 'Deep South',
    'Space 7': 'Central America',
    'Space 8': 'Caribbean',
    'Space 9': 'Greenland',
    'Space 10': 'West Africa',
    'Space 11': 'South Atlantic',
    'Space 12': 'Southern Ocean',
    'Space 13': 'Arctic Ocean',
    'Space 14': 'Northern Europe',
    'Space 15': 'South Africa',
    'Space 16': 'Central Russia',
    'Space 17': 'Urban India',
    'Space 18': 'Indian Ocean',
    'Space 19': 'Eastern Siberia',
    'Space 20': 'South East Asia',
    'Space 21': 'Northern Territories',
  };

  bool _matchesSearch(String loc, String query) {
    if (query.isEmpty) return true;
    final q = query.toLowerCase();
    if (loc.toLowerCase().contains(q)) return true;
    final label = _spaceLabels[loc];
    if (label != null && label.toLowerCase().contains(q)) return true;
    return false;
  }

  void _showTravelDialog(BuildContext context) {
    final currentLoc = activePlayer?.currentLocation ?? '';
    final searchController = TextEditingController();

    showModalBottomSheet(
      context: context,
      backgroundColor: EldritchColors.deepSea,
      isScrollControlled: true,
      builder: (context) {
        final maxHeight = MediaQuery.of(context).size.height * 0.6;
        return StatefulBuilder(
          builder: (context, setSheetState) {
            final query = searchController.text;
            final filteredCities = _cities.where((l) => _matchesSearch(l, query)).toList();
            final filteredWilderness = _wilderness.where((l) => _matchesSearch(l, query)).toList();
            final filteredOther = _numberedSpaces.where((l) => _matchesSearch(l, query)).toList();
            final bottomInset = MediaQuery.of(context).viewInsets.bottom;

            return Padding(
              padding: EdgeInsets.only(bottom: bottomInset),
              child: SafeArea(
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxHeight: maxHeight),
                  child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (currentLoc.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 4),
                              child: Text(
                                'Current: $currentLoc',
                                style: const TextStyle(
                                  color: EldritchColors.fadedText,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          const Text(
                            'Travel To:',
                            style: TextStyle(
                              color: EldritchColors.parchmentLight,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            controller: searchController,
                            onChanged: (_) => setSheetState(() {}),
                            style: const TextStyle(
                              color: EldritchColors.parchmentLight,
                              fontSize: 14,
                            ),
                            decoration: InputDecoration(
                              hintText: 'Search locations...',
                              hintStyle: TextStyle(
                                color: EldritchColors.fadedText.withValues(alpha: 0.6),
                                fontSize: 13,
                              ),
                              prefixIcon: const Icon(
                                Icons.search,
                                color: EldritchColors.fadedText,
                                size: 20,
                              ),
                              suffixIcon: query.isNotEmpty
                                  ? IconButton(
                                      icon: const Icon(Icons.clear,
                                          color: EldritchColors.fadedText, size: 18),
                                      onPressed: () {
                                        searchController.clear();
                                        setSheetState(() {});
                                      },
                                    )
                                  : null,
                              filled: true,
                              fillColor: EldritchColors.storm,
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 10),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide.none,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Flexible(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (filteredCities.isNotEmpty) ...[
                              _buildSection('CITIES', filteredCities, currentLoc, Colors.orange, context),
                              const SizedBox(height: 12),
                            ],
                            if (filteredWilderness.isNotEmpty) ...[
                              _buildSection('WILDERNESS', filteredWilderness, currentLoc, Colors.teal, context),
                              const SizedBox(height: 12),
                            ],
                            if (filteredOther.isNotEmpty)
                              _buildSection('OTHER', filteredOther, currentLoc, Colors.blueGrey, context),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            );
          },
        );
      },
    );
  }

  Widget _buildSection(String label, List<String> locations, String currentLoc, Color color, BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: EldritchColors.fadedText,
            fontSize: 10,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 6),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: locations
              .map((loc) => _buildLocationChip(context, loc, currentLoc, color))
              .toList(),
        ),
      ],
    );
  }

  Widget _buildLocationChip(
      BuildContext context, String loc, String currentLoc, Color color) {
    final isCurrent =
        currentLoc.toLowerCase() == loc.toLowerCase();
    final regionLabel = _spaceLabels[loc];
    final displayText = regionLabel != null ? '$loc - $regionLabel' : loc;
    return ActionChip(
      label: Text(displayText),
      backgroundColor: isCurrent ? color : EldritchColors.storm,
      labelStyle: TextStyle(
        color: EldritchColors.parchmentLight,
        fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
        fontSize: 12,
      ),
      onPressed: isCurrent
          ? null
          : () {
              Navigator.pop(context);
              if (onTravel != null) {
                onTravel!(loc);
              }
            },
    );
  }

  void _showCustomNoteDialog(BuildContext context) {
    final titleController = TextEditingController();
    final descriptionController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: EldritchColors.deepSea,
        title: Text(
          'Add Custom Note',
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(color: EldritchColors.parchmentLight),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: titleController,
              style: const TextStyle(color: EldritchColors.parchmentLight),
              decoration: InputDecoration(
                labelText: 'Title',
                labelStyle: const TextStyle(color: EldritchColors.fadedText),
                filled: true,
                fillColor: EldritchColors.storm,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: descriptionController,
              style: const TextStyle(color: EldritchColors.parchmentLight),
              maxLines: 3,
              decoration: InputDecoration(
                labelText: 'Description',
                labelStyle: const TextStyle(color: EldritchColors.fadedText),
                filled: true,
                fillColor: EldritchColors.storm,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              if (titleController.text.isNotEmpty) {
                onCustomNote(
                  titleController.text,
                  descriptionController.text,
                );
                Navigator.pop(context);
              }
            },
            child: const Text('Add'),
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
  final bool highlight;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.highlight = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Material(
        color: highlight
            ? EldritchColors.ritual.withValues(alpha: 0.2)
            : EldritchColors.parchmentLight.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  icon,
                  color: highlight
                      ? EldritchColors.occultPurple
                      : EldritchColors.fadedText,
                  size: 20,
                ),
                const SizedBox(height: 4),
                Text(
                  label,
                  style: context.eldritchType.menuLabel.copyWith(
                    color: highlight
                        ? EldritchColors.occultPurple
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
