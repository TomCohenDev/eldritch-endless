import 'package:flutter/material.dart';
import '../theme/eldritch_theme.dart';
import '../services/storage_service.dart';
import '../services/ai_service.dart';
import '../services/grok_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final StorageService _storageService = StorageService();
  final GrokService _grokService = GrokService.instance;
  final TextEditingController _anthropicKeyController = TextEditingController();
  final TextEditingController _elevenLabsKeyController = TextEditingController();
  final TextEditingController _grokKeyController = TextEditingController();

  bool _isLoading = true;
  bool _isSaving = false;
  bool _isValidatingGrok = false;
  bool _obscureAnthropic = true;
  bool _obscureElevenLabs = true;
  bool _obscureGrok = true;
  bool? _anthropicKeyValid;
  String? _anthropicKeyError;
  bool? _grokKeyValid;
  String? _grokKeyError;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  @override
  void dispose() {
    _anthropicKeyController.dispose();
    _elevenLabsKeyController.dispose();
    _grokKeyController.dispose();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    final anthropicKey = await _storageService.getAnthropicApiKey();
    final elevenLabsKey = await _storageService.getElevenLabsApiKey();
    final grokKey = await _storageService.getGrokApiKey();

    setState(() {
      _anthropicKeyController.text = anthropicKey ?? '';
      _elevenLabsKeyController.text = elevenLabsKey ?? '';
      _grokKeyController.text = grokKey ?? '';
      _isLoading = false;
    });
  }

  Future<void> _saveSettings() async {
    debugPrint('[Settings DEBUG] _saveSettings: starting');
    setState(() {
      _isSaving = true;
      _anthropicKeyError = null;
      _grokKeyError = null;
    });

    try {
      await _storageService.saveAnthropicApiKey(_anthropicKeyController.text.trim());
      await _storageService.saveElevenLabsApiKey(_elevenLabsKeyController.text.trim());
      await _storageService.saveGrokApiKey(_grokKeyController.text.trim());
      debugPrint('[Settings DEBUG] _saveSettings: keys saved to storage');

      // Update GrokService with new key
      _grokService.setApiKey(_grokKeyController.text.trim());

      if (_anthropicKeyController.text.isNotEmpty) {
        debugPrint('[Settings DEBUG] _saveSettings: validating Anthropic key...');
        final aiService = AIService(apiKey: _anthropicKeyController.text.trim());
        final isValid = await aiService.validateApiKey();
        debugPrint('[Settings DEBUG] _saveSettings: Anthropic key valid=$isValid');
        setState(() {
          _anthropicKeyValid = isValid;
          if (!isValid) {
            _anthropicKeyError = 'Invalid API key. Please check and try again.';
          }
        });
      }

      if (_grokKeyController.text.isNotEmpty) {
        debugPrint('[Settings DEBUG] _saveSettings: validating Grok key...');
        setState(() {
          _isValidatingGrok = true;
        });
        final isValid = await _grokService.validateApiKey(_grokKeyController.text.trim());
        debugPrint('[Settings DEBUG] _saveSettings: Grok key valid=$isValid');
        setState(() {
          _isValidatingGrok = false;
          _grokKeyValid = isValid;
          if (!isValid) {
            _grokKeyError = 'Invalid API key. Please check and try again.';
          }
        });
      }

      final hasValidationError = _anthropicKeyValid == false || _grokKeyValid == false;
      debugPrint('[Settings DEBUG] _saveSettings: hasValidationError=$hasValidationError');

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              hasValidationError
                  ? 'Settings saved, but some API key validation failed'
                  : 'Settings saved successfully',
            ),
            backgroundColor: hasValidationError ? EldritchColors.brownShadow : EldritchColors.occultGreen,
          ),
        );
      }
    } catch (e) {
      debugPrint('[Settings DEBUG] _saveSettings: error=$e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error saving settings: $e'),
            backgroundColor: EldritchColors.bloodSeal,
          ),
        );
      }
    } finally {
      setState(() {
        _isSaving = false;
        _isValidatingGrok = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EldritchColors.parchmentWarm,
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: EldritchColors.leatherDark,
        foregroundColor: EldritchColors.parchmentLight,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Grok API Key Section
                  const Text(
                    'GROK API KEY',
                    style: TextStyle(
                      color: EldritchColors.fadedText,
                      fontSize: 12,
                      letterSpacing: 2,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Required for encounter and mythos generation. Get your key at console.x.ai',
                    style: TextStyle(
                      color: EldritchColors.uiNeutral,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _grokKeyController,
                    obscureText: _obscureGrok,
                    style: const TextStyle(color: EldritchColors.deepInk),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: EldritchColors.highlightPaper,
                      hintText: 'xai-...',
                      hintStyle: const TextStyle(color: EldritchColors.fadedText),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: EldritchColors.parchmentGreyed, width: 1),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: EldritchColors.parchmentGreyed, width: 1),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: EldritchColors.occultPurple, width: 1.5),
                      ),
                      suffixIcon: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_isValidatingGrok)
                            const Padding(
                              padding: EdgeInsets.all(12),
                              child: SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(EldritchColors.occultPurple),
                                ),
                              ),
                            )
                          else if (_grokKeyValid != null)
                            Padding(
                              padding: const EdgeInsets.all(12),
                              child: Icon(
                                _grokKeyValid! ? Icons.check_circle : Icons.error,
                                color: _grokKeyValid! ? EldritchColors.occultGreen : EldritchColors.bloodSeal,
                              ),
                            ),
                          IconButton(
                            icon: Icon(
                              _obscureGrok ? Icons.visibility_off : Icons.visibility,
                              color: EldritchColors.fadedText,
                            ),
                            onPressed: () {
                              setState(() {
                                _obscureGrok = !_obscureGrok;
                              });
                            },
                          ),
                        ],
                      ),
                      errorText: _grokKeyError,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Anthropic API Key Section
                  const Text(
                    'ANTHROPIC API KEY',
                    style: TextStyle(
                      color: EldritchColors.fadedText,
                      fontSize: 12,
                      letterSpacing: 2,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Required for story generation. Get your key at console.anthropic.com',
                    style: TextStyle(
                      color: EldritchColors.uiNeutral,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _anthropicKeyController,
                    obscureText: _obscureAnthropic,
                    style: const TextStyle(color: EldritchColors.deepInk),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: EldritchColors.highlightPaper,
                      hintText: 'sk-ant-...',
                      hintStyle: const TextStyle(color: EldritchColors.fadedText),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: EldritchColors.parchmentGreyed, width: 1),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: EldritchColors.parchmentGreyed, width: 1),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: EldritchColors.occultPurple, width: 1.5),
                      ),
                      suffixIcon: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (_anthropicKeyValid != null)
                            Icon(
                              _anthropicKeyValid! ? Icons.check_circle : Icons.error,
                              color: _anthropicKeyValid! ? EldritchColors.occultGreen : EldritchColors.bloodSeal,
                            ),
                          IconButton(
                            icon: Icon(
                              _obscureAnthropic ? Icons.visibility_off : Icons.visibility,
                              color: EldritchColors.fadedText,
                            ),
                            onPressed: () {
                              setState(() {
                                _obscureAnthropic = !_obscureAnthropic;
                              });
                            },
                          ),
                        ],
                      ),
                      errorText: _anthropicKeyError,
                    ),
                  ),
                  const SizedBox(height: 32),

                  // ElevenLabs API Key Section
                  const Text(
                    'ELEVENLABS API KEY (OPTIONAL)',
                    style: TextStyle(
                      color: EldritchColors.fadedText,
                      fontSize: 12,
                      letterSpacing: 2,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Optional for voice narration. Get your key at elevenlabs.io',
                    style: TextStyle(
                      color: EldritchColors.uiNeutral,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _elevenLabsKeyController,
                    obscureText: _obscureElevenLabs,
                    style: const TextStyle(color: EldritchColors.deepInk),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: EldritchColors.highlightPaper,
                      hintText: 'Enter your ElevenLabs API key',
                      hintStyle: const TextStyle(color: EldritchColors.fadedText),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: EldritchColors.parchmentGreyed, width: 1),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: EldritchColors.parchmentGreyed, width: 1),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: EldritchColors.occultPurple, width: 1.5),
                      ),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscureElevenLabs ? Icons.visibility_off : Icons.visibility,
                          color: EldritchColors.fadedText,
                        ),
                        onPressed: () {
                          setState(() {
                            _obscureElevenLabs = !_obscureElevenLabs;
                          });
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 48),

                  // Save Button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _isSaving ? null : _saveSettings,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: EldritchColors.occultPurple,
                        foregroundColor: EldritchColors.highlightPaper,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      child: _isSaving
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(EldritchColors.highlightPaper),
                              ),
                            )
                          : const Text(
                              'SAVE API KEYS',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                letterSpacing: 2,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
