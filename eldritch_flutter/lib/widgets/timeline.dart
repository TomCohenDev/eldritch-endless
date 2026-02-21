import 'package:flutter/material.dart';
import '../models/timeline_event.dart';
import '../models/player.dart';
import '../theme/eldritch_theme.dart';
import 'timeline_card.dart';

class Timeline extends StatefulWidget {
  final List<TimelineEvent> events;
  final List<TimelineEvent> globalEvents;
  final List<Player> players;
  final ValueChanged<List<TimelineEvent>> onReorderEvents;
  final ValueChanged<TimelineEvent> onDeleteEvent;

  const Timeline({
    super.key,
    required this.events,
    required this.globalEvents,
    required this.players,
    required this.onReorderEvents,
    required this.onDeleteEvent,
  });

  @override
  State<Timeline> createState() => _TimelineState();
}

class _TimelineState extends State<Timeline> {
  String? _draggingEventId;
  /// Index of the drop slot currently hovered during drag (0 = before first event).
  int? _dragOverInsertIndex;

  @override
  Widget build(BuildContext context) {
    // Combine and sort all events by timestamp for a single shared chronology
    final allEvents = [
      ...widget.events,
      ...widget.globalEvents,
    ]..sort((a, b) => a.timestamp.compareTo(b.timestamp));

    return Stack(
      children: [
        Container(
          color: EldritchColors.parchmentWarm.withValues(alpha: 0.82),
          child: Column(
            children: [
              // Header — same style as encounter/action panels
              Container(
                padding: const EdgeInsets.all(8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.timeline, color: EldritchColors.occultPurple, size: 16),
                    const SizedBox(width: 8),
                    Text(
                      'SHARED TIMELINE',
                      style: context.eldritchType.menuLabel.copyWith(
                        color: EldritchColors.occultPurple,
                        fontSize: 12,
                        letterSpacing: 2,
                      ),
                    ),
                  ],
                ),
              ),

              // Events list
              Expanded(
                child: allEvents.isEmpty
                    ? const Center(
                        child: Text(
                          'No events yet.\nActions and encounters from all investigators\nwill appear here.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: EldritchColors.uiNeutral, fontSize: 14),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(8),
                        itemCount: (allEvents.length * 2) + 1,
                        itemBuilder: (context, index) {
                          if (index.isEven) {
                            final insertIndex = index ~/ 2;
                            return _buildDropSlot(allEvents, insertIndex);
                          }

                          final event = allEvents[index ~/ 2];
                          return _buildEventTile(event);
                        },
                      ),
              ),
            ],
          ),
        ),
        if (_draggingEventId != null)
          Positioned(
            right: 16,
            bottom: 16,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Cancel button
                DragTarget<TimelineEvent>(
                  onWillAcceptWithDetails: (_) => true,
                  onAcceptWithDetails: (_) {
                    setState(() {
                      _draggingEventId = null;
                      _dragOverInsertIndex = null;
                    });
                  },
                  builder: (context, candidateData, rejectedData) {
                    final isHighlighted = candidateData.isNotEmpty;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 120),
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: isHighlighted
                            ? EldritchColors.uiNeutral.withValues(alpha: 0.92)
                            : EldritchColors.uiNeutral.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(32),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: isHighlighted ? 0.9 : 0.35),
                          width: isHighlighted ? 2 : 1,
                        ),
                      ),
                      child: const Icon(Icons.close, color: Colors.white, size: 28),
                    );
                  },
                ),
                const SizedBox(width: 12),
                // Delete button
                DragTarget<TimelineEvent>(
                  onWillAcceptWithDetails: (details) => _isDraggable(details.data),
                  onAcceptWithDetails: (details) {
                    widget.onDeleteEvent(details.data);
                    setState(() {
                      _draggingEventId = null;
                      _dragOverInsertIndex = null;
                    });
                  },
                  builder: (context, candidateData, rejectedData) {
                    final isHighlighted = candidateData.isNotEmpty;
                    return AnimatedContainer(
                      duration: const Duration(milliseconds: 120),
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: isHighlighted
                            ? EldritchColors.bloodSeal.withValues(alpha: 0.92)
                            : EldritchColors.bloodSeal.withValues(alpha: 0.78),
                        borderRadius: BorderRadius.circular(32),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: isHighlighted ? 0.9 : 0.35),
                          width: isHighlighted ? 2 : 1,
                        ),
                      ),
                      child: const Icon(Icons.delete_forever, color: Colors.white, size: 30),
                    );
                  },
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildEventTile(TimelineEvent event) {
    if (!_isDraggable(event)) {
      return TimelineCard(
        event: event,
        actorName: _resolveActorName(event),
      );
    }

    return LongPressDraggable<TimelineEvent>(
      data: event,
      onDragStarted: () {
        setState(() {
          _draggingEventId = event.id;
        });
      },
      onDragEnd: (_) {
        setState(() {
          _draggingEventId = null;
          _dragOverInsertIndex = null;
        });
      },
      feedback: Material(
        color: Colors.transparent,
        child: SizedBox(
          width: 260,
          child: TimelineCard(
            event: event,
            actorName: _resolveActorName(event),
            isDragging: true,
          ),
        ),
      ),
      childWhenDragging: Opacity(
        opacity: 0.35,
        child: TimelineCard(
          event: event,
          actorName: _resolveActorName(event),
        ),
      ),
      child: TimelineCard(
        event: event,
        actorName: _resolveActorName(event),
      ),
    );
  }

  Widget _buildDropSlot(List<TimelineEvent> allEvents, int insertIndex) {
    final isDragging = _draggingEventId != null;
    final isHovered = _dragOverInsertIndex == insertIndex;

    if (!isDragging) {
      return const SizedBox(height: 4);
    }

    return DragTarget<TimelineEvent>(
      onWillAcceptWithDetails: (details) => _isDraggable(details.data),
      onMove: (_) {
        if (_dragOverInsertIndex != insertIndex) {
          setState(() => _dragOverInsertIndex = insertIndex);
        }
      },
      onLeave: (_) {
        if (_dragOverInsertIndex == insertIndex) {
          setState(() => _dragOverInsertIndex = null);
        }
      },
      onAcceptWithDetails: (details) {
        final dragged = details.data;
        final fromIndex = allEvents.indexWhere((e) => e.id == dragged.id);
        // Skip no-op: dropping right before or right after original position
        if (fromIndex == insertIndex || fromIndex == insertIndex - 1) {
          setState(() {
            _draggingEventId = null;
            _dragOverInsertIndex = null;
          });
          return;
        }
        final reordered = _reorderList([...allEvents], dragged.id, insertIndex);
        if (reordered == null) return;

        widget.onReorderEvents(reordered);
        setState(() {
          _draggingEventId = null;
          _dragOverInsertIndex = null;
        });
      },
      builder: (context, candidateData, rejectedData) {
        final active = candidateData.isNotEmpty || isHovered;
        final height = active ? 28.0 : 20.0;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 120),
          height: height,
          margin: const EdgeInsets.symmetric(horizontal: 8),
          decoration: BoxDecoration(
            color: active
                ? EldritchColors.ritual.withValues(alpha: 0.35)
                : EldritchColors.ritual.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              color: EldritchColors.ritual.withValues(alpha: active ? 0.9 : 0.4),
              width: active ? 2.5 : 1,
            ),
          ),
        );
      },
    );
  }

  /// Returns a new list with the event [eventId] moved to [insertIndex], or null if not found.
  List<TimelineEvent>? _reorderList(
    List<TimelineEvent> list,
    String eventId,
    int insertIndex,
  ) {
    final fromIndex = list.indexWhere((e) => e.id == eventId);
    if (fromIndex == -1) return null;

    final event = list.removeAt(fromIndex);
    var targetIndex = insertIndex;
    if (fromIndex < targetIndex) targetIndex -= 1;
    targetIndex = targetIndex.clamp(0, list.length);
    list.insert(targetIndex, event);
    return list;
  }

  bool _isDraggable(TimelineEvent event) {
    // Keep story/placement/global events fixed in the timeline.
    return event.type != TimelineEventType.story &&
        event.type != TimelineEventType.placement &&
        event.playerId != 'global';
  }

  String? _resolveActorName(TimelineEvent event) {
    if (event.playerId == 'global') {
      return 'World';
    }
    for (final player in widget.players) {
      if (player.id == event.playerId) {
        return player.displayName;
      }
    }
    return 'Unknown';
  }
}
