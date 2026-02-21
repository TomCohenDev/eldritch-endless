import 'package:flutter/material.dart';

class SkillIconText extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final int? maxLines;
  final TextOverflow overflow;

  const SkillIconText({
    super.key,
    required this.text,
    this.style,
    this.maxLines,
    this.overflow = TextOverflow.clip,
  });

  static const Map<String, String> _skillIconAssets = {
    'influence': 'assets/stats/Investigator_Influence.webp',
    'lore': 'assets/stats/Investigator_Lore.webp',
    'observation': 'assets/stats/Investigator_Observation.webp',
    'strength': 'assets/stats/Investigator_Strength.webp',
    'will': 'assets/stats/Investigator_Will.webp',
    'health': 'assets/stats/Health_Icon.webp',
    'sanity': 'assets/stats/Sanity_Icon.webp',
  };

  @override
  Widget build(BuildContext context) {
    return RichText(
      maxLines: maxLines,
      overflow: overflow,
      text: TextSpan(
        style: style ?? DefaultTextStyle.of(context).style,
        children: _buildSpans(),
      ),
    );
  }

  List<InlineSpan> _buildSpans() {
    final spans = <InlineSpan>[];
    final regex = RegExp(
      r'\b(Influence|Lore|Observation|Strength|Will|Health|Sanity)\b',
      caseSensitive: false,
    );

    int cursor = 0;
    for (final match in regex.allMatches(text)) {
      if (match.start > cursor) {
        spans.add(TextSpan(text: text.substring(cursor, match.start)));
      }

      final skill = (match.group(0) ?? '').toLowerCase();
      final asset = _skillIconAssets[skill];

      if (asset == null) {
        spans.add(TextSpan(text: match.group(0)));
      } else {
        spans.add(
          WidgetSpan(
            alignment: PlaceholderAlignment.middle,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Image.asset(
                asset,
                width: 16,
                height: 16,
                fit: BoxFit.contain,
              ),
            ),
          ),
        );
      }

      cursor = match.end;
    }

    if (cursor < text.length) {
      spans.add(TextSpan(text: text.substring(cursor)));
    }

    return spans;
  }
}
