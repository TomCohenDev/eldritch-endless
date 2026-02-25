import 'dart:async';
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
  Timer? _searchDebounce;

  List<Investigator> _filteredInvestigators = [];
  int _selectedCount = 0;

  // Computed once per build, passed down — avoids MediaQuery per card
  int _cardPixelWidth = 0;

  static const _statIconPaths = [
    'assets/stats/Health_Icon.webp',
    'assets/stats/Sanity_Icon.webp',
    'assets/stats/Investigator_Lore.webp',
    'assets/stats/Investigator_Influence.webp',
    'assets/stats/Investigator_Observation.webp',
    'assets/stats/Investigator_Strength.webp',
    'assets/stats/Investigator_Will.webp',
  ];

  @override
  void initState() {
    super.initState();
    _loadInvestigators();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Precache all stat icons once so they're ready when the grid renders
    for (final path in _statIconPaths) {
      precacheImage(AssetImage(path), context);
    }
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    super.dispose();
  }

  Future<void> _loadInvestigators() async {
    final investigators = await _dataLoader.loadInvestigators();
    setState(() {
      _investigators = investigators;
      _filteredInvestigators = investigators;
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
      _selectedCount = _selectedInvestigatorNames.length;
    });
  }

  void _onSearchChanged(String value) {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 200), () {
      setState(() {
        _searchQuery = value;
        _updateFilteredList();
      });
    });
  }

  void _updateFilteredList() {
    if (_searchQuery.isEmpty) {
      _filteredInvestigators = _investigators;
      return;
    }
    final query = _searchQuery.toLowerCase();
    _filteredInvestigators = _investigators.where((inv) {
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
    if (_selectedCount == 0) return;
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
    // Compute once here; passed to every card so MediaQuery isn't called per card
    _cardPixelWidth =
        (MediaQuery.sizeOf(context).width / 3 * MediaQuery.devicePixelRatioOf(context))
            .round();

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
                    // Header bar
                    Container(
                      padding: const EdgeInsets.all(16),
                      color: EldritchColors.leatherDark,
                      child: Column(
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '$_selectedCount Selected',
                                style: const TextStyle(
                                  color: EldritchColors.parchmentLight,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              TextButton(
                                onPressed: () {
                                  setState(() {
                                    _selectedInvestigatorNames.clear();
                                    _selectedCount = 0;
                                  });
                                },
                                child: const Text(
                                  'Clear All',
                                  style:
                                      TextStyle(color: EldritchColors.fadedText),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          TextField(
                            onChanged: _onSearchChanged,
                            style: const TextStyle(
                                color: EldritchColors.deepInk),
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

                    // Grid
                    Expanded(
                      child: GridView.builder(
                        padding: const EdgeInsets.all(12),
                        cacheExtent: 600,
                        addAutomaticKeepAlives: false,
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
                          return RepaintBoundary(
                            child: _InvestigatorCard(
                              investigator: investigator,
                              isSelected: isSelected,
                              cardPixelWidth: _cardPixelWidth,
                              onTap: () => _toggleInvestigator(investigator),
                            ),
                          );
                        },
                      ),
                    ),

                    // Continue button
                    if (_selectedCount > 0)
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
                              'CONTINUE WITH $_selectedCount INVESTIGATOR${_selectedCount > 1 ? 'S' : ''}',
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

// ─── Precomputed const values ─────────────────────────────────────────────────

// Gradient stops are fixed — using const Color hex avoids object creation per build
const _kGradient = LinearGradient(
  begin: Alignment.topCenter,
  end: Alignment.bottomCenter,
  colors: [
    Color(0x00000000), // transparent
    Color(0x00000000),
    Color(0x991A1A2E), // deepInk @ 60%
    Color(0xE61A1A2E), // deepInk @ 90%
  ],
  stops: [0.0, 0.35, 0.65, 1.0],
);

const _kGradientDecoration = BoxDecoration(gradient: _kGradient);

const _kSelectedBorder =
    Border.fromBorderSide(BorderSide(color: EldritchColors.occultPurple, width: 2));

// ─── Card widget ──────────────────────────────────────────────────────────────

class _InvestigatorCard extends StatelessWidget {
  final Investigator investigator;
  final bool isSelected;
  final VoidCallback onTap;
  final int cardPixelWidth;

  const _InvestigatorCard({
    required this.investigator,
    required this.isSelected,
    required this.onTap,
    required this.cardPixelWidth,
  });

  String get _imagePath {
    final fileName = investigator.name
        .replaceAll('"', '')
        .replaceAll(' ', '_')
        .replaceAll("'", '%27');
    return 'assets/investigator_images/$fileName.webp';
  }

  String get _displayName => investigator.name.replaceAll('"', '');

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        // Plain Container — no AnimatedContainer animation overhead
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0x4D6A0DAD) // occultPurple @ 30%
              : EldritchColors.leatherMid,
          borderRadius: BorderRadius.circular(10),
          border: isSelected ? _kSelectedBorder : null,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(isSelected ? 8 : 10),
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Portrait — gaplessPlayback prevents flicker on rebuild
              Image.asset(
                _imagePath,
                fit: BoxFit.cover,
                cacheWidth: cardPixelWidth,
                gaplessPlayback: true,
                errorBuilder: (_, __, ___) => const ColoredBox(
                  color: EldritchColors.leatherMid,
                  child: Center(
                    child: Icon(Icons.person,
                        color: EldritchColors.occultPurple, size: 40),
                  ),
                ),
              ),

              // Gradient — const, never reallocated
              const Positioned.fill(
                child: DecoratedBox(decoration: _kGradientDecoration),
              ),

              // Stats bar — no FittedBox, fixed 16px height avoids double layout
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: _StatsBar(investigator: investigator),
              ),

              // Selection check
              if (isSelected)
                const Positioned(
                  top: 6,
                  right: 6,
                  child: _SelectionBadge(),
                ),

              // Name + profession
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
                        shadows: [Shadow(color: EldritchColors.deepInk, blurRadius: 4)],
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
                        shadows: [Shadow(color: EldritchColors.deepInk, blurRadius: 4)],
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

// ─── Stats bar ────────────────────────────────────────────────────────────────

class _StatsBar extends StatelessWidget {
  final Investigator investigator;

  const _StatsBar({required this.investigator});

  @override
  Widget build(BuildContext context) {
    final s = investigator.skills;
    return Container(
      height: 16,
      color: EldritchColors.leatherDark,
      padding: const EdgeInsets.symmetric(horizontal: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _StatChip(
            'assets/stats/Health_Icon.webp', investigator.health, EldritchColors.bloodSeal),
          _StatChip(
            'assets/stats/Sanity_Icon.webp', investigator.sanity, EldritchColors.inkBlue),
          _SkillDot('assets/stats/Investigator_Lore.webp', s.lore),
          _SkillDot('assets/stats/Investigator_Influence.webp', s.influence),
          _SkillDot('assets/stats/Investigator_Observation.webp', s.observation),
          _SkillDot('assets/stats/Investigator_Strength.webp', s.strength),
          _SkillDot('assets/stats/Investigator_Will.webp', s.will),
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String iconPath;
  final int value;
  final Color color;

  const _StatChip(this.iconPath, this.value, this.color);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Image.asset(iconPath, width: 11, height: 11, fit: BoxFit.contain,
            errorBuilder: (_, __, ___) =>
                Icon(Icons.favorite, color: color, size: 10)),
        const SizedBox(width: 1),
        Text(value.toString(),
            style: TextStyle(
                color: color, fontWeight: FontWeight.bold, fontSize: 9)),
      ],
    );
  }
}

class _SkillDot extends StatelessWidget {
  final String iconPath;
  final int value;

  const _SkillDot(this.iconPath, this.value);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Image.asset(iconPath, width: 11, height: 11, fit: BoxFit.contain,
            errorBuilder: (_, __, ___) => const SizedBox(width: 11, height: 11)),
        const SizedBox(width: 1),
        Text(value.toString(),
            style: const TextStyle(
                color: EldritchColors.parchmentLight,
                fontWeight: FontWeight.bold,
                fontSize: 9)),
      ],
    );
  }
}

// ─── Selection badge ──────────────────────────────────────────────────────────

class _SelectionBadge extends StatelessWidget {
  const _SelectionBadge();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      width: 22,
      height: 22,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: EldritchColors.occultPurple,
          shape: BoxShape.circle,
        ),
        child: Icon(Icons.check, color: EldritchColors.parchmentLight, size: 14),
      ),
    );
  }
}
