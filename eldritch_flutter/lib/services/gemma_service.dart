import 'dart:io';
import 'package:flutter_gemma/flutter_gemma.dart';
import 'package:path_provider/path_provider.dart';
import 'package:http/http.dart' as http;
import '../models/encounter.dart';
import '../models/game_state.dart';
import '../models/mythos_card.dart';
import '../prompts/encounter_prompt.dart';
import '../prompts/mythos_prompt.dart';

class GeneratedEncounterResult {
  final String generatedText;
  final String selectedTemplate; // 'A' or 'B'

  const GeneratedEncounterResult({
    required this.generatedText,
    required this.selectedTemplate,
  });
}

class GemmaService {
  static GemmaService? _instance;
  static const String modelUrl =
      'https://github.com/TomCohenDev/locket_ai_models/releases/download/v1.0/gemma3-1b-it-int4.task';
  static const String modelFileName = 'gemma3-1b-it-int4.task';

  bool _isInitialized = false;
  bool _isModelInstalled = false;
  bool _isDownloading = false;
  double _downloadProgress = 0.0;
  InferenceModel? _model;
  static const bool _logGeneratedTokens = true;

  GemmaService._();

  static GemmaService get instance {
    _instance ??= GemmaService._();
    return _instance!;
  }

  bool get isInitialized => _isInitialized;
  bool get isModelInstalled => _isModelInstalled;
  bool get isDownloading => _isDownloading;
  double get downloadProgress => _downloadProgress;

  /// Initialize FlutterGemma - must be called once at app startup
  static Future<void> initializePlugin() async {
    await FlutterGemma.initialize();
  }

  /// Get the model file path
  Future<String> get _modelPath async {
    final dir = await getApplicationDocumentsDirectory();
    return '${dir.path}/$modelFileName';
  }

  /// Check if model file exists
  Future<bool> isModelDownloaded() async {
    final path = await _modelPath;
    return File(path).existsSync();
  }

  /// Download the Gemma model with progress callback
  Future<void> downloadModel({
    void Function(double progress)? onProgress,
  }) async {
    if (_isDownloading) return;

    _isDownloading = true;
    _downloadProgress = 0.0;

    try {
      final path = await _modelPath;
      final file = File(path);

      // Create HTTP client for download
      final request = http.Request('GET', Uri.parse(modelUrl));
      final response = await http.Client().send(request);

      final totalBytes = response.contentLength ?? 0;
      int receivedBytes = 0;

      final sink = file.openWrite();

      await for (final chunk in response.stream) {
        sink.add(chunk);
        receivedBytes += chunk.length;

        if (totalBytes > 0) {
          _downloadProgress = receivedBytes / totalBytes;
          onProgress?.call(_downloadProgress);
        }
      }

      await sink.close();
      _downloadProgress = 1.0;
      onProgress?.call(1.0);

      print('Model downloaded to: $path');
    } catch (e) {
      print('Error downloading model: $e');
      rethrow;
    } finally {
      _isDownloading = false;
    }
  }

  /// Install the downloaded model
  Future<void> installModel() async {
    final path = await _modelPath;

    if (!File(path).existsSync()) {
      throw Exception('Model file not found. Please download first.');
    }

    try {
      await FlutterGemma.installModel(
        modelType: ModelType.gemmaIt,
        fileType: ModelFileType.task,
      ).fromFile(path).install();

      _isModelInstalled = true;
      print('Model installed successfully');
    } catch (e) {
      print('Error installing model: $e');
      rethrow;
    }
  }

  /// Load the model for inference
  Future<void> loadModel() async {
    if (_model != null) return;

    try {
      // Try GPU first
      _model = await FlutterGemma.getActiveModel(
        maxTokens: 10240,
        preferredBackend: PreferredBackend.gpu,
      );
      _isInitialized = true;
      print('Model loaded with GPU backend');
    } catch (e) {
      print('GPU load failed, trying CPU: $e');
      try {
        // Fall back to CPU
        _model = await FlutterGemma.getActiveModel(
          maxTokens: 10240,
          preferredBackend: PreferredBackend.cpu,
        );
        _isInitialized = true;
        print('Model loaded with CPU backend');
      } catch (e2) {
        print('Failed to load model: $e2');
        _isInitialized = false;
        rethrow;
      }
    }
  }

  /// Full initialization: check/download/install/load
  Future<void> initialize({
    void Function(double progress)? onProgress,
  }) async {
    // Check if already downloaded
    final downloaded = await isModelDownloaded();

    if (!downloaded) {
      print('Model not downloaded yet');
      return; // User needs to download manually via UI
    }

    // Install if needed
    if (!_isModelInstalled) {
      await installModel();
    }

    // Load the model
    await loadModel();
  }

