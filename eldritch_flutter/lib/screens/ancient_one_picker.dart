import 'package:flutter/material.dart';
import '../theme/eldritch_theme.dart';
import '../services/data_loader.dart';
import '../models/ancient_one.dart';
import 'investigator_picker.dart';

class AncientOnePicker extends StatefulWidget {
  const AncientOnePicker({super.key});

  @override
  State<AncientOnePicker> createState() => _AncientOnePickerState();
}

class _AncientOnePickerState extends State<AncientOnePicker> {
  final DataLoader _dataLoader = DataLoader();
  List<AncientOne> _ancientOnes = [];
  AncientOne? _selectedAncientOne;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAncientOnes();
  }

  Future<void> _loadAncientOnes() async {
    final ancientOnes = await _dataLoader.loadAncientOnes();
    setState(() {
      _ancientOnes = ancientOnes;
      _isLoading = false;
    });
  }

  void _selectAncientOne(AncientOne ancientOne) {
    setState(() {
      _selectedAncientOne = ancientOne;
    });
  }

  void _proceedToNextStep() {
    if (_selectedAncientOne == null) return;

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => InvestigatorPicker(
          selectedAncientOne: _selectedAncientOne!,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EldritchColors.parchmentWarm,
      appBar: AppBar(
        title: const Text('Choose Your Nemesis'),
        backgroundColor: EldritchColors.leatherDark,
        foregroundColor: EldritchColors.parchmentLight,
      ),
      body: Stack(
        children: [
          const ParchmentBackground(),
          _isLoading
              ? const Center(child: CircularProgressIndicator())
              : Column(
              children: [
                // Step indicator
                Container(
                  padding: const EdgeInsets.all(16),
                  color: EldritchColors.leatherDark,
                  child: const Row(
                    children: [
                      _StepIndicator(step: 1, label: 'Ancient One', isActive: true),
                      Expanded(child: Divider(color: EldritchColors.parchmentGreyed)),
                      _StepIndicator(step: 2, label: 'Investigators', isActive: false),
                      Expanded(child: Divider(color: EldritchColors.parchmentGreyed)),
                      _StepIndicator(step: 3, label: 'Voice', isActive: false),
                      Expanded(child: Divider(color: EldritchColors.parchmentGreyed)),
                      _StepIndicator(step: 4, label: 'Summary', isActive: false),
                    ],
                  ),
                ),

                // Ancient One grid
                Expanded(
                  child: GridView.builder(
                    padding: const EdgeInsets.all(16),
                    cacheExtent: 400,
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.75,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    itemCount: _ancientOnes.length,
                    itemBuilder: (context, index) {
                      final ancientOne = _ancientOnes[index];
                      final isSelected = _selectedAncientOne?.name == ancientOne.name;
                      return RepaintBoundary(
                        child: _AncientOneCard(
                          ancientOne: ancientOne,
                          isSelected: isSelected,
                          onTap: () => _selectAncientOne(ancientOne),
                        ),
                      );
                    },
                  ),
                ),

                // Continue button
                if (_selectedAncientOne != null)
                  Container(
                    padding: const EdgeInsets.all(16),
                    child: SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        onPressed: _proceedToNextStep,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: EldritchColors.occultPurple,
                          foregroundColor: EldritchColors.highlightPaper,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                        child: Text(
                          'FACE ${_selectedAncientOne!.name.toUpperCase()}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            letterSpacing: 2,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }
}

class _StepIndicator extends StatelessWidget {
  final int step;
  final String label;
  final bool isActive;

  const _StepIndicator({
    required this.step,
    required this.label,
    required this.isActive,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 24,
          height: 24,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isActive ? EldritchColors.occultPurple : EldritchColors.parchmentGreyed,
          ),
          child: Center(
            child: Text(
              step.toString(),
              style: TextStyle(
                color: isActive ? EldritchColors.parchmentLight : EldritchColors.fadedText,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            color: isActive ? EldritchColors.parchmentLight : EldritchColors.uiNeutral,
            fontSize: 10,
          ),
        ),
      ],
    );
  }
}

class _AncientOneCard extends StatelessWidget {
  final AncientOne ancientOne;
  final bool isSelected;
  final VoidCallback onTap;

  const _AncientOneCard({
    required this.ancientOne,
    required this.isSelected,
    required this.onTap,
  });

  /// Get the image asset path for the ancient one
  String get _imagePath {
    // Convert name to filename format (spaces to underscores, handle special chars)
    final fileName = ancientOne.name
        .replaceAll(' ', '_')
        .replaceAll("'", '')
        .replaceAll('"', '');
    return 'assets/ancient_ones_images/$fileName.webp';
  }

  @override
  Widget build(BuildContext context) {
    final cardPixelWidth =
        (MediaQuery.sizeOf(context).width / 2 * MediaQuery.devicePixelRatioOf(context))
            .round();

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: isSelected
              ? EldritchColors.occultPurple.withValues(alpha: 0.3)
              : EldritchColors.leatherMid,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? EldritchColors.occultPurple : Colors.transparent,
            width: 2,
          ),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(10),
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Ancient One Image
              Image.asset(
                _imagePath,
                fit: BoxFit.cover,
                cacheWidth: cardPixelWidth,
                errorBuilder: (context, error, stackTrace) {
                  // Fallback if image not found
                  return Container(
                    color: EldritchColors.leatherDark,
                    child: const Center(
                      child: Icon(
                        Icons.visibility,
                        color: EldritchColors.occultPurple,
                        size: 48,
                      ),
                    ),
                  );
                },
              ),

              // Gradient overlay for text readability
              Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        Colors.transparent,
                        EldritchColors.deepInk.withValues(alpha: 0.7),
                        EldritchColors.deepInk.withValues(alpha: 0.9),
                      ],
                      stops: const [0.0, 0.4, 0.7, 1.0],
                    ),
                  ),
                ),
              ),

              // Selection overlay
              if (isSelected)
                Positioned.fill(
                  child: Container(
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: EldritchColors.occultPurple,
                        width: 3,
                      ),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Align(
                      alignment: Alignment.topRight,
                      child: Padding(
                        padding: EdgeInsets.all(8.0),
                        child: CircleAvatar(
                          radius: 12,
                          backgroundColor: EldritchColors.occultPurple,
                          child: Icon(
                            Icons.check,
                            color: EldritchColors.parchmentLight,
                            size: 16,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),

              // Text content at bottom
              Positioned(
                left: 8,
                right: 8,
                bottom: 8,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Name
                    Text(
                      ancientOne.name,
                      style: const TextStyle(
                        color: EldritchColors.parchmentLight,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        shadows: [
                          Shadow(
                            color: EldritchColors.deepInk,
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),

                    // Epithet
                    Text(
                      ancientOne.epithet,
                      style: const TextStyle(
                            color: EldritchColors.fadedText,
                        fontSize: 10,
                        fontStyle: FontStyle.italic,
                        shadows: [
                          Shadow(
                            color: EldritchColors.deepInk,
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),

                    // Difficulty and Doom
                    Row(
                      children: [
                        _DifficultyBadge(difficulty: ancientOne.difficulty),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: EldritchColors.bloodSeal.withValues(alpha: 0.8),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            '${ancientOne.startingDoom}',
                            style: const TextStyle(
                              color: EldritchColors.highlightPaper,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DifficultyBadge extends StatelessWidget {
  final String difficulty;

  const _DifficultyBadge({required this.difficulty});

  Color get _color {
    switch (difficulty.toLowerCase()) {
      case 'low':
        return EldritchColors.occultGreen;
      case 'medium':
        return EldritchColors.brownShadow;
      case 'high':
        return EldritchColors.bloodSeal;
      case 'very high':
        return EldritchColors.occultPurple;
      default:
        return EldritchColors.uiNeutral;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        difficulty,
        style: const TextStyle(
          color: EldritchColors.parchmentLight,
          fontSize: 9,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}
