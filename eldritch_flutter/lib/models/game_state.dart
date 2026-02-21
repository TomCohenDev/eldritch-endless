import 'package:uuid/uuid.dart';
import 'ancient_one.dart';
import 'player.dart';
import 'mythos_card.dart';
import 'timeline_event.dart';

class NarratorVoice {
  final String id;
  final String elevenLabsId;
  final String name;
  final String description;
  final String sampleFile;

  const NarratorVoice({
    required this.id,
    required this.elevenLabsId,
    required this.name,
    required this.description,
    required this.sampleFile,
  });

  factory NarratorVoice.fromJson(Map<String, dynamic> json) {
    return NarratorVoice(
      id: json['id'] ?? '',
      elevenLabsId: json['elevenLabsId'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      sampleFile: json['sampleFile'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'elevenLabsId': elevenLabsId,
      'name': name,
      'description': description,
      'sampleFile': sampleFile,
    };
  }

  static const List<NarratorVoice> availableVoices = [
    NarratorVoice(
      id: 'amelia_tyler',
      elevenLabsId: 'VzL0S5icwVNq22k4PQh9',
      name: 'Amelia Tyler',
      description: 'Rich and dramatic, a classic narrator\'s voice',
      sampleFile: 'assets/audio/voices/amelia_tyler.mp3',
    ),
    NarratorVoice(
      id: 'claire',
      elevenLabsId: 'tmtVLLFJVXmAZYwJoVdL',
      name: 'Claire',
      description: 'Calm and measured, with an air of quiet authority',
      sampleFile: 'assets/audio/voices/claire.mp3',
    ),
    NarratorVoice(
      id: 'priyanka',
      elevenLabsId: 'BpjGufoPiobT79j2vtj4',
      name: 'Priyanka',
      description: 'Warm and inviting, with a storyteller\'s cadence',
      sampleFile: 'assets/audio/voices/priyanka.mp3',
    ),
    NarratorVoice(
      id: 'cedric',
      elevenLabsId: 'BQOei2tk6QCBMHQWPhbj',
      name: 'Cedric',
      description: 'Deep and resonant, evoking ancient mysteries',
      sampleFile: 'assets/audio/voices/cedric.mp3',
    ),
    NarratorVoice(
      id: 'global_artist',
      elevenLabsId: 'NtSmOMyr386gAQrqbQcB',
      name: 'Global Artist',
      description: 'Versatile and expressive, adapting to any tale',
      sampleFile: 'assets/audio/voices/global-artist.mp3',
    ),
    NarratorVoice(
      id: 'celest',
      elevenLabsId: 'iF3or9nmjbmmkApwUOyk',
      name: 'Celest',
      description: 'Ethereal and haunting, perfect for cosmic horror',
      sampleFile: 'assets/audio/voices/celest.mp3',
    ),
  ];
}

class StoryGeneration {
  final String ancientOneHook;
  final String ancientOneHookNarration; // With audio tags for TTS
  final List<InvestigatorStory> investigatorStories;
  final StagePlans stagePlans;

  StoryGeneration({
    required this.ancientOneHook,
    String? ancientOneHookNarration,
    required this.investigatorStories,
    required this.stagePlans,
  }) : ancientOneHookNarration = ancientOneHookNarration ?? ancientOneHook;

  factory StoryGeneration.fromJson(Map<String, dynamic> json) {
    return StoryGeneration(
      ancientOneHook: json['ancientOneHook'] ?? '',
      ancientOneHookNarration: json['ancientOneHookNarration'] ?? json['ancientOneHook'] ?? '',
      investigatorStories: (json['investigatorStories'] as List<dynamic>?)
              ?.map((e) => InvestigatorStory.fromJson(e))
              .toList() ??
          [],
      stagePlans: StagePlans.fromJson(json['stagePlans'] ?? {}),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'ancientOneHook': ancientOneHook,
      'ancientOneHookNarration': ancientOneHookNarration,
      'investigatorStories': investigatorStories.map((e) => e.toJson()).toList(),
      'stagePlans': stagePlans.toJson(),
    };
  }

  /// Get the full narration script with all audio tags for TTS
  String get fullNarrationScript {
    final buffer = StringBuffer();

    // Ancient One hook narration
    buffer.writeln(ancientOneHookNarration);
    buffer.writeln();

    // Investigator stories narration
    for (final story in investigatorStories) {
      buffer.writeln(story.storyNarration);
      buffer.writeln();
    }

    return buffer.toString().trim();
  }
}

class InvestigatorStory {
  final String name;
  final String story;
  final String storyNarration; // With audio tags for TTS

  InvestigatorStory({
    required this.name,
    required this.story,
    String? storyNarration,
  }) : storyNarration = storyNarration ?? story;

  factory InvestigatorStory.fromJson(Map<String, dynamic> json) {
    return InvestigatorStory(
      name: json['name'] ?? '',
      story: json['story'] ?? '',
      storyNarration: json['storyNarration'] ?? json['story'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'story': story,
      'storyNarration': storyNarration,
    };
  }
}

class StagePlans {
  final String stage1;
  final String stage2;
  final String stage3;

  StagePlans({
    required this.stage1,
    required this.stage2,
    required this.stage3,
  });

  factory StagePlans.fromJson(Map<String, dynamic> json) {
    return StagePlans(
      stage1: json['stage1'] ?? '',
      stage2: json['stage2'] ?? '',
      stage3: json['stage3'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'stage1': stage1,
      'stage2': stage2,
      'stage3': stage3,
    };
  }
}

class GameState {
  final String id;
  final String name;
  final DateTime createdAt;
  final DateTime lastPlayedAt;
  final AncientOne ancientOne;
  final List<Player> players;
  final String activePlayerId;
  final NarratorVoice narratorVoice;
  final StoryGeneration? storyGeneration;
  final int currentStage;
  final List<MythosCard> mythosDeck;
  final List<MythosCard> mythosDiscard;
  final int doomTrack;
  final List<TimelineEvent> globalTimeline;

  GameState({
    String? id,
    required this.name,
    DateTime? createdAt,
    DateTime? lastPlayedAt,
    required this.ancientOne,
    required this.players,
    String? activePlayerId,
    required this.narratorVoice,
    this.storyGeneration,
    this.currentStage = 1,
    List<MythosCard>? mythosDeck,
    List<MythosCard>? mythosDiscard,
    int? doomTrack,
    List<TimelineEvent>? globalTimeline,
  })  : id = id ?? const Uuid().v4(),
        createdAt = createdAt ?? DateTime.now(),
        lastPlayedAt = lastPlayedAt ?? DateTime.now(),
        activePlayerId = activePlayerId ?? (players.isNotEmpty ? players.first.id : ''),
        mythosDeck = mythosDeck ?? [],
        mythosDiscard = mythosDiscard ?? [],
        doomTrack = doomTrack ?? ancientOne.startingDoom,
        globalTimeline = globalTimeline ?? [];

  factory GameState.fromJson(Map<String, dynamic> json) {
    return GameState(
      id: json['id'],
      name: json['name'] ?? 'Untitled Game',
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      lastPlayedAt: DateTime.tryParse(json['lastPlayedAt'] ?? '') ?? DateTime.now(),
      ancientOne: AncientOne.fromJson(json['ancientOne']),
      players: (json['players'] as List<dynamic>)
          .map((e) => Player.fromJson(e))
          .toList(),
      activePlayerId: json['activePlayerId'],
      narratorVoice: json['narratorVoice'] != null
          ? NarratorVoice.fromJson(json['narratorVoice'])
          : NarratorVoice.availableVoices.first,
      storyGeneration: json['storyGeneration'] != null
          ? StoryGeneration.fromJson(json['storyGeneration'])
          : null,
      currentStage: json['currentStage'] ?? 1,
      mythosDeck: (json['mythosDeck'] as List<dynamic>?)
              ?.map((e) => MythosCard.fromJson(e))
              .toList() ??
          [],
      mythosDiscard: (json['mythosDiscard'] as List<dynamic>?)
              ?.map((e) => MythosCard.fromJson(e))
              .toList() ??
          [],
      doomTrack: json['doomTrack'],
      globalTimeline: (json['globalTimeline'] as List<dynamic>?)
              ?.map((e) => TimelineEvent.fromJson(e))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'createdAt': createdAt.toIso8601String(),
      'lastPlayedAt': lastPlayedAt.toIso8601String(),
      'ancientOne': ancientOne.toJson(),
      'players': players.map((e) => e.toJson()).toList(),
      'activePlayerId': activePlayerId,
      'narratorVoice': narratorVoice.toJson(),
      'storyGeneration': storyGeneration?.toJson(),
      'currentStage': currentStage,
      'mythosDeck': mythosDeck.map((e) => e.toJson()).toList(),
      'mythosDiscard': mythosDiscard.map((e) => e.toJson()).toList(),
      'doomTrack': doomTrack,
      'globalTimeline': globalTimeline.map((e) => e.toJson()).toList(),
    };
  }

  GameState copyWith({
    String? id,
    String? name,
    DateTime? createdAt,
    DateTime? lastPlayedAt,
    AncientOne? ancientOne,
    List<Player>? players,
    String? activePlayerId,
    NarratorVoice? narratorVoice,
    StoryGeneration? storyGeneration,
    int? currentStage,
    List<MythosCard>? mythosDeck,
    List<MythosCard>? mythosDiscard,
    int? doomTrack,
    List<TimelineEvent>? globalTimeline,
  }) {
    return GameState(
      id: id ?? this.id,
      name: name ?? this.name,
      createdAt: createdAt ?? this.createdAt,
      lastPlayedAt: lastPlayedAt ?? this.lastPlayedAt,
      ancientOne: ancientOne ?? this.ancientOne,
      players: players ?? this.players,
      activePlayerId: activePlayerId ?? this.activePlayerId,
      narratorVoice: narratorVoice ?? this.narratorVoice,
      storyGeneration: storyGeneration ?? this.storyGeneration,
      currentStage: currentStage ?? this.currentStage,
      mythosDeck: mythosDeck ?? this.mythosDeck,
      mythosDiscard: mythosDiscard ?? this.mythosDiscard,
      doomTrack: doomTrack ?? this.doomTrack,
      globalTimeline: globalTimeline ?? this.globalTimeline,
    );
  }

  /// Get the currently active player
  Player? get activePlayer {
    try {
      return players.firstWhere((p) => p.id == activePlayerId);
    } catch (_) {
      return players.isNotEmpty ? players.first : null;
    }
  }

  /// Update a specific player
  GameState updatePlayer(Player updatedPlayer) {
    return copyWith(
      players: players.map((p) => p.id == updatedPlayer.id ? updatedPlayer : p).toList(),
      lastPlayedAt: DateTime.now(),
    );
  }

  /// Draw a mythos card
  (GameState, MythosCard?) drawMythosCard() {
    if (mythosDeck.isEmpty) {
      return (this, null);
    }

    final card = mythosDeck.first;
    final newDeck = mythosDeck.sublist(1);
    final newDiscard = [...mythosDiscard, card];

    // Check if we need to advance to the next stage
    int newStage = currentStage;
    if (newDeck.isEmpty && currentStage < 3) {
      newStage = currentStage + 1;
    }

    return (
      copyWith(
        mythosDeck: newDeck,
        mythosDiscard: newDiscard,
        currentStage: newStage,
        lastPlayedAt: DateTime.now(),
      ),
      card
    );
  }

  /// Add a global timeline event
  GameState addGlobalEvent(TimelineEvent event) {
    return copyWith(
      globalTimeline: [...globalTimeline, event],
      lastPlayedAt: DateTime.now(),
    );
  }
}

/// Summary of a saved game for display in the game list
class GameSummary {
  final String id;
  final String name;
  final String ancientOneName;
  final int playerCount;
  final DateTime lastPlayedAt;

  GameSummary({
    required this.id,
    required this.name,
    required this.ancientOneName,
    required this.playerCount,
    required this.lastPlayedAt,
  });

  factory GameSummary.fromGameState(GameState state) {
    return GameSummary(
      id: state.id,
      name: state.name,
      ancientOneName: state.ancientOne.name,
      playerCount: state.players.length,
      lastPlayedAt: state.lastPlayedAt,
    );
  }

  factory GameSummary.fromJson(Map<String, dynamic> json) {
    return GameSummary(
      id: json['id'] ?? '',
      name: json['name'] ?? 'Untitled',
      ancientOneName: json['ancientOneName'] ?? '',
      playerCount: json['playerCount'] ?? 0,
      lastPlayedAt: DateTime.tryParse(json['lastPlayedAt'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'ancientOneName': ancientOneName,
      'playerCount': playerCount,
      'lastPlayedAt': lastPlayedAt.toIso8601String(),
    };
  }
}
