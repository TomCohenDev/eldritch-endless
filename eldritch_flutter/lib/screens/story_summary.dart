import 'package:flutter/material.dart';
import '../models/ancient_one.dart';
import '../models/investigator.dart';
import '../models/game_state.dart';
import '../theme/eldritch_theme.dart';
import '../services/storage_service.dart';
import '../services/ai_service.dart';
import 'story_reveal.dart';
import 'settings_screen.dart';

class StorySummary extends StatefulWidget {
  final AncientOne selectedAncientOne;
  final List<Investigator> selectedInvestigators;
  final NarratorVoice selectedVoice;

  const StorySummary({
    super.key,
    required this.selectedAncientOne,
    required this.selectedInvestigators,
    required this.selectedVoice,
  });

  @override
  State<StorySummary> createState() => _StorySummaryState();
}

class _StorySummaryState extends State<StorySummary> {
  final StorageService _storageService = StorageService();
  bool _isGenerating = false;
  bool _hasApiKey = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _checkApiKey();
  }

  Future<void> _checkApiKey() async {
    final key = await _storageService.getAnthropicApiKey();
    setState(() {
      _hasApiKey = key != null && key.isNotEmpty;
    });
  }

  Future<void> _generateStory() async {
    print('[StorySummary] _generateStory called');
    print('[StorySummary] Ancient One: ${widget.selectedAncientOne.name}');
    print(
        '[StorySummary] Investigators: ${widget.selectedInvestigators.map((i) => i.name).join(', ')}');
    print('[StorySummary] Voice: ${widget.selectedVoice.name}');

    final apiKey = await _storageService.getAnthropicApiKey();
    if (apiKey == null || apiKey.isEmpty) {
      print('[StorySummary] ERROR: No API key found');
      setState(() {
        _error = 'Please add your Anthropic API key in Settings first';
      });
      return;
    }
    print('[StorySummary] API key found: ${apiKey.substring(0, 10)}...');

    setState(() {
      _isGenerating = true;
      _error = null;
    });
    print('[StorySummary] Starting story generation...');

    try {
      final aiService = AIService(apiKey: apiKey);
      print('[StorySummary] AIService created, calling generateStory...');

      final storyGeneration = await aiService.generateStory(
        ancientOne: widget.selectedAncientOne,
        investigators: widget.selectedInvestigators,
      );

      print('[StorySummary] Story generation complete!');
      print('[StorySummary] ---- STORY DATA ----');
      print(
          '[StorySummary] Ancient One Hook (${storyGeneration.ancientOneHook.length} chars):');
      print(storyGeneration.ancientOneHook);
      print(
          '[StorySummary] Investigator Stories (${storyGeneration.investigatorStories.length}):');
      for (var story in storyGeneration.investigatorStories) {
        print('[StorySummary]   ${story.name}: ${story.story}');
      }
      print('[StorySummary] Stage Plans:');
      print('[StorySummary]   Stage 1: ${storyGeneration.stagePlans.stage1}');
      print('[StorySummary]   Stage 2: ${storyGeneration.stagePlans.stage2}');
      print('[StorySummary]   Stage 3: ${storyGeneration.stagePlans.stage3}');
      print('[StorySummary] ---- END STORY DATA ----');

      if (mounted) {
        print('[StorySummary] Navigating to StoryReveal screen...');
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => StoryReveal(
              selectedAncientOne: widget.selectedAncientOne,
              selectedInvestigators: widget.selectedInvestigators,
              selectedVoice: widget.selectedVoice,
              storyGeneration: storyGeneration,
            ),
          ),
        );
      }
    } catch (e, stackTrace) {
      print('[StorySummary] ERROR: $e');
      print('[StorySummary] Stack trace: $stackTrace');
      setState(() {
        _error = 'Error generating story: ${e.toString()}';
      });
    } finally {
      setState(() {
        _isGenerating = false;
      });
      print('[StorySummary] Generation process finished');
    }
  }

  void _openSettings() async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const SettingsScreen(),
      ),
    );
    _checkApiKey();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EldritchColors.parchmentWarm,
      appBar: AppBar(
        title: const Text('Game Summary'),
        backgroundColor: EldritchColors.leatherDark,
        foregroundColor: EldritchColors.parchmentLight,
      ),
      body: Stack(
        children: [
          const ParchmentBackground(),
          SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Ancient One section - full width image edge to edge
            SizedBox(
              width: double.infinity,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Ancient One Image - full width, no horizontal padding
                  SizedBox(
                    width: double.infinity,
                    child: AspectRatio(
                      aspectRatio: 16 / 9,
                      child: Image.asset(
                        _getAncientOneImagePath(widget.selectedAncientOne.name),
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            color: EldritchColors.leatherMid,
                            child: Center(
                              child: Icon(
                                Icons.visibility,
                                color: EldritchColors.occultPurple,
                                size: 48,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Expanded(
                              child: Text(
                                widget.selectedAncientOne.name,
                                style: const TextStyle(
                                  color: EldritchColors.deepInk,
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            _InfoChip(
                                label: 'Difficulty',
                                value: widget.selectedAncientOne.difficulty),
                            const SizedBox(width: 8),
                            _InfoChip(
                                label: 'Doom',
                                value: widget.selectedAncientOne.startingDoom
                                    .toString()),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.selectedAncientOne.epithet,
                          style: const TextStyle(
                            color: EldritchColors.nearBlackInk,
                            fontSize: 14,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Investigators section - no card
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'INVESTIGATORS (${widget.selectedInvestigators.length})',
                    style: const TextStyle(
                      color: EldritchColors.nearBlackInk,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...widget.selectedInvestigators.map((inv) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Row(
                        children: [
                          // Investigator Image - zoomed in (larger, BoxFit.cover centers)
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: SizedBox(
                              width: 64,
                              height: 64,
                              child: Image.asset(
                                _getInvestigatorImagePath(inv.name),
                                fit: BoxFit.contain,
                                alignment: Alignment.center,
                                errorBuilder: (context, error, stackTrace) {
                                  return Container(
                                    color: EldritchColors.leatherMid,
                                    child: const Icon(
                                      Icons.person,
                                      color: EldritchColors.occultPurple,
                                    ),
                                  );
                                },
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  inv.name.replaceAll('"', ''),
                                  style: const TextStyle(
                                    color: EldritchColors.deepInk,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  inv.profession,
                                  style: const TextStyle(
                                    color: EldritchColors.nearBlackInk,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  _MiniStatBadge(
                                    iconPath: 'assets/stats/Health_Icon.webp',
                                    value: inv.health,
                                    color: EldritchColors.bloodSeal,
                                  ),
                                  const SizedBox(width: 4),
                                  _MiniStatBadge(
                                    iconPath: 'assets/stats/Sanity_Icon.webp',
                                    value: inv.sanity,
                                    color: EldritchColors.inkBlue,
                                    fallbackIcon: Icons.psychology,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  _SummarySkillItem(iconPath: 'assets/stats/Investigator_Lore.webp', value: inv.skills.lore),
                                  _SummarySkillItem(iconPath: 'assets/stats/Investigator_Influence.webp', value: inv.skills.influence),
                                  _SummarySkillItem(iconPath: 'assets/stats/Investigator_Observation.webp', value: inv.skills.observation),
                                  _SummarySkillItem(iconPath: 'assets/stats/Investigator_Strength.webp', value: inv.skills.strength),
                                  _SummarySkillItem(iconPath: 'assets/stats/Investigator_Will.webp', value: inv.skills.will),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Narrator section - no card
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Row(
                children: [
                  const Icon(
                    Icons.record_voice_over,
                    color: EldritchColors.occultPurple,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'NARRATOR',
                          style: TextStyle(
                            color: EldritchColors.nearBlackInk,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 2,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.selectedVoice.name,
                          style: const TextStyle(
                            color: EldritchColors.deepInk,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          widget.selectedVoice.description,
                          style: const TextStyle(
                            color: EldritchColors.nearBlackInk,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // API Key warning, error, and button - with horizontal padding
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // API Key warning
                  if (!_hasApiKey) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: EldritchColors.brownShadow.withOpacity(0.25),
                        borderRadius: BorderRadius.circular(8),
                        border:
                            Border.all(color: EldritchColors.brownShadow.withOpacity(0.6)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.warning_amber, color: EldritchColors.brownShadow),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'API Key Required',
                                  style: TextStyle(
                                    color: EldritchColors.leatherDark,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const Text(
                                  'Add your Anthropic API key to generate the story',
                                  style: TextStyle(
                                    color: EldritchColors.nearBlackInk,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: _openSettings,
                            child: const Text('Settings'),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Error message
                  if (_error != null) ...[
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: EldritchColors.bloodSeal.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, color: EldritchColors.bloodSeal),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _error!,
                              style: const TextStyle(color: EldritchColors.bloodSeal),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Generate button
                  SizedBox(
                    height: 56,
                    child: ElevatedButton(
                      onPressed:
                          _isGenerating || !_hasApiKey ? null : _generateStory,
                style: ElevatedButton.styleFrom(
                  backgroundColor: EldritchColors.leatherDark,
                  foregroundColor: EldritchColors.highlightPaper,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _isGenerating
                          ? const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: const AlwaysStoppedAnimation<Color>(
                                        EldritchColors.highlightPaper),
                                  ),
                                ),
                                SizedBox(width: 12),
                                Text('GENERATING STORY...'),
                              ],
                            )
                          : const Text(
                              'GENERATE STORY',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 2,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ],
        ),
      ),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final String label;
  final String value;

  const _InfoChip({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: EldritchColors.leatherMid,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '$label: ',
            style: const TextStyle(
              color: EldritchColors.parchmentLight,
              fontSize: 12,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              color: EldritchColors.highlightPaper,
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

class _MiniStatBadge extends StatelessWidget {
  final String iconPath;
  final int value;
  final Color color;
  final IconData fallbackIcon;

  const _MiniStatBadge({
    required this.iconPath,
    required this.value,
    required this.color,
    this.fallbackIcon = Icons.favorite,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: EldritchColors.parchmentGreyed,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Image.asset(
            iconPath,
            width: 14,
            height: 14,
            fit: BoxFit.contain,
            errorBuilder: (_, __, ___) => Icon(fallbackIcon, color: color, size: 12),
          ),
          const SizedBox(width: 2),
          Text(
            value.toString(),
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}

class _SummarySkillItem extends StatelessWidget {
  final String iconPath;
  final int value;

  const _SummarySkillItem({
    required this.iconPath,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 3),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Image.asset(
            iconPath,
            width: 16,
            height: 16,
            fit: BoxFit.contain,
            errorBuilder: (_, __, ___) => SizedBox(
              width: 16,
              height: 16,
              child: Center(
                child: Text(
                  value.toString(),
                  style: const TextStyle(
                    color: EldritchColors.nearBlackInk,
                    fontWeight: FontWeight.w600,
                    fontSize: 10,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 2),
          Text(
            value.toString(),
            style: const TextStyle(
              color: EldritchColors.nearBlackInk,
              fontWeight: FontWeight.w600,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }
}

/// Get the image asset path for an ancient one
String _getAncientOneImagePath(String name) {
  final fileName =
      name.replaceAll(' ', '_').replaceAll("'", '').replaceAll('"', '');
  return 'assets/ancient_ones_images/$fileName.webp';
}

/// Get the image asset path for an investigator
String _getInvestigatorImagePath(String name) {
  String fileName =
      name.replaceAll('"', '').replaceAll(' ', '_').replaceAll("'", '%27');
  return 'assets/investigator_images/$fileName.webp';
}
