import 'package:flutter/material.dart';
import '../models/timeline_event.dart';
import '../theme/eldritch_theme.dart';

class ActionPanel extends StatelessWidget {
  final Function(ActionType) onActionSelected;
  final Function(String, String) onCustomNote;

  const ActionPanel({
    super.key,
    required this.onActionSelected,
    required this.onCustomNote,
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
                fontSize: 10,
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
                  onTap: () => onActionSelected(ActionType.travel),
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
                const Divider(color: EldritchColors.parchmentGreyed, height: 16),
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

  void _showCustomNoteDialog(BuildContext context) {
    final titleController = TextEditingController();
    final descriptionController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: EldritchColors.deepSea,
        title: Text(
          'Add Custom Note',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(color: EldritchColors.parchmentLight),
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
                  color: highlight ? EldritchColors.occultPurple : EldritchColors.fadedText,
                  size: 20,
                ),
                const SizedBox(height: 4),
                Text(
                  label,
                  style: context.eldritchType.menuLabel.copyWith(
                    color: highlight ? EldritchColors.occultPurple : EldritchColors.deepInk,
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
