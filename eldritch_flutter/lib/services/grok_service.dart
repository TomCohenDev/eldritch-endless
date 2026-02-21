import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/encounter.dart';
import '../models/game_state.dart';
import '../models/mythos_card.dart';
import '../prompts/encounter_prompt.dart';
import '../prompts/mythos_prompt.dart';
import 'storage_service.dart';

class GrokService {
  static GrokService? _instance;
  static const String _baseUrl = 'https://api.x.ai/v1/chat/completions';
  static const String _defaultModel = 'grok-3-mini';

  final StorageService _storageService = StorageService();
  String? _apiKey;
  bool _isInitialized = false;

  GrokService._();

  static GrokService get instance {
    _instance ??= GrokService._();
    return _instance!;
  }

  bool get isInitialized => _isInitialized && _apiKey != null && _apiKey!.isNotEmpty;

  /// Initialize the service by loading the API key from storage
  Future<void> initialize() async {
    _apiKey = await _storageService.getGrokApiKey();
    _isInitialized = _apiKey != null && _apiKey!.isNotEmpty;
  }

  /// Set the API key directly (used when saving settings)
  void setApiKey(String key) {
    _apiKey = key;
    _isInitialized = key.isNotEmpty;
  }

  /// Validate the API key by making a test request
  Future<bool> validateApiKey(String apiKey) async {
    debugPrint('[Grok DEBUG] validateApiKey: starting validation');
    try {
      final request = http.Request('POST', Uri.parse(_baseUrl));
      request.headers.addAll({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $apiKey',
      });
      request.body = jsonEncode({
        'model': _defaultModel,
        'messages': [
          {'role': 'user', 'content': 'Hello'}
        ],
        'max_tokens': 5,
      });

      final client = http.Client();
      try {
        debugPrint('[Grok DEBUG] validateApiKey: sending request...');
        final response = await client.send(request).timeout(
          const Duration(seconds: 15),
          onTimeout: () {
            debugPrint('[Grok DEBUG] validateApiKey: request timed out');
            throw TimeoutException('Validation request timed out');
          },
        );
        debugPrint('[Grok DEBUG] validateApiKey: response status=${response.statusCode}');
        // Consume the response body to complete the request
        await response.stream.drain();
        final isValid = response.statusCode == 200;
        debugPrint('[Grok DEBUG] validateApiKey: isValid=$isValid');
        return isValid;
      } finally {
        client.close();
      }
    } catch (e) {
      debugPrint('[Grok DEBUG] validateApiKey: error=$e');
      return false;
    }
  }

  /// Stream text generation from Grok API
  Stream<String> _streamGenerate({
    required String systemPrompt,
    required String userPrompt,
    String model = _defaultModel,
    double temperature = 0.7,
  }) async* {
    if (_apiKey == null || _apiKey!.isEmpty) {
      debugPrint('[Grok DEBUG] _streamGenerate: API key not configured');
      throw Exception('Grok API key not configured. Add it in Settings.');
    }

    debugPrint('[Grok DEBUG] _streamGenerate: starting request');
    debugPrint('[Grok DEBUG] _streamGenerate: model=$model temperature=$temperature');
    debugPrint('[Grok DEBUG] _streamGenerate: systemPrompt length=${systemPrompt.length} userPrompt length=${userPrompt.length}');

    final request = http.Request('POST', Uri.parse(_baseUrl));
    request.headers.addAll({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $_apiKey',
    });

    request.body = jsonEncode({
      'model': model,
      'messages': [
        {'role': 'system', 'content': systemPrompt},
        {'role': 'user', 'content': userPrompt}
      ],
      'stream': true,
      'temperature': temperature,
    });

    final client = http.Client();
    var chunkCount = 0;
    var totalChars = 0;

    try {
      final streamedResponse = await client.send(request);
      debugPrint('[Grok DEBUG] _streamGenerate: response status=${streamedResponse.statusCode}');

      if (streamedResponse.statusCode != 200) {
        final errorBody = await streamedResponse.stream.bytesToString();
        debugPrint('[Grok DEBUG] _streamGenerate: error body=$errorBody');
        throw Exception('Grok API Error ${streamedResponse.statusCode}: $errorBody');
      }

      await for (final line in streamedResponse.stream
          .transform(utf8.decoder)
          .transform(const LineSplitter())) {
        if (line.startsWith('data: ')) {
          final data = line.substring(6).trim();

          if (data == '[DONE]') {
            debugPrint('[Grok DEBUG] _streamGenerate: stream done chunks=$chunkCount totalChars=$totalChars');
            break;
          }
          if (data.isEmpty) continue;

          try {
            final json = jsonDecode(data);
            final choices = json['choices'] as List;
            if (choices.isNotEmpty) {
              final delta = choices[0]['delta'];
              if (delta != null && delta['content'] != null) {
                final content = delta['content'] as String;
                chunkCount++;
                totalChars += content.length;
                yield content;
              }
            }
          } catch (e) {
            debugPrint('[Grok DEBUG] _streamGenerate: chunk parse error: $e');
            // Continue processing other chunks even if one fails
          }
        }
      }
    } finally {
      client.close();
    }
  }

