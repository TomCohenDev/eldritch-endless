import 'dart:convert';
import 'dart:io';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';
import '../models/game_state.dart';

class StorageService {
  static const _secureStorage = FlutterSecureStorage();
  static const _anthropicKeyKey = 'anthropic_api_key';
  static const _elevenLabsKeyKey = 'elevenlabs_api_key';
  static const _gamesDir = 'games';

  // API Keys (encrypted storage)

  Future<void> saveAnthropicApiKey(String key) async {
    await _secureStorage.write(key: _anthropicKeyKey, value: key);
  }

  Future<String?> getAnthropicApiKey() async {
    return await _secureStorage.read(key: _anthropicKeyKey);
  }

  Future<void> saveElevenLabsApiKey(String key) async {
    await _secureStorage.write(key: _elevenLabsKeyKey, value: key);
  }

  Future<String?> getElevenLabsApiKey() async {
    return await _secureStorage.read(key: _elevenLabsKeyKey);
  }

  Future<void> clearApiKeys() async {
    await _secureStorage.delete(key: _anthropicKeyKey);
    await _secureStorage.delete(key: _elevenLabsKeyKey);
  }

  // Game State Storage (file-based)

  Future<Directory> _getGamesDirectory() async {
    final appDir = await getApplicationDocumentsDirectory();
    final gamesDir = Directory('${appDir.path}/$_gamesDir');
    if (!await gamesDir.exists()) {
      await gamesDir.create(recursive: true);
    }
    return gamesDir;
  }

  Future<void> saveGame(GameState game) async {
    final gamesDir = await _getGamesDirectory();
    final file = File('${gamesDir.path}/${game.id}.json');
    final json = jsonEncode(game.toJson());
    await file.writeAsString(json);
  }

  Future<GameState?> loadGame(String gameId) async {
    try {
      final gamesDir = await _getGamesDirectory();
      final file = File('${gamesDir.path}/$gameId.json');
      if (!await file.exists()) {
        return null;
      }
      final json = await file.readAsString();
      final data = jsonDecode(json) as Map<String, dynamic>;
      return GameState.fromJson(data);
    } catch (e) {
      print('Error loading game $gameId: $e');
      return null;
    }
  }

  Future<void> deleteGame(String gameId) async {
    final gamesDir = await _getGamesDirectory();
    final file = File('${gamesDir.path}/$gameId.json');
    if (await file.exists()) {
      await file.delete();
    }
  }

  Future<List<GameSummary>> listSavedGames() async {
    try {
      final gamesDir = await _getGamesDirectory();
      final files = await gamesDir.list().toList();
      final summaries = <GameSummary>[];

      for (final file in files) {
        if (file is File && file.path.endsWith('.json')) {
          try {
            final json = await file.readAsString();
            final data = jsonDecode(json) as Map<String, dynamic>;
            final gameState = GameState.fromJson(data);
            summaries.add(GameSummary.fromGameState(gameState));
          } catch (e) {
            print('Error reading game file ${file.path}: $e');
          }
        }
      }

      // Sort by last played, most recent first
      summaries.sort((a, b) => b.lastPlayedAt.compareTo(a.lastPlayedAt));
      return summaries;
    } catch (e) {
      print('Error listing saved games: $e');
      return [];
    }
  }

  Future<bool> hasAnySavedGames() async {
    final games = await listSavedGames();
    return games.isNotEmpty;
  }
}
