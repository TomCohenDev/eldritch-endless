import 'package:flutter/material.dart';
import '../theme/eldritch_theme.dart';
import '../services/storage_service.dart';
import '../services/ai_service.dart';
import '../services/gemma_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final StorageService _storageService = StorageService();
  final GemmaService _gemmaService = GemmaService.instance;
  final TextEditingController _anthropicKeyController = TextEditingController();
  final TextEditingController _elevenLabsKeyController = TextEditingController();

  bool _isLoading = true;
  bool _isSaving = false;
  bool _obscureAnthropic = true;
  bool _obscureElevenLabs = true;
  bool? _anthropicKeyValid;
  String? _anthropicKeyError;

  // Gemma model state
  bool _isModelDownloaded = false;
  bool _isModelInstalled = false;
  bool _isModelLoaded = false;
  bool _isDownloading = false;
  bool _isInstalling = false;
  double _downloadProgress = 0.0;
  String? _gemmaError;

  @override
  void initState() {
    super.initState();
    _loadSettings();
    _checkGemmaStatus();
  }

  @override
  void dispose() {
    _anthropicKeyController.dispose();
    _elevenLabsKeyController.dispose();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    final anthropicKey = await _storageService.getAnthropicApiKey();
    final elevenLabsKey = await _storageService.getElevenLabsApiKey();

    setState(() {
      _anthropicKeyController.text = anthropicKey ?? '';
      _elevenLabsKeyController.text = elevenLabsKey ?? '';
      _isLoading = false;
    });
  }

  Future<void> _checkGemmaStatus() async {
    final downloaded = await _gemmaService.isModelDownloaded();
    final ready = await _gemmaService.isModelReady();

    setState(() {
      _isModelDownloaded = downloaded;
      _isModelInstalled = _gemmaService.isModelInstalled;
      _isModelLoaded = ready;
    });
  }

  Future<void> _downloadGemmaModel() async {
    setState(() {
      _isDownloading = true;
      _downloadProgress = 0.0;
      _gemmaError = null;
    });

    try {
      await _gemmaService.downloadModel(
        onProgress: (progress) {
          setState(() {
            _downloadProgress = progress;
          });
        },
      );

      setState(() {
        _isModelDownloaded = true;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Model downloaded successfully!'),
            backgroundColor: EldritchColors.occultGreen,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _gemmaError = 'Download failed: $e';
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Download failed: $e'),
            backgroundColor: EldritchColors.bloodSeal,
          ),
        );
      }
    } finally {
      setState(() {
        _isDownloading = false;
      });
    }
  }

  Future<void> _installAndLoadModel() async {
    setState(() {
      _isInstalling = true;
      _gemmaError = null;
    });

    try {
      await _gemmaService.installModel();
      setState(() {
        _isModelInstalled = true;
      });

      await _gemmaService.loadModel();
      setState(() {
        _isModelLoaded = true;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Model installed and ready!'),
            backgroundColor: EldritchColors.occultGreen,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _gemmaError = 'Installation failed: $e';
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Installation failed: $e'),
            backgroundColor: EldritchColors.bloodSeal,
          ),
        );
      }
    } finally {
      setState(() {
        _isInstalling = false;
      });
    }
  }

  Future<void> _saveSettings() async {
    setState(() {
      _isSaving = true;
      _anthropicKeyError = null;
    });

    try {
      await _storageService.saveAnthropicApiKey(_anthropicKeyController.text.trim());
      await _storageService.saveElevenLabsApiKey(_elevenLabsKeyController.text.trim());

      if (_anthropicKeyController.text.isNotEmpty) {
        final aiService = AIService(apiKey: _anthropicKeyController.text.trim());
        final isValid = await aiService.validateApiKey();
        setState(() {
          _anthropicKeyValid = isValid;
          if (!isValid) {
            _anthropicKeyError = 'Invalid API key. Please check and try again.';
          }
        });
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              _anthropicKeyValid == false
                  ? 'Settings saved, but API key validation failed'
                  : 'Settings saved successfully',
            ),
            backgroundColor: _anthropicKeyValid == false ? EldritchColors.brownShadow : EldritchColors.occultGreen,
          ),
        );
      }
    } catch (e) {
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
                  // Gemma Model Section
                  _buildGemmaModelSection(),
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

  Widget _buildGemmaModelSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: EldritchColors.leatherMid,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _isModelLoaded ? EldritchColors.occultGreen : EldritchColors.occultPurple,
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Icon(
                _isModelLoaded ? Icons.check_circle : Icons.memory,
                color: _isModelLoaded ? EldritchColors.occultGreen : EldritchColors.occultPurple,
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'LOCAL AI MODEL',
                  style: TextStyle(
                    color: EldritchColors.parchmentLight,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 2,
                  ),
                ),
              ),
              _buildStatusBadge(),
            ],
          ),
          const SizedBox(height: 12),

          // Description
          const Text(
            'Gemma 3 1B runs locally on your device for encounter and mythos generation. No API key required.',
            style: TextStyle(
              color: EldritchColors.fadedText,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Model size: ~529 MB',
            style: TextStyle(
              color: EldritchColors.uiNeutral,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 16),

          // Error message
          if (_gemmaError != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: EldritchColors.bloodSeal.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.error_outline, color: EldritchColors.bloodSeal, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _gemmaError!,
                      style: const TextStyle(color: EldritchColors.bloodSeal, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Progress bar during download
          if (_isDownloading) ...[
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Downloading...',
                      style: TextStyle(color: EldritchColors.fadedText, fontSize: 13),
                    ),
                    Text(
                      '${(_downloadProgress * 100).toStringAsFixed(1)}%',
                      style: const TextStyle(
                        color: EldritchColors.occultPurple,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: _downloadProgress,
                    backgroundColor: EldritchColors.leatherDark,
                    valueColor: const AlwaysStoppedAnimation<Color>(EldritchColors.occultPurple),
                    minHeight: 8,
                  ),
                ),
              ],
            ),
          ] else if (_isInstalling) ...[
            const Row(
              children: [
                SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(EldritchColors.occultPurple),
                  ),
                ),
                SizedBox(width: 12),
                Text(
                  'Installing model...',
                  style: TextStyle(color: EldritchColors.fadedText, fontSize: 13),
                ),
              ],
            ),
          ] else ...[
            // Action buttons
            _buildActionButton(),
          ],
        ],
      ),
    );
  }

  Widget _buildStatusBadge() {
    String text;
    Color color;

    if (_isModelLoaded) {
      text = 'READY';
      color = EldritchColors.occultGreen;
    } else if (_isModelInstalled) {
      text = 'INSTALLED';
      color = EldritchColors.inkBlue;
    } else if (_isModelDownloaded) {
      text = 'DOWNLOADED';
      color = EldritchColors.brownShadow;
    } else {
      text = 'NOT INSTALLED';
      color = EldritchColors.uiNeutral;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.bold,
          letterSpacing: 1,
        ),
      ),
    );
  }

  Widget _buildActionButton() {
    if (_isModelLoaded) {
      return SizedBox(
        width: double.infinity,
        child: OutlinedButton.icon(
          onPressed: null,
          icon: const Icon(Icons.check),
          label: const Text('Model Ready'),
          style: OutlinedButton.styleFrom(
            foregroundColor: EldritchColors.occultGreen,
            side: const BorderSide(color: EldritchColors.occultGreen),
          ),
        ),
      );
    }

    if (_isModelDownloaded && !_isModelInstalled) {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: _installAndLoadModel,
          icon: const Icon(Icons.install_mobile),
          label: const Text('INSTALL MODEL'),
          style: ElevatedButton.styleFrom(
            backgroundColor: EldritchColors.inkBlue,
            foregroundColor: EldritchColors.highlightPaper,
          ),
        ),
      );
    }

    if (_isModelInstalled && !_isModelLoaded) {
      return SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: () async {
            setState(() => _isInstalling = true);
            try {
              await _gemmaService.loadModel();
              setState(() => _isModelLoaded = true);
            } catch (e) {
              setState(() => _gemmaError = 'Load failed: $e');
            } finally {
              setState(() => _isInstalling = false);
            }
          },
          icon: const Icon(Icons.play_arrow),
          label: const Text('LOAD MODEL'),
          style: ElevatedButton.styleFrom(
            backgroundColor: EldritchColors.occultGreen,
            foregroundColor: EldritchColors.highlightPaper,
          ),
        ),
      );
    }

    // Not downloaded
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: _downloadGemmaModel,
        icon: const Icon(Icons.download),
        label: const Text('DOWNLOAD MODEL (~529 MB)'),
        style: ElevatedButton.styleFrom(
          backgroundColor: EldritchColors.occultPurple,
          foregroundColor: EldritchColors.highlightPaper,
        ),
      ),
    );
  }
}
