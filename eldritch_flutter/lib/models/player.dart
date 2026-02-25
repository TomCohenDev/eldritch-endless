import 'package:uuid/uuid.dart';
import 'investigator.dart';
import 'timeline_event.dart';

class Player {
  final String id;
  final Investigator investigator;
  final int currentHealth;
  final int currentSanity;
  final String currentLocation;
  final List<TimelineEvent> timeline;
  final bool isDead;

  Player({
    String? id,
    required this.investigator,
    int? currentHealth,
    int? currentSanity,
    String? currentLocation,
    List<TimelineEvent>? timeline,
    bool? isDead,
  })  : id = id ?? const Uuid().v4(),
        currentHealth = currentHealth ?? investigator.health,
        currentSanity = currentSanity ?? investigator.sanity,
        currentLocation = currentLocation ?? investigator.startingLocation,
        timeline = timeline ?? [],
        isDead = isDead ?? false;

  factory Player.fromJson(Map<String, dynamic> json) {
    return Player(
      id: json['id'],
      investigator: Investigator.fromJson(json['investigator']),
      currentHealth: json['currentHealth'],
      currentSanity: json['currentSanity'],
      currentLocation: json['currentLocation'],
      timeline: (json['timeline'] as List<dynamic>?)
              ?.map((e) => TimelineEvent.fromJson(e))
              .toList() ??
          [],
      isDead: json['isDead'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'investigator': investigator.toJson(),
      'currentHealth': currentHealth,
      'currentSanity': currentSanity,
      'currentLocation': currentLocation,
      'timeline': timeline.map((e) => e.toJson()).toList(),
      'isDead': isDead,
    };
  }

  Player copyWith({
    String? id,
    Investigator? investigator,
    int? currentHealth,
    int? currentSanity,
    String? currentLocation,
    List<TimelineEvent>? timeline,
    bool? isDead,
  }) {
    return Player(
      id: id ?? this.id,
      investigator: investigator ?? this.investigator,
      currentHealth: currentHealth ?? this.currentHealth,
      currentSanity: currentSanity ?? this.currentSanity,
      currentLocation: currentLocation ?? this.currentLocation,
      timeline: timeline ?? this.timeline,
      isDead: isDead ?? this.isDead,
    );
  }

  /// Add an event to this player's timeline
  Player addTimelineEvent(TimelineEvent event) {
    return copyWith(
      timeline: [...timeline, event.copyWith(playerId: id)],
    );
  }

  /// Remove an event from this player's timeline
  Player removeTimelineEvent(String eventId) {
    return copyWith(
      timeline: timeline.where((e) => e.id != eventId).toList(),
    );
  }

  /// Get display name (investigator name without quotes)
  String get displayName {
    return investigator.name.replaceAll('"', '');
  }

  /// Check if player is defeated (health or sanity <= 0)
  bool get isDefeated => currentHealth <= 0 || currentSanity <= 0;
}
