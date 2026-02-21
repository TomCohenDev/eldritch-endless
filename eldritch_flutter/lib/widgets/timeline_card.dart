import 'package:flutter/material.dart';
import '../models/timeline_event.dart';
import '../theme/eldritch_theme.dart';
import 'skill_icon_text.dart';

class TimelineCard extends StatelessWidget {
  final TimelineEvent event;
  final String? actorName;
  final bool isDragging;
  final bool isHighlighted;

  const TimelineCard({
    super.key,
    required this.event,
    this.actorName,
    this.isDragging = false,
    this.isHighlighted = false,
  });

  @override
  Widget build(BuildContext context) {
    // Story cards get special treatment
    if (event.type == TimelineEventType.story) {
      return _StoryTimelineCard(event: event);
    }

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: isDragging
            ? EldritchColors.ritual.withValues(alpha: 0.45)
            : isHighlighted
                ? EldritchColors.ritual.withValues(alpha: 0.2)
                : EldritchColors.parchmentLight.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: _getBorderColor(),
          width: isHighlighted ? 2 : 1,
        ),
        boxShadow: isDragging
            ? [
                BoxShadow(
                  color: EldritchColors.ritual.withValues(alpha: 0.4),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: () => _showDetails(context),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header row
                Row(
                  children: [
                    _getIcon(),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        actorName == null ? event.title : '$actorName',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              color: EldritchColors.deepInk,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      _formatTime(event.timestamp),
                      style: const TextStyle(
                        color: EldritchColors.fadedText,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _ChipLabel(
                      text: _getTypeLabel(),
                      color: _getBorderColor(),
                    ),
                    if (event.title.isNotEmpty)
                      _ChipLabel(
                        text: event.title,
                        color: EldritchColors.parchmentGreyed,
                      ),
                  ],
                ),

                // Description preview
                if (event.description.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  SkillIconText(
                    text: event.description,
                    style: context.eldritchType.loreQuote.copyWith(
                      color: EldritchColors.uiNeutral,
                      fontSize: 12,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Color _getBorderColor() {
    switch (event.type) {
      case TimelineEventType.story:
        return EldritchColors.occultPurple;
      case TimelineEventType.placement:
        return Colors.teal;
      case TimelineEventType.encounter:
        return EldritchColors.occultPurple;
      case TimelineEventType.mythos:
        return EldritchColors.bloodSeal;
      case TimelineEventType.action:
        return Colors.blue;
      case TimelineEventType.custom:
        return Colors.grey;
    }
  }

  Widget _getIcon() {
    IconData iconData;
    Color color;

    switch (event.type) {
      case TimelineEventType.story:
        iconData = Icons.auto_awesome;
        color = EldritchColors.occultPurple;
        break;
      case TimelineEventType.placement:
        iconData = Icons.location_on;
        color = Colors.teal;
        break;
      case TimelineEventType.encounter:
        iconData = Icons.auto_stories;
        color = EldritchColors.occultPurple;
        break;
      case TimelineEventType.mythos:
        iconData = Icons.warning_amber;
        color = EldritchColors.bloodSeal;
        break;
      case TimelineEventType.action:
        iconData = _getActionIcon();
        color = Colors.blue;
        break;
      case TimelineEventType.custom:
        iconData = Icons.edit_note;
        color = Colors.grey;
        break;
    }

    return Icon(iconData, color: color, size: 16);
  }

  IconData _getActionIcon() {
    switch (event.actionType) {
      case ActionType.travel:
        return Icons.directions_walk;
      case ActionType.rest:
        return Icons.hotel;
      case ActionType.trade:
        return Icons.swap_horiz;
      case ActionType.prepareTravel:
        return Icons.luggage;
      case ActionType.acquireAssets:
        return Icons.shopping_bag;
      case ActionType.component:
        return Icons.extension;
      case ActionType.localAction:
        return Icons.place;
      case ActionType.custom:
      default:
        return Icons.edit_note;
    }
  }

  String _formatTime(DateTime time) {
    final hour = time.hour.toString().padLeft(2, '0');
    final minute = time.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  String _getTypeLabel() {
    switch (event.type) {
      case TimelineEventType.story:
        return 'Story';
      case TimelineEventType.placement:
        return 'Placement';
      case TimelineEventType.encounter:
        return 'Encounter';
      case TimelineEventType.mythos:
        return 'Mythos';
      case TimelineEventType.action:
        return 'Action';
      case TimelineEventType.custom:
        return 'Note';
    }
  }

  void _showDetails(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: EldritchColors.parchmentWarm,
        title: Row(
          children: [
            _getIcon(),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                event.title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(color: EldritchColors.deepInk),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: SkillIconText(
            text: event.description.isEmpty ? 'No details' : event.description,
            style: context.eldritchType.loreBody.copyWith(color: EldritchColors.deepInk),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}

class _ChipLabel extends StatelessWidget {
  final String text;
  final Color color;

  const _ChipLabel({
    required this.text,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: color.withValues(alpha: 0.45),
          width: 1,
        ),
      ),
      child: Text(
        text,
        style: const TextStyle(
          color: EldritchColors.fadedText,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

/// Special card for the initial story/Begin Investigation event — same style as rest, purple border.
class _StoryTimelineCard extends StatelessWidget {
  final TimelineEvent event;

  const _StoryTimelineCard({required this.event});

  @override
  Widget build(BuildContext context) {
    final metadata = event.metadata ?? {};
    final ancientOneName = metadata['ancientOneName'] ?? 'Unknown';
    final ancientOneHook = metadata['ancientOneHook'] ?? event.description;
    final investigatorStories =
        (metadata['investigatorStories'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [];

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: EldritchColors.parchmentLight.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: EldritchColors.occultPurple,
          width: 2,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(8),
          onTap: () => _showStoryDetails(context, ancientOneName, ancientOneHook, investigatorStories),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header row — title and time only (no left/right icons)
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'BEGIN INVESTIGATION',
                            style: TextStyle(
                              color: EldritchColors.occultPurple,
                              fontWeight: FontWeight.bold,
                              fontSize: 11,
                              letterSpacing: 1.5,
                            ),
                          ),
                          Text(
                            'vs $ancientOneName',
                            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                                  color: EldritchColors.deepInk,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    Text(
                      _formatTime(event.timestamp),
                      style: const TextStyle(
                        color: EldritchColors.fadedText,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _ChipLabel(
                      text: 'Story',
                      color: EldritchColors.occultPurple,
                    ),
                  ],
                ),

                if (ancientOneHook.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  SkillIconText(
                    text: ancientOneHook,
                    style: context.eldritchType.loreQuote.copyWith(
                      color: EldritchColors.nearBlackInk,
                      fontSize: 12,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 4),
                Text(
                  'Tap to open full story (${investigatorStories.length} investigator${investigatorStories.length != 1 ? 's' : ''})',
                  style: context.eldritchType.loreQuote.copyWith(
                    color: EldritchColors.fadedText,
                    fontSize: 11,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatTime(DateTime dateTime) {
    final h = dateTime.hour.toString().padLeft(2, '0');
    final m = dateTime.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }

  void _showStoryDetails(
    BuildContext context,
    String ancientOneName,
    String ancientOneHook,
    List<Map<String, dynamic>> investigatorStories,
  ) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: EldritchColors.parchmentWarm,
        title: Text(
          'Begin Investigation - vs $ancientOneName',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(color: EldritchColors.deepInk),
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'THE AWAKENING',
                style: TextStyle(
                  color: EldritchColors.ritual,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                ancientOneHook,
                style: context.eldritchType.loreBody.copyWith(
                  color: EldritchColors.deepInk,
                  fontSize: 14,
                  height: 1.6,
                ),
              ),
              if (investigatorStories.isNotEmpty) ...[
                const SizedBox(height: 20),
                const Divider(color: EldritchColors.ritual, thickness: 0.5),
                const SizedBox(height: 16),
                const Text(
                  'THE INVESTIGATORS',
                  style: TextStyle(
                    color: EldritchColors.ritual,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 12),
                ...investigatorStories.map((story) {
                  return _InvestigatorStorySection(
                    name: story['name']?.toString() ?? 'Unknown',
                    story: story['story']?.toString() ?? '',
                  );
                }),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}

class _InvestigatorStorySection extends StatelessWidget {
  final String name;
  final String story;

  const _InvestigatorStorySection({
    required this.name,
    required this.story,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 8,
            height: 8,
            margin: const EdgeInsets.only(top: 6),
            decoration: const BoxDecoration(
              color: EldritchColors.ritual,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    color: EldritchColors.parchmentLight,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  story,
                  style: context.eldritchType.loreQuote.copyWith(
                    color: EldritchColors.fadedText,
                    fontSize: 13,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