  /// Generate text using the model
  Future<String> _generate(String prompt) async {
    if (_model == null || !_isInitialized) {
      throw Exception('Model not loaded');
    }

    try {
      final stopwatch = Stopwatch()..start();
      final chat = await _model!.createChat();

      await chat.addQueryChunk(Message.text(
        text: prompt,
        isUser: true,
      ));

      final buffer = StringBuffer();
      var tokenCount = 0;
      var firstTokenLogged = false;
      print('[Gemma] Prompt length: ${prompt.length} chars');
      await for (final response in chat.generateChatResponseAsync()) {
        if (response is TextResponse) {
          tokenCount += 1;
          if (!firstTokenLogged) {
            firstTokenLogged = true;
            print('[Gemma] First token at ${stopwatch.elapsedMilliseconds}ms');
          }
          if (_logGeneratedTokens) {
            final token = response.token.replaceAll('\n', r'\n');
            print('[Gemma][token $tokenCount] $token');
          }
          buffer.write(response.token);
        }
      }
      stopwatch.stop();
      print(
          '[Gemma] Generation complete in ${stopwatch.elapsedMilliseconds}ms, tokens: $tokenCount');

      return buffer.toString();
    } catch (e) {
      print('Error generating text: $e');
      rethrow;
    }
  }

  /// Generate encounter text using local Gemma model
  Future<GeneratedEncounterResult> generateEncounter({
    required Encounter encounterA,
    required Encounter encounterB,
    required GameState gameState,
    required EncounterType requestedType,
    required String requestedSubType,
  }) async {
    if (!_isInitialized) {
      throw Exception('Local AI model is not initialized.');
    }

    final prompt = EncounterPrompt.buildPrompt(
      encounterA: encounterA,
      encounterB: encounterB,
      gameState: gameState,
      requestedType: requestedType,
      requestedSubType: requestedSubType,
    );

    try {
      final response = await _generate(prompt);
      return _parseEncounterResponse(response: response);
    } catch (e) {
      throw Exception('Encounter generation failed: $e');
    }
  }

  /// Generate mythos flavor text using local Gemma model
  Future<String> generateMythosText({
    required MythosCard card,
    required GameState gameState,
  }) async {
    if (!_isInitialized) {
      return card.flavorText;
    }

    final prompt = MythosPrompt.buildPrompt(
      card: card,
      gameState: gameState,
    );

    try {
      return await _generate(prompt);
    } catch (e) {
      print('Error generating mythos text: $e');
      return card.flavorText;
    }
  }

  /// Stream encounter generation for real-time display
  Stream<String> streamEncounter({
    required Encounter encounterA,
    required Encounter encounterB,
    required GameState gameState,
    required EncounterType requestedType,
    required String requestedSubType,
  }) async* {
    if (!_isInitialized || _model == null) {
      yield encounterA.rawText;
      return;
    }

    final prompt = EncounterPrompt.buildPrompt(
      encounterA: encounterA,
      encounterB: encounterB,
      gameState: gameState,
      requestedType: requestedType,
      requestedSubType: requestedSubType,
    );

    try {
      final chat = await _model!.createChat();

      await chat.addQueryChunk(Message.text(
        text: prompt,
        isUser: true,
      ));

      await for (final response in chat.generateChatResponseAsync()) {
        if (response is TextResponse) {
          yield response.token;
        }
      }
    } catch (e) {
      print('Error streaming encounter: $e');
      yield encounterA.rawText;
    }
  }

  /// Stream mythos generation for real-time display
  Stream<String> streamMythosText({
    required MythosCard card,
    required GameState gameState,
  }) async* {
    if (!_isInitialized || _model == null) {
      yield card.flavorText;
      return;
    }

    final prompt = MythosPrompt.buildPrompt(
      card: card,
      gameState: gameState,
    );

    try {
      final chat = await _model!.createChat();

      await chat.addQueryChunk(Message.text(
        text: prompt,
        isUser: true,
      ));

      await for (final response in chat.generateChatResponseAsync()) {
        if (response is TextResponse) {
          yield response.token;
        }
      }
    } catch (e) {
      print('Error streaming mythos: $e');
      yield card.flavorText;
    }
  }

  /// Check if the model is ready for inference
  Future<bool> isModelReady() async {
    return _isInitialized && _model != null;
  }

  /// Dispose of the model
  void dispose() {
    _model = null;
    _isInitialized = false;
  }

  GeneratedEncounterResult _parseEncounterResponse({
    required String response,
  }) {
    final selectedMatch = RegExp(
      r'SELECTED_TEMPLATE\s*:\s*([AB])',
      caseSensitive: false,
    ).firstMatch(response);

    final selectedTemplate = selectedMatch?.group(1)?.toUpperCase() ?? 'A';

    final retoldMatch = RegExp(
      r'RETOLD_ENCOUNTER\s*:\s*([\s\S]*)',
      caseSensitive: false,
    ).firstMatch(response);

    final retoldText = retoldMatch?.group(1)?.trim() ?? response.trim();
    if (retoldText.isEmpty) {
      throw const FormatException('Model returned empty encounter text.');
    }

    return GeneratedEncounterResult(
      generatedText: retoldText,
      selectedTemplate: selectedTemplate == 'B' ? 'B' : 'A',
    );
  }
}
