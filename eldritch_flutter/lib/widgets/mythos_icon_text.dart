import 'package:flutter/material.dart';

/// Renders mythos card effect text with inline icons.
///
/// Parses wiki template markers like {{Health}}, {{Sanity|value=2}},
/// {{Icon|doom}}, {{Icon|clues}}, {{Influence}}, {{Place ET|3}}, etc.
/// and renders them as inline image icons within the text.
class MythosIconText extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final double iconSize;

  const MythosIconText({
    super.key,
    required this.text,
    this.style,
    this.iconSize = 20,
  });

  // Stat/skill template name → asset path
  static const _statIcons = <String, String>{
    'health':      'assets/stats/Health_Icon.webp',
    'sanity':      'assets/stats/Sanity_Icon.webp',
    'influence':   'assets/stats/Investigator_Influence.webp',
    'lore':        'assets/stats/Investigator_Lore.webp',
    'observation': 'assets/stats/Investigator_Observation.webp',
    'strength':    'assets/stats/Investigator_Strength.webp',
    'will':        'assets/stats/Investigator_Will.webp',
    'reckoning':   'assets/images/Mythos_Reckoning.webp',
  };

  // Icon| sub-name → asset path (null = missing, show label fallback)
  static const _iconSubAssets = <String, String?>{
    'reckoning':       'assets/images/Mythos_Reckoning.webp',
    'clues':           'assets/images/Spawn_Clues.webp',
    'clue':            'assets/images/Spawn_Clues.webp',
    'eldritch tokens': 'assets/images/Eldritch_Token.webp',
    'et':              'assets/images/Eldritch_Token.webp',
    'doom':            'assets/images/Doom.webp',
    'city':            'assets/images/City.webp',
    'wilderness':      'assets/images/Wilderness.webp',
    'sea':             'assets/images/Sea.webp',
  };

  @override
  Widget build(BuildContext context) {
    final base = style ?? DefaultTextStyle.of(context).style;
    return RichText(
      text: TextSpan(style: base, children: _buildSpans(base)),
    );
  }

  List<InlineSpan> _buildSpans(TextStyle base) {
    final spans = <InlineSpan>[];
    // Match {{...}} template blocks
    final templateRegex = RegExp(r'\{\{([^}]*(?:\}[^}]+)*)\}\}');

    int cursor = 0;
    for (final match in templateRegex.allMatches(text)) {
      if (match.start > cursor) {
        spans.add(TextSpan(text: text.substring(cursor, match.start)));
      }
      spans.add(_renderTemplate(match.group(1) ?? '', base));
      cursor = match.end;
    }
    if (cursor < text.length) {
      spans.add(TextSpan(text: text.substring(cursor)));
    }
    return spans;
  }

  InlineSpan _renderTemplate(String templateContent, TextStyle base) {
    // Normalize: strip non-ASCII (e.g. unicode LRM in "Sanity‎"), split on |
    final normalized = templateContent
        .replaceAll(RegExp(r'[^\x20-\x7E\n]'), '')
        .trim();
    final parts = normalized.split('|').map((p) => p.trim()).toList();
    final baseName = parts[0].toLowerCase();

    // ── Stat / skill icons ──────────────────────────────────────────────────
    if (_statIcons.containsKey(baseName)) {
      final asset = _statIcons[baseName]!;
      final value = _parseValue(parts);
      return _iconSpan(asset, value, base);
    }

    // ── Icon|subtype[|count] ─────────────────────────────────────────────────
    if (baseName == 'icon' && parts.length >= 2) {
      final sub = parts[1].toLowerCase();
      final count = parts.length >= 3 ? _parseInt(parts[2]) : null;
      if (_iconSubAssets.containsKey(sub)) {
        final asset = _iconSubAssets[sub];
        if (asset != null) {
          return _iconSpan(asset, count != null ? '$count' : null, base);
        }
      }
      return const TextSpan(text: '');
    }

    // ── Place ET|N ───────────────────────────────────────────────────────────
    if (baseName == 'place et') {
      final count = parts.length >= 2 ? parts[1].trim() : '1';
      return _iconSpan('assets/images/Eldritch_Token.webp', count, base);
    }

    // ── NoInvestigators ──────────────────────────────────────────────────────
    if (baseName == 'noinvestigators') {
      return _iconSpan('assets/images/investigators.png', null, base);
    }

    // ── Rumor|[[Space N]] ────────────────────────────────────────────────────
    if (baseName == 'rumor' && parts.length >= 2) {
      final loc = parts[1].replaceAll(RegExp(r'\[\[|\]\]'), '').trim();
      return TextSpan(text: 'Rumor: $loc');
    }

    // ── Ignore everything else (Ref|, Core Game, etc.) ───────────────────────
    return const TextSpan(text: '');
  }

  /// Parses value= param from parts list.
  String? _parseValue(List<String> parts) {
    for (final part in parts.skip(1)) {
      if (part.startsWith('value=')) return part.substring(6).trim();
    }
    // Also accept a bare number
    for (final part in parts.skip(1)) {
      if (RegExp(r'^\d+$').hasMatch(part)) return part;
    }
    return null;
  }

  int? _parseInt(String s) => int.tryParse(s.trim());

  WidgetSpan _iconSpan(String asset, String? count, TextStyle base) {
    final size = iconSize;
    Widget img = Image.asset(
      asset,
      width: size,
      height: size,
      fit: BoxFit.contain,
      errorBuilder: (_, __, ___) => SizedBox(
        width: size,
        height: size,
        child: Icon(Icons.help_outline, size: size * 0.8, color: Colors.orange),
      ),
    );

    Widget content = count != null && count.isNotEmpty
        ? Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              img,
              Text(
                count,
                style: base.copyWith(fontWeight: FontWeight.bold),
              ),
            ],
          )
        : img;

    return WidgetSpan(
      alignment: PlaceholderAlignment.middle,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 1),
        child: content,
      ),
    );
  }
}
