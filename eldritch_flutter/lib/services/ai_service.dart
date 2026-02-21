import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/game_state.dart';
import '../models/ancient_one.dart';
import '../models/investigator.dart';
import '../prompts/plot_prompt.dart';
import '../prompts/ending_prompt.dart';

class AIService {
  final String? apiKey;

  AIService({this.apiKey});

  /// Generate the story/plot using Anthropic Claude API
  Future<StoryGeneration> generateStory({
    required AncientOne ancientOne,
    required List<Investigator> investigators,
  }) async {
    print('====== AI SERVICE: STORY GENERATION START ======');
    print('[AI] Ancient One: ${ancientOne.name}');
    print('[AI] Investigators: ${investigators.map((i) => i.name).join(', ')}');

    if (apiKey == null || apiKey!.isEmpty) {
      print('[AI] ERROR: No API key provided');
      throw Exception('Anthropic API key is required for story generation');
    }
    print('[AI] API Key present: ${apiKey!.substring(0, 10)}...');

    final prompt = PlotPrompt.buildPrompt(
      ancientOne: ancientOne,
      investigators: investigators,
    );

    print('[AI] Prompt length: ${prompt.length} characters');
    print('[AI] ---- PROMPT START ----');
    print(prompt);
    print('[AI] ---- PROMPT END ----');

    print('[AI] Sending request to Anthropic API...');
    final stopwatch = Stopwatch()..start();

    try {
      final response = await http.post(
        Uri.parse('https://api.anthropic.com/v1/messages'),
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey!,
          'anthropic-version': '2023-06-01',
        },
        body: jsonEncode({
          'model': 'claude-sonnet-4-20250514',
          'max_tokens': 4096,
          'messages': [
            {
              'role': 'user',
              'content': prompt,
            }
          ],
        }),
      );

      stopwatch.stop();
      print('[AI] Response received in ${stopwatch.elapsedMilliseconds}ms');
      print('[AI] Response status code: ${response.statusCode}');

      if (response.statusCode != 200) {
        print('[AI] ERROR: API returned non-200 status');
        print('[AI] Response body: ${response.body}');
        throw Exception('Failed to generate story: ${response.body}');
      }

      print('[AI] ---- RAW RESPONSE START ----');
      print(response.body);
      print('[AI] ---- RAW RESPONSE END ----');

      final responseData = jsonDecode(response.body);
      print('[AI] Response parsed as JSON successfully');

      final content = responseData['content'][0]['text'] as String;
      print('[AI] Extracted content text (${content.length} chars)');
      print('[AI] ---- CONTENT TEXT START ----');
      print(content);
      print('[AI] ---- CONTENT TEXT END ----');

      // Parse the JSON response from Claude
      final storyGeneration = _parseStoryResponse(content);
      print('[AI] Story generation parsed successfully');
      print(
          '[AI] - Ancient One Hook (display): ${storyGeneration.ancientOneHook.length} chars');
      print(
          '[AI] - Ancient One Hook (narration): ${storyGeneration.ancientOneHookNarration.length} chars');
      print(
          '[AI] - Investigator Stories: ${storyGeneration.investigatorStories.length} stories');
      for (var story in storyGeneration.investigatorStories) {
        print('[AI]   - ${story.name}:');
        print('[AI]       Display: ${story.story.length} chars');
        print('[AI]       Narration: ${story.storyNarration.length} chars');
      }
      print(
          '[AI] - Stage 1: ${storyGeneration.stagePlans.stage1.length} chars');
      print(
          '[AI] - Stage 2: ${storyGeneration.stagePlans.stage2.length} chars');
      print(
          '[AI] - Stage 3: ${storyGeneration.stagePlans.stage3.length} chars');
      print('[AI]');
      print('[AI] ---- FULL NARRATION SCRIPT ----');
      print(storyGeneration.fullNarrationScript);
      print('[AI] ---- END NARRATION SCRIPT ----');
      print('====== AI SERVICE: STORY GENERATION COMPLETE ======');

      return storyGeneration;
    } catch (e, stackTrace) {
      print('[AI] ERROR during generation: $e');
      print('[AI] Stack trace: $stackTrace');
      rethrow;
    }
  }

  StoryGeneration _parseStoryResponse(String response) {
    print('[AI] _parseStoryResponse: Starting JSON extraction...');

    String jsonStr = response;

    // Look for JSON block in markdown code fences
    print('[AI] Looking for ```json code block...');
    final jsonMatch =
        RegExp(r'```json\s*([\s\S]*?)\s*```').firstMatch(response);
    if (jsonMatch != null) {
      jsonStr = jsonMatch.group(1)!;
      print('[AI] Found JSON in code fence, extracted ${jsonStr.length} chars');
    } else {
      print('[AI] No ```json block found, looking for raw JSON object...');
      // Try to find raw JSON object
      final objectMatch = RegExp(r'\{[\s\S]*\}').firstMatch(response);
      if (objectMatch != null) {
        jsonStr = objectMatch.group(0)!;
        print('[AI] Found raw JSON object, extracted ${jsonStr.length} chars');
      } else {
        print('[AI] WARNING: No JSON object found in response!');
      }
    }

    print('[AI] ---- EXTRACTED JSON START ----');
    print(jsonStr);
    print('[AI] ---- EXTRACTED JSON END ----');

    try {
      print('[AI] Attempting to parse JSON...');
      final json = jsonDecode(jsonStr) as Map<String, dynamic>;
      print('[AI] JSON parsed successfully');
      print('[AI] Keys found: ${json.keys.join(', ')}');

      // Validate expected keys
      if (!json.containsKey('ancientOneHook')) {
        print('[AI] WARNING: Missing ancientOneHook key');
      }
      if (!json.containsKey('investigatorStories')) {
        print('[AI] WARNING: Missing investigatorStories key');
      }
      if (!json.containsKey('stagePlans')) {
        print('[AI] WARNING: Missing stagePlans key');
      }

      final result = StoryGeneration.fromJson(json);
      print('[AI] StoryGeneration object created successfully');
      return result;
    } catch (e) {
      print('[AI] ERROR: JSON parsing failed: $e');
      print('[AI] Creating fallback StoryGeneration from raw text');

      // If parsing fails, create a default response from the raw text
      return StoryGeneration(
        ancientOneHook: response,
        investigatorStories: [],
        stagePlans: StagePlans(
          stage1: 'Early investigation phase',
          stage2: 'Growing darkness',
          stage3: 'Final confrontation',
        ),
      );
    }
  }

  /// Generate the ending story for the game
  Future<EndingGeneration> generateEnding({
    required GameState gameState,
    required bool isVictory,
    required String playerNotes,
  }) async {
    print('====== AI SERVICE: ENDING GENERATION START ======');
    print('[AI] Outcome: ${isVictory ? "VICTORY" : "DEFEAT"}');
    print('[AI] Player notes: $playerNotes');

    if (apiKey == null || apiKey!.isEmpty) {
      throw Exception('Anthropic API key is required for ending generation');
    }

    final prompt = EndingPrompt.buildPrompt(
      gameState: gameState,
      isVictory: isVictory,
      playerNotes: playerNotes,
    );

    print('[AI] Prompt length: ${prompt.length} characters');

    final stopwatch = Stopwatch()..start();

    try {
      final response = await http.post(
        Uri.parse('https://api.anthropic.com/v1/messages'),
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey!,
          'anthropic-version': '2023-06-01',
        },
        body: jsonEncode({
          'model': 'claude-sonnet-4-20250514',
          'max_tokens': 4096,
          'messages': [
            {
              'role': 'user',
              'content': prompt,
            }
          ],
        }),
      );

      stopwatch.stop();
      print(
          '[AI] Ending response received in ${stopwatch.elapsedMilliseconds}ms');

      if (response.statusCode != 200) {
        throw Exception('Failed to generate ending: ${response.body}');
      }

      final responseData = jsonDecode(response.body);
      final content = responseData['content'][0]['text'] as String;

      final endingGeneration = _parseEndingResponse(content);
      print('[AI] Ending generation parsed successfully');
      print('====== AI SERVICE: ENDING GENERATION COMPLETE ======');

      return endingGeneration;
    } catch (e, stackTrace) {
      print('[AI] ERROR during ending generation: $e');
      print('[AI] Stack trace: $stackTrace');
      rethrow;
    }
  }

  EndingGeneration _parseEndingResponse(String response) {
    String jsonStr = response;

    final jsonMatch =
        RegExp(r'```json\s*([\s\S]*?)\s*```').firstMatch(response);
    if (jsonMatch != null) {
      jsonStr = jsonMatch.group(1)!;
    } else {
      final objectMatch = RegExp(r'\{[\s\S]*\}').firstMatch(response);
      if (objectMatch != null) {
        jsonStr = objectMatch.group(0)!;
      }
    }

    try {
      final json = jsonDecode(jsonStr) as Map<String, dynamic>;
      return EndingGeneration.fromJson(json);
    } catch (e) {
      print('[AI] ERROR: Ending JSON parsing failed: $e');
      return EndingGeneration(
        ending: response,
        endingNarration: response,
      );
    }
  }

  /// Check if the API key is valid by making a simple request
  Future<bool> validateApiKey() async {
    print('[AI] validateApiKey: Checking API key validity...');

    if (apiKey == null || apiKey!.isEmpty) {
      print('[AI] validateApiKey: No API key provided');
      return false;
    }

    try {
      print('[AI] validateApiKey: Sending test request...');
      final response = await http.post(
        Uri.parse('https://api.anthropic.com/v1/messages'),
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey!,
          'anthropic-version': '2023-06-01',
        },
        body: jsonEncode({
          'model': 'claude-sonnet-4-20250514',
          'max_tokens': 10,
          'messages': [
            {
              'role': 'user',
              'content': 'Hello',
            }
          ],
        }),
      );

      print('[AI] validateApiKey: Response status: ${response.statusCode}');
      return response.statusCode == 200;
    } catch (e) {
      print('[AI] validateApiKey: Error: $e');
      return false;
    }
  }
}