  /// Generate text (non-streaming) using Grok API
  Future<String> _generate({
    required String systemPrompt,
    required String userPrompt,
    String model = _defaultModel,
    double temperature = 0.7,
  }) async {
    debugPrint('[Grok DEBUG] _generate: start model=$model temperature=$temperature');
    final stopwatch = Stopwatch()..start();
    final buffer = StringBuffer();
    await for (final token in _streamGenerate(
      systemPrompt: systemPrompt,
      userPrompt: userPrompt,
      model: model,
      temperature: temperature,
    )) {
      buffer.write(token);
    }
    final result = buffer.toString();
    stopwatch.stop();
    debugPrint('[Grok DEBUG] _generate: done in ${stopwatch.elapsedMilliseconds}ms resultLength=${result.length}');
    return result;
  }

  /// Generate encounter text using Grok API (single encounter)
  Future<String> generateEncounter({
    required Encounter encounter,
    required GameState gameState,
    required EncounterType requestedType,
    required String requestedSubType,
  }) async {
    debugPrint('[Grok DEBUG] generateEncounter: ENTRY');
    debugPrint('[Grok DEBUG] generateEncounter: requestedType=$requestedType requestedSubType=$requestedSubType');
    debugPrint('[Grok DEBUG] generateEncounter: encounter type=${encounter.type} subType=${encounter.subType} rawTextLength=${encounter.rawText.length}');
    debugPrint('[Grok DEBUG] generateEncounter: gameState ancientOne=${gameState.ancientOne.name} currentStage=${gameState.currentStage} activePlayer=${gameState.activePlayer?.investigator.name}');

    if (!isInitialized) {
      debugPrint('[Grok DEBUG] generateEncounter: ABORT - not initialized');
      throw Exception('Grok API is not configured. Add your API key in Settings.');
    }

    final prompt = EncounterPrompt.buildPrompt(
      encounter: encounter,
      gameState: gameState,
      requestedType: requestedType,
      requestedSubType: requestedSubType,
    );
    debugPrint('[Grok DEBUG] generateEncounter: prompt built length=${prompt.length}');

    try {
      debugPrint('[Grok DEBUG] generateEncounter: calling _generate...');
      final response = await _generate(
        systemPrompt: 'You are a creative writer for the board game Eldritch Horror. Write atmospheric, cosmic horror content.',
        userPrompt: prompt,
      );
      debugPrint('[Grok DEBUG] generateEncounter: raw API response length=${response.length}');
      debugPrint('[Grok DEBUG] generateEncounter: raw API response (first 500 chars): ${response.length > 500 ? response.substring(0, 500) : response}');

      // Clean up response - remove any accidental prefixes
      final cleanedResponse = response.trim();
      debugPrint('[Grok DEBUG] generateEncounter: EXIT OK');
      return cleanedResponse;
    } catch (e, stack) {
      debugPrint('[Grok DEBUG] generateEncounter: EXIT ERROR $e');
      debugPrint('[Grok DEBUG] generateEncounter: stackTrace $stack');
      throw Exception('Encounter generation failed: $e');
    }
  }

  /// Stream encounter generation for real-time display
  Stream<String> streamEncounter({
    required Encounter encounter,
    required GameState gameState,
    required EncounterType requestedType,
    required String requestedSubType,
  }) async* {
    debugPrint('[Grok DEBUG] streamEncounter: ENTRY');

    if (!isInitialized) {
      debugPrint('[Grok DEBUG] streamEncounter: not initialized');
      throw Exception('Grok API is not configured. Add your API key in Settings.');
    }

    final prompt = EncounterPrompt.buildPrompt(
      encounter: encounter,
      gameState: gameState,
      requestedType: requestedType,
      requestedSubType: requestedSubType,
    );
    debugPrint('[Grok DEBUG] streamEncounter: prompt built length=${prompt.length}');

    await for (final token in _streamGenerate(
      systemPrompt: 'You are a creative writer for the board game Eldritch Horror. Write atmospheric, cosmic horror content.',
      userPrompt: prompt,
    )) {
      yield token;
    }
    debugPrint('[Grok DEBUG] streamEncounter: stream completed');
  }

  /// Generate mythos flavor text using Grok API
  Future<String> generateMythosText({
    required MythosCard card,
    required GameState gameState,
  }) async {
    if (!isInitialized) {
      return card.flavorText;
    }

    final prompt = MythosPrompt.buildPrompt(
      card: card,
      gameState: gameState,
    );

    try {
      return await _generate(
        systemPrompt: 'You are a creative writer for the board game Eldritch Horror. Write atmospheric, cosmic horror content.',
        userPrompt: prompt,
      );
    } catch (e) {
      print('Error generating mythos text: $e');
      return card.flavorText;
    }
  }

  /// Stream mythos generation for real-time display
  Stream<String> streamMythosText({
    required MythosCard card,
    required GameState gameState,
  }) async* {
    if (!isInitialized) {
      yield card.flavorText;
      return;
    }

    final prompt = MythosPrompt.buildPrompt(
      card: card,
      gameState: gameState,
    );

    try {
      await for (final token in _streamGenerate(
        systemPrompt: 'You are a creative writer for the board game Eldritch Horror. Write atmospheric, cosmic horror content.',
        userPrompt: prompt,
      )) {
        yield token;
      }
    } catch (e) {
      print('Error streaming mythos: $e');
      yield card.flavorText;
    }
  }

  /// Check if the service is ready for generation
  Future<bool> isReady() async {
    return isInitialized;
  }
}
