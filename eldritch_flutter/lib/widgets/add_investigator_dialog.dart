import 'package:flutter/material.dart';
import '../models/investigator.dart';
import '../services/data_loader.dart';
import '../theme/eldritch_theme.dart';

class AddInvestigatorDialog extends StatefulWidget {
  /// Names of investigators already in the game (to exclude from the list).
  final Set<String> existingInvestigatorNames;

  const AddInvestigatorDialog({
    super.key,
    required this.existingInvestigatorNames,
  });

  /// Show the bottom sheet and return the chosen investigator (or null).
  static Future<Investigator?> show({
    required BuildContext context,
    required Set<String> existingInvestigatorNames,
  }) {
    return showModalBottomSheet<Investigator>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => AddInvestigatorDialog(
        existingInvestigatorNames: existingInvestigatorNames,
      ),
    );
  }

  @override
  State<AddInvestigatorDialog> createState() => _AddInvestigatorDialogState();
}

class _AddInvestigatorDialogState extends State<AddInvestigatorDialog> {
  final DataLoader _dataLoader = DataLoader();
  List<Investigator> _available = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final all = await _dataLoader.loadInvestigators();
    setState(() {
      _available = all
          .where((inv) => !widget.existingInvestigatorNames.contains(inv.name))
          .toList();
      _isLoading = false;
    });
  }

  String _imagePath(Investigator inv) {
    final fileName = inv.name
        .replaceAll('"', '')
        .replaceAll(' ', '_')
        .replaceAll("'", '%27');
    return 'assets/investigator_images/$fileName.webp';
  }

  @override
  Widget build(BuildContext context) {
    final screenH = MediaQuery.sizeOf(context).height;
    final pixelWidth =
        (MediaQuery.sizeOf(context).width / 3 * MediaQuery.devicePixelRatioOf(context))
            .round();

    return Container(
      height: screenH * 0.75,
      decoration: const BoxDecoration(
        color: EldritchColors.leatherDark,
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: Column(
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: EldritchColors.parchmentGreyed,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                const Icon(
                  Icons.person_add,
                  color: EldritchColors.occultPurple,
                  size: 18,
                ),
                const SizedBox(width: 8),
                const Text(
                  'ADD INVESTIGATOR',
                  style: TextStyle(
                    color: EldritchColors.parchmentLight,
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    letterSpacing: 1,
                  ),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: const Icon(
                    Icons.close,
                    color: EldritchColors.fadedText,
                    size: 20,
                  ),
                ),
              ],
            ),
          ),
          const Divider(color: EldritchColors.leatherMid, height: 1),
          // Grid
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _available.isEmpty
                    ? const Center(
                        child: Padding(
                          padding: EdgeInsets.all(24),
                          child: Text(
                            'All investigators are already in the game.',
                            style: TextStyle(color: EldritchColors.fadedText),
                            textAlign: TextAlign.center,
                          ),
                        ),
                      )
                    : GridView.builder(
                        padding: const EdgeInsets.all(12),
                        cacheExtent: 300,
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          childAspectRatio: 0.65,
                          crossAxisSpacing: 10,
                          mainAxisSpacing: 10,
                        ),
                        itemCount: _available.length,
                        itemBuilder: (context, index) {
                          final inv = _available[index];
                          return RepaintBoundary(
                            child: GestureDetector(
                              onTap: () => Navigator.pop(context, inv),
                              child: Container(
                                decoration: BoxDecoration(
                                  color: EldritchColors.leatherMid,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(10),
                                  child: Stack(
                                    fit: StackFit.expand,
                                    children: [
                                      Image.asset(
                                        _imagePath(inv),
                                        fit: BoxFit.cover,
                                        cacheWidth: pixelWidth,
                                        errorBuilder: (_, __, ___) =>
                                            const Center(
                                          child: Icon(
                                            Icons.person,
                                            color: EldritchColors.occultPurple,
                                            size: 40,
                                          ),
                                        ),
                                      ),
                                      Positioned.fill(
                                        child: DecoratedBox(
                                          decoration: BoxDecoration(
                                            gradient: LinearGradient(
                                              begin: Alignment.topCenter,
                                              end: Alignment.bottomCenter,
                                              colors: [
                                                Colors.transparent,
                                                EldritchColors.deepInk
                                                    .withValues(alpha: 0.85),
                                              ],
                                              stops: const [0.5, 1.0],
                                            ),
                                          ),
                                        ),
                                      ),
                                      Positioned(
                                        left: 4,
                                        right: 4,
                                        bottom: 4,
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            Text(
                                              inv.name.replaceAll('"', ''),
                                              style: const TextStyle(
                                                color:
                                                    EldritchColors.parchmentLight,
                                                fontWeight: FontWeight.bold,
                                                fontSize: 10,
                                                shadows: [
                                                  Shadow(
                                                    color:
                                                        EldritchColors.deepInk,
                                                    blurRadius: 4,
                                                  ),
                                                ],
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                            Text(
                                              inv.profession,
                                              style: const TextStyle(
                                                color: EldritchColors.fadedText,
                                                fontSize: 8,
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
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
