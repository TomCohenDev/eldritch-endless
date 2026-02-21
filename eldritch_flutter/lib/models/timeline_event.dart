import 'package:uuid/uuid.dart';

enum TimelineEventType {
  story,      // Initial "Begin Investigation" card with full story
  placement,  // Investigator initial placement / location tracking
  encounter,
  mythos,
  action,
  custom,
}

enum ActionType {
  travel,
  rest,
  trade,
  prepareTravel,
  acquireAssets,
  component,
  localAction,
  custom,
}

class TimelineEvent {
  final String id;
  final TimelineEventType type;
  final ActionType? actionType;
  final String title;
  final String description;
  final String playerId;
  final DateTime timestamp;
  final Map<String, dynamic>? metadata;

  TimelineEvent({
    String? id,
    required this.type,
    this.actionType,
    required this.title,
    required this.description,
    required this.playerId,
    DateTime? timestamp,
    this.metadata,
  })  : id = id ?? const Uuid().v4(),
        timestamp = timestamp ?? DateTime.now();

  factory TimelineEvent.fromJson(Map<String, dynamic> json) {
    return TimelineEvent(
      id: json['id'],
      type: TimelineEventType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => TimelineEventType.custom,
      ),
      actionType: json['actionType'] != null
          ? ActionType.values.firstWhere(
              (e) => e.name == json['actionType'],
              orElse: () => ActionType.custom,
            )
          : null,
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      playerId: json['playerId'] ?? '',
      timestamp: DateTime.tryParse(json['timestamp'] ?? '') ?? DateTime.now(),
      metadata: json['metadata'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.name,
      'actionType': actionType?.name,
      'title': title,
      'description': description,
      'playerId': playerId,
      'timestamp': timestamp.toIso8601String(),
      'metadata': metadata,
    };
  }

  TimelineEvent copyWith({
    String? id,
    TimelineEventType? type,
    ActionType? actionType,
    String? title,
    String? description,
    String? playerId,
    DateTime? timestamp,
    Map<String, dynamic>? metadata,
  }) {
    return TimelineEvent(
      id: id ?? this.id,
      type: type ?? this.type,
      actionType: actionType ?? this.actionType,
      title: title ?? this.title,
      description: description ?? this.description,
      playerId: playerId ?? this.playerId,
      timestamp: timestamp ?? this.timestamp,
      metadata: metadata ?? this.metadata,
    );
  }

  /// Create an action event
  factory TimelineEvent.action({
    required ActionType actionType,
    required String playerId,
    String? description,
  }) {
    return TimelineEvent(
      type: TimelineEventType.action,
      actionType: actionType,
      title: _getActionTitle(actionType),
      description: description ?? '',
      playerId: playerId,
    );
  }

  /// Create a custom note event
  factory TimelineEvent.custom({
    required String title,
    required String description,
    required String playerId,
  }) {
    return TimelineEvent(
      type: TimelineEventType.custom,
      actionType: ActionType.custom,
      title: title,
      description: description,
      playerId: playerId,
    );
  }

  /// Create an encounter event
  factory TimelineEvent.encounter({
    required String title,
    required String description,
    required String playerId,
    Map<String, dynamic>? encounterData,
  }) {
    return TimelineEvent(
      type: TimelineEventType.encounter,
      title: title,
      description: description,
      playerId: playerId,
      metadata: encounterData,
    );
  }

  /// Create a mythos event
  factory TimelineEvent.mythos({
    required String title,
    required String description,
    required String playerId,
    Map<String, dynamic>? mythosData,
  }) {
    return TimelineEvent(
      type: TimelineEventType.mythos,
      title: title,
      description: description,
      playerId: playerId,
      metadata: mythosData,
    );
  }

  /// Create the initial story event (Begin Investigation card)
  factory TimelineEvent.story({
    required String ancientOneName,
    required String ancientOneHook,
    required List<Map<String, String>> investigatorStories,
  }) {
    // Build full description combining ancient one hook and investigator stories
    final buffer = StringBuffer();
    buffer.writeln(ancientOneHook);

    if (investigatorStories.isNotEmpty) {
      buffer.writeln();
      buffer.writeln('--- THE INVESTIGATORS ---');
      for (final story in investigatorStories) {
        buffer.writeln();
        buffer.writeln('${story['name']}:');
        buffer.writeln(story['story']);
      }
    }

    return TimelineEvent(
      type: TimelineEventType.story,
      title: 'THE AWAKENING',
      description: buffer.toString().trim(),
      playerId: 'global',
      metadata: {
        'ancientOneName': ancientOneName,
        'ancientOneHook': ancientOneHook,
        'investigatorStories': investigatorStories,
      },
    );
  }

  /// Create an initial placement event for an investigator
  factory TimelineEvent.placement({
    required String investigatorName,
    required String location,
    required String playerId,
  }) {
    return TimelineEvent(
      type: TimelineEventType.placement,
      title: 'Started at $location',
      description: '$investigatorName begins their investigation in $location.',
      playerId: playerId,
      metadata: {
        'investigatorName': investigatorName,
        'location': location,
        'locationType': _getLocationType(location),
      },
    );
  }

  static const _numberedSpaceTypes = {
    'Space 1': 'city', 'Space 2': 'sea', 'Space 3': 'sea',
    'Space 4': 'wilderness', 'Space 5': 'city', 'Space 6': 'city',
    'Space 7': 'city', 'Space 8': 'sea', 'Space 9': 'wilderness',
    'Space 10': 'wilderness', 'Space 11': 'sea', 'Space 12': 'sea',
    'Space 13': 'sea', 'Space 14': 'city', 'Space 15': 'city',
    'Space 16': 'city', 'Space 17': 'city', 'Space 18': 'sea',
    'Space 19': 'wilderness', 'Space 20': 'city', 'Space 21': 'wilderness',
  };

  /// Determine the location type (city, wilderness, sea) from location name
  static String _getLocationType(String location) {
    final numbered = _numberedSpaceTypes[location];
    if (numbered != null) return numbered;

    const cities = [
      'Arkham', 'Buenos Aires', 'Istanbul', 'London', 'Rome',
      'San Francisco', 'Shanghai', 'Sydney', 'Tokyo',
    ];
    const wilderness = [
      'Amazon', 'Antarctica', 'Himalayas', 'Pyramids', 'Tunguska',
    ];
    const sea = [
      'Sea', 'Ocean', 'Atlantic', 'Pacific', 'Indian',
    ];

    final loc = location.toLowerCase();
    for (final city in cities) {
      if (loc.contains(city.toLowerCase())) return 'city';
    }
    for (final wild in wilderness) {
      if (loc.contains(wild.toLowerCase())) return 'wilderness';
    }
    for (final s in sea) {
      if (loc.contains(s.toLowerCase())) return 'sea';
    }
    return 'city';
  }

  static String _getActionTitle(ActionType type) {
    switch (type) {
      case ActionType.travel:
        return 'Travel';
      case ActionType.rest:
        return 'Rest';
      case ActionType.trade:
        return 'Trade';
      case ActionType.prepareTravel:
        return 'Prepare for Travel';
      case ActionType.acquireAssets:
        return 'Acquire Assets';
      case ActionType.component:
        return 'Component Action';
      case ActionType.localAction:
        return 'Local Action';
      case ActionType.custom:
        return 'Custom Action';
    }
  }
}
