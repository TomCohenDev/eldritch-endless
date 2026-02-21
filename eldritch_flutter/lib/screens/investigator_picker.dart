import 'package:flutter/material.dart';
import '../theme/eldritch_theme.dart';
import '../services/data_loader.dart';
import '../models/ancient_one.dart';
import '../models/investigator.dart';
import 'voice_picker.dart';

class InvestigatorPicker extends StatefulWidget {
  final AncientOne selectedAncientOne;

  const InvestigatorPicker({
    super.key,
    required this.selectedAncientOne,
  });

  @override
  State<InvestigatorPicker> createState() => _InvestigatorPickerState();
}

class _InvestigatorPickerState extends State<InvestigatorPicker> {
  final DataLoader _dataLoader = DataLoader();
  List<Investigator> _investigators = [];
  final Set<String> _selectedInvestigatorNames = {};
  bool _isLoading = true;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadInvestigators();
  }

  Future<void> _loadInvestigators() async {
    final investigators = await _dataLoader.loadInvestigators();
    setState(() {
      _investigators = investigators;
      _isLoading = false;
    });
  }

  void _toggleInvestigator(Investigator investigator) {
    setState(() {
      if (_selectedInvestigatorNames.contains(investigator.name)) {
        _selectedInvestigatorNames.remove(investigator.name);
      } else {
        _selectedInvestigatorNames.add(investigator.name);
      }
    });
  }

  List<Investigator> get _filteredInvestigators {
    if (_searchQuery.isEmpty) return _investigators;
    final query = _searchQuery.toLowerCase();
    return _investigators.where((inv) {
      return inv.name.toLowerCase().contains(query) ||
          inv.profession.toLowerCase().contains(query) ||
          inv.role.toLowerCase().contains(query);
    }).toList();
  }

  List<Investigator> get _selectedInvestigators {
    return _investigators
        .where((inv) => _selectedInvestigatorNames.contains(inv.name))
        .toList();
  }

  void _proceedToNextStep() {
    if (_selectedInvestigators.isEmpty) return;

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => VoicePicker(
          selectedAncientOne: widget.selectedAncientOne,
          selectedInvestigators: _selectedInvestigators,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: EldritchColors.parchmentWarm,
      appBar: AppBar(
        title: const Text('Choose Investigators'),
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
                    // Selection info bar
                    Container(
                      padding: const EdgeInsets.all(16),
                      color: EldritchColors.leatherDark,
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '${_selectedInvestigators.length} Selected',
                                style: const TextStyle(
                                  color: EldritchColors.parchmentLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              TextButton(
                                onPressed: () {
                                  setState(() {
                                    _selectedInvestigatorNames.clear();
                                  });
                                },
                                child: const Text(
                                  'Clear All',
                                  style: TextStyle(
                                    color: EldritchColors.fadedText,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          // Search bar
                          TextField(
                            onChanged: (value) {
                              setState(() {
                                _searchQuery = value;
                              });
                            },
                            style:
                                const TextStyle(color: EldritchColors.deepInk),
                            decoration: InputDecoration(
                              hintText: 'Search investigators...',
                              hintStyle: const TextStyle(
                                  color: EldritchColors.fadedText),
                              prefixIcon: const Icon(Icons.search,
                                  color: EldritchColors.fadedText),
                              filled: true,
                              fillColor: EldritchColors.leatherMid,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(8),
                                borderSide: BorderSide.none,
                              ),
                              contentPadding:
                                  const EdgeInsets.symmetric(horizontal: 16),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Investigators grid
                    Expanded(
                      child: GridView.builder(
                        padding: const EdgeInsets.all(12),
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          childAspectRatio: 0.65,
                          crossAxisSpacing: 10,
                          mainAxisSpacing: 10,
                        ),
                        itemCount: _filteredInvestigators.length,
                        itemBuilder: (context, index) {
                          final investigator = _filteredInvestigators[index];
                          final isSelected = _selectedInvestigatorNames
                              .contains(investigator.name);
                          return _InvestigatorCard(
                            investigator: investigator,
                            isSelected: isSelected,
                            onTap: () => _toggleInvestigator(investigator),
                          );
                        },
                      ),
                    ),

                    // Continue button
                    if (_selectedInvestigators.isNotEmpty)
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
                              'CONTINUE WITH ${_selectedInvestigators.length} INVESTIGATOR${_selectedInvestigators.length > 1 ? 'S' : ''}',
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

class _InvestigatorCard extends StatelessWidget {
  final Investigator investigator;
  final bool isSelected;
  final VoidCallback onTap;

  const _InvestigatorCard({
    required this.investigator,
    required this.isSelected,
    required this.onTap,
  });

  /// Get the image asset path for the investigator
  String get _imagePath {
    // Convert name to filename format:
    // - Remove quotes (e.g., "Ashcan" Pete -> Ashcan Pete)
    // - Replace spaces with underscores
    // - URL encode special characters like apostrophes
    String fileName = investigator.name
        .replaceAll('"', '')
        .replaceAll(' ', '_')
        .replaceAll("'", '%27');
    return 'assets/investigator_images/$fileName.webp';
  }

  String get _displayName {
    return investigator.name.replaceAll('"', '');
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: isSelected
              ? EldritchColors.occultPurple.withValues(alpha: 0.3)
              : EldritchColors.leatherMid,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color:
                isSelected ? EldritchColors.occultPurple : Colors.transparent,
            width: 2,
          ),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Investigator Image
              Image.asset(
                _imagePath,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  // Fallback if image not found
                  return Container(
                    color: EldritchColors.leatherMid,
                    child: const Center(
                      child: Icon(
                        Icons.person,
                        color: EldritchColors.occultPurple,
                        size: 40,
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
                        EldritchColors.deepInk.withValues(alpha: 0.6),
                        EldritchColors.deepInk.withValues(alpha: 0.9),
                      ],
                      stops: const [0.0, 0.35, 0.65, 1.0],
                    ),
                  ),
                ),
              ),

              // Crimson bar at top over image - stats (covers a little of the image)
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: Container(
                  height: 13,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  decoration: const BoxDecoration(
                    color: EldritchColors.leatherDark,
                  ),
                  child: Center(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _StatBadge(
                            iconPath: 'assets/stats/Health_Icon.webp',
                            value: investigator.health,
                            color: EldritchColors.bloodSeal,
                          ),
                          const SizedBox(width: 4),
                          _StatBadge(
                            iconPath: 'assets/stats/Sanity_Icon.webp',
                            value: investigator.sanity,
                            color: EldritchColors.inkBlue,
                            fallbackIcon: Icons.psychology,
                          ),
                          const SizedBox(width: 6),
                          _SkillItem(
                              iconPath: 'assets/stats/Investigator_Lore.webp',
                              value: investigator.skills.lore),
                          _SkillItem(
                              iconPath:
                                  'assets/stats/Investigator_Influence.webp',
                              value: investigator.skills.influence),
                          _SkillItem(
                              iconPath:
                                  'assets/stats/Investigator_Observation.webp',
                              value: investigator.skills.observation),
                          _SkillItem(
                              iconPath:
                                  'assets/stats/Investigator_Strength.webp',
                              value: investigator.skills.strength),
                          _SkillItem(
                              iconPath: 'assets/stats/Investigator_Will.webp',
                              value: investigator.skills.will),
                        ],
                      ),
                    ),
                  ),
                ),
              ),

              // Selection overlay
              if (isSelected)
                Positioned(
                  top: 6,
                  right: 6,
                  child: Container(
                    width: 22,
                    height: 22,
                    decoration: const BoxDecoration(
                      color: EldritchColors.occultPurple,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check,
                      color: EldritchColors.parchmentLight,
                      size: 14,
                    ),
                  ),
                ),

              // Text content at bottom (name + profession only; stats are in top bar)
              Positioned(
                left: 6,
                right: 6,
                bottom: 6,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _displayName,
                      style: const TextStyle(
                        color: EldritchColors.parchmentLight,
                        fontWeight: FontWeight.bold,
                        fontSize: 11,
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
                    Text(
                      investigator.profession,
                      style: const TextStyle(
                        color: EldritchColors.fadedText,
                        fontSize: 9,
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

class _StatBadge extends StatelessWidget {
  final String iconPath;
  final int value;
  final Color color;
  final IconData fallbackIcon;

  const _StatBadge({
    required this.iconPath,
    required this.value,
    required this.color,
    this.fallbackIcon = Icons.favorite,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 3),
      decoration: BoxDecoration(
        color: EldritchColors.deepInk.withValues(alpha: 0.6),
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
            errorBuilder: (_, __, ___) =>
                Icon(fallbackIcon, color: color, size: 12),
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

class _SkillItem extends StatelessWidget {
  final String iconPath;
  final int value;

  const _SkillItem({
    required this.iconPath,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 2),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Image.asset(
            iconPath,
            width: 14,
            height: 14,
            fit: BoxFit.contain,
            errorBuilder: (_, __, ___) => SizedBox(
              width: 14,
              height: 14,
              child: Center(
                child: Text(
                  value.toString(),
                  style: const TextStyle(
                    color: EldritchColors.parchmentLight,
                    fontWeight: FontWeight.bold,
                    fontSize: 9,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 2),
          Text(
            value.toString(),
            style: const TextStyle(
              color: EldritchColors.parchmentLight,
              fontWeight: FontWeight.bold,
              fontSize: 9,
            ),
          ),
        ],
      ),
    );
  }
}
