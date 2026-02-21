import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:just_audio/just_audio.dart';

class ElevenLabsService {
  final String apiKey;
  final AudioPlayer _audioPlayer = AudioPlayer();

  // Default voice ID - can be overridden
  static const String defaultVoiceId = 'JBFqnCBsd6RMkjVDRZzb';

  ElevenLabsService({required this.apiKey});

  /// Generate speech from text using ElevenLabs v3 model
  /// Returns the path to the generated audio file
  Future<String> generateSpeech({
    required String text,
    required String voiceId,
    String modelId = 'eleven_v3',
    String outputFormat = 'mp3_44100_128',
  }) async {
    print('[ElevenLabs] ====== SPEECH GENERATION START ======');
    print('[ElevenLabs] Voice ID: $voiceId');
    print('[ElevenLabs] Model: $modelId');
    print('[ElevenLabs] Text length: ${text.length} chars');
    print('[ElevenLabs] ---- TEXT WITH AUDIO TAGS ----');
    print(text);
    print('[ElevenLabs] ---- END TEXT ----');

    final url = 'https://api.elevenlabs.io/v1/text-to-speech/$voiceId';

    print('[ElevenLabs] Sending request to: $url');
    final stopwatch = Stopwatch()..start();

    try {
      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: jsonEncode({
          'text': text,
          'model_id': modelId,
          'output_format': outputFormat,
          'voice_settings': {
            'stability': 0.5,
            'similarity_boost': 0.75,
            'style': 0.5,
            'use_speaker_boost': true,
          },
        }),
      );

      stopwatch.stop();
      print('[ElevenLabs] Response received in ${stopwatch.elapsedMilliseconds}ms');
      print('[ElevenLabs] Response status: ${response.statusCode}');

      if (response.statusCode != 200) {
        print('[ElevenLabs] ERROR: API returned non-200 status');
        print('[ElevenLabs] Response body: ${response.body}');
        throw Exception('Failed to generate speech: ${response.body}');
      }

      // Save audio to temp file
      final dir = await getTemporaryDirectory();
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      final filePath = '${dir.path}/narration_$timestamp.mp3';

      final file = File(filePath);
      await file.writeAsBytes(response.bodyBytes);

      print('[ElevenLabs] Audio saved to: $filePath');
      print('[ElevenLabs] File size: ${response.bodyBytes.length} bytes');
      print('[ElevenLabs] ====== SPEECH GENERATION COMPLETE ======');

      return filePath;
    } catch (e, stackTrace) {
      print('[ElevenLabs] ERROR: $e');
      print('[ElevenLabs] Stack trace: $stackTrace');
      rethrow;
    }
  }

  /// Play audio from a file path
  Future<void> playAudio(String filePath) async {
    print('[ElevenLabs] Playing audio: $filePath');
    try {
      await _audioPlayer.setFilePath(filePath);
      await _audioPlayer.play();
      print('[ElevenLabs] Audio playback started');
    } catch (e) {
      print('[ElevenLabs] ERROR playing audio: $e');
      rethrow;
    }
  }

  /// Stop audio playback
  Future<void> stopAudio() async {
    print('[ElevenLabs] Stopping audio');
    await _audioPlayer.stop();
  }

  /// Pause audio playback
  Future<void> pauseAudio() async {
    print('[ElevenLabs] Pausing audio');
    await _audioPlayer.pause();
  }

  /// Resume audio playback
  Future<void> resumeAudio() async {
    print('[ElevenLabs] Resuming audio');
    await _audioPlayer.play();
  }

  /// Get current playback state
  bool get isPlaying => _audioPlayer.playing;

  /// Get playback position stream
  Stream<Duration> get positionStream => _audioPlayer.positionStream;

  /// Get duration stream
  Stream<Duration?> get durationStream => _audioPlayer.durationStream;

  /// Get player state stream
  Stream<PlayerState> get playerStateStream => _audioPlayer.playerStateStream;

  /// Dispose resources
  void dispose() {
    print('[ElevenLabs] Disposing audio player');
    _audioPlayer.dispose();
  }

  /// Strip audio tags from text for display purposes
  /// Keeps the text readable without [tags]
  static String stripAudioTags(String text) {
    // Remove all [tag] patterns
    return text.replaceAll(RegExp(r'\[[\w\s]+\]'), '').trim();
  }

  /// Validate API key by making a test request
  Future<bool> validateApiKey() async {
    print('[ElevenLabs] Validating API key...');
    try {
      final response = await http.get(
        Uri.parse('https://api.elevenlabs.io/v1/user'),
        headers: {
          'xi-api-key': apiKey,
        },
      );
      print('[ElevenLabs] Validation response: ${response.statusCode}');
      return response.statusCode == 200;
    } catch (e) {
      print('[ElevenLabs] Validation error: $e');
      return false;
    }
  }
}
