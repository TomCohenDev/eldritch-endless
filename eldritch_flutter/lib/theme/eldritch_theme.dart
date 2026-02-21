import 'package:flutter/material.dart';

/// Original Eldritch Horror palette: paper / ink / leather + stamp accents.
class EldritchColors {
  EldritchColors._();

  // --- Core paper / ink / leather (most common) ---
  static const parchmentLight = Color(0xFFE5E1DA);
  static const parchmentWarm = Color(0xFFD7D0C6);
  static const parchmentMid = Color(0xFFC5C0B6);
  static const parchmentGreyed = Color(0xFFAFA9A1);
  static const fadedText = Color(0xFF938F88);
  static const uiNeutral = Color(0xFF77716E);
  // Dark crimson (replaces brown/leather)
  static const leatherDark = Color(0xFF2D0A0A);   // dark crimson - app bars, primary dark
  static const leatherMid = Color(0xFF4A1818);     // mid dark crimson - cards, borders
  static const brownShadow = Color(0xFF5C2020);    // crimson shadow / warm accent
  static const deepInk = Color(0xFF1F1518);
  static const nearBlackInk = Color(0xFF2C2528);   // neutral dark (reduced brown tint)
  static const highlightPaper = Color(0xFFFDFDFA);

  // --- Accent stamps / icons / seals ---
  static const brass = Color(0xFFBDA273);
  static const brassHighlight = Color(0xFFD7BB92);
  static const bloodSeal = Color(0xFFA92E2C);
  static const occultPurple = Color(0xFF5A426E);
  static const inkBlue = Color(0xFF748DAF);
  static const occultGreen = Color(0xFF354B30);

  // --- Semantic aliases for theme (map to palette) ---
  static const abyss = deepInk;
  static const deepSea = leatherDark;
  static const storm = leatherMid;
  static const ritual = occultPurple;
  static const ritualSoft = Color(0xFF7A6B8A); // slightly lighter purple
  static const blood = bloodSeal;
  static const bone = parchmentLight;
  static const fog = fadedText;

  /// Parchment image path for background where it fits (paper-style screens).
  static const String parchmentBackgroundAsset = 'assets/images/parchment.png';
}

class EldritchTypography extends ThemeExtension<EldritchTypography> {
  final TextStyle menuLabel;
  final TextStyle sectionHeader;
  final TextStyle loreBody;
  final TextStyle loreQuote;
  final TextStyle statusBadge;

  const EldritchTypography({
    required this.menuLabel,
    required this.sectionHeader,
    required this.loreBody,
    required this.loreQuote,
    required this.statusBadge,
  });

  @override
  EldritchTypography copyWith({
    TextStyle? menuLabel,
    TextStyle? sectionHeader,
    TextStyle? loreBody,
    TextStyle? loreQuote,
    TextStyle? statusBadge,
  }) {
    return EldritchTypography(
      menuLabel: menuLabel ?? this.menuLabel,
      sectionHeader: sectionHeader ?? this.sectionHeader,
      loreBody: loreBody ?? this.loreBody,
      loreQuote: loreQuote ?? this.loreQuote,
      statusBadge: statusBadge ?? this.statusBadge,
    );
  }

  @override
  EldritchTypography lerp(ThemeExtension<EldritchTypography>? other, double t) {
    if (other is! EldritchTypography) return this;
    return EldritchTypography(
      menuLabel: TextStyle.lerp(menuLabel, other.menuLabel, t) ?? menuLabel,
      sectionHeader: TextStyle.lerp(sectionHeader, other.sectionHeader, t) ?? sectionHeader,
      loreBody: TextStyle.lerp(loreBody, other.loreBody, t) ?? loreBody,
      loreQuote: TextStyle.lerp(loreQuote, other.loreQuote, t) ?? loreQuote,
      statusBadge: TextStyle.lerp(statusBadge, other.statusBadge, t) ?? statusBadge,
    );
  }

  static EldritchTypography fromColorScheme(ColorScheme colors) {
    return EldritchTypography(
      menuLabel: TextStyle(
        fontFamily: 'Cinzel',
        color: colors.onSurface.withValues(alpha: 0.78),
        fontSize: 11,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.8,
      ),
      sectionHeader: TextStyle(
        fontFamily: 'Cinzel',
        color: EldritchColors.occultPurple,
        fontSize: 12,
        fontWeight: FontWeight.w700,
        letterSpacing: 2,
      ),
      loreBody: TextStyle(
        fontFamily: 'Special Elite',
        color: colors.onSurface.withValues(alpha: 0.88),
        fontSize: 14,
        height: 1.5,
      ),
      loreQuote: TextStyle(
        fontFamily: 'Special Elite',
        color: colors.onSurface.withValues(alpha: 0.74),
        fontSize: 13,
        height: 1.45,
      ),
      statusBadge: TextStyle(
        fontFamily: 'Cinzel',
        fontWeight: FontWeight.w700,
        fontSize: 12,
      ),
    );
  }
}

class EldritchAppTheme {
  static ThemeData dark() {
    const baseScheme = ColorScheme(
      brightness: Brightness.dark,
      primary: EldritchColors.ritual,
      onPrimary: Colors.white,
      secondary: EldritchColors.ritualSoft,
      onSecondary: Colors.black,
      error: EldritchColors.blood,
      onError: Colors.white,
      surface: EldritchColors.deepSea,
      onSurface: EldritchColors.bone,
    );

    final textTheme = Typography.whiteMountainView.apply(
      bodyColor: baseScheme.onSurface,
      displayColor: baseScheme.onSurface,
      fontFamily: 'Crimson Text',
    ).copyWith(
      displayLarge: const TextStyle(fontFamily: 'Cinzel', fontWeight: FontWeight.w700),
      displayMedium: const TextStyle(fontFamily: 'Cinzel', fontWeight: FontWeight.w700),
      displaySmall: const TextStyle(fontFamily: 'Cinzel', fontWeight: FontWeight.w700),
      headlineLarge: const TextStyle(fontFamily: 'Cinzel', fontWeight: FontWeight.w700),
      headlineMedium: const TextStyle(fontFamily: 'Cinzel', fontWeight: FontWeight.w700),
      headlineSmall: const TextStyle(fontFamily: 'Cinzel', fontWeight: FontWeight.w700),
      titleLarge: const TextStyle(fontFamily: 'Cinzel', fontWeight: FontWeight.w700),
      titleMedium: const TextStyle(fontFamily: 'Cinzel', fontWeight: FontWeight.w600),
      titleSmall: const TextStyle(fontFamily: 'Cinzel', fontWeight: FontWeight.w600),
      labelLarge: const TextStyle(fontFamily: 'Cinzel', fontWeight: FontWeight.w600),
      labelMedium: const TextStyle(fontFamily: 'Cinzel', fontWeight: FontWeight.w600),
      labelSmall: const TextStyle(fontFamily: 'Cinzel', fontWeight: FontWeight.w600),
      bodyLarge: const TextStyle(fontFamily: 'Crimson Text', fontSize: 18, height: 1.4),
      bodyMedium: const TextStyle(fontFamily: 'Crimson Text', fontSize: 16, height: 1.35),
      bodySmall: const TextStyle(fontFamily: 'Crimson Text', fontSize: 14, height: 1.3),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: baseScheme,
      scaffoldBackgroundColor: EldritchColors.deepInk,
      textTheme: textTheme,
      extensions: <ThemeExtension<dynamic>>[
        EldritchTypography.fromColorScheme(baseScheme),
      ],
      appBarTheme: const AppBarTheme(
        backgroundColor: EldritchColors.deepSea,
        foregroundColor: EldritchColors.bone,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: EldritchColors.deepSea,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: EldritchColors.ritual,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: EldritchColors.storm,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
        labelStyle: TextStyle(color: baseScheme.onSurface.withValues(alpha: 0.56)),
        hintStyle: TextStyle(color: baseScheme.onSurface.withValues(alpha: 0.28)),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: EldritchColors.deepSea,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: EldritchColors.deepSea,
        contentTextStyle: textTheme.bodyMedium,
      ),
      dividerTheme: DividerThemeData(color: baseScheme.onSurface.withValues(alpha: 0.2)),
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: EldritchColors.ritual),
    );
  }
}

extension EldritchThemeContext on BuildContext {
  EldritchTypography get eldritchType =>
      Theme.of(this).extension<EldritchTypography>() ?? EldritchTypography.fromColorScheme(Theme.of(this).colorScheme);
}

/// Full-screen parchment background. Use as the first child of a Stack, then put content on top.
class ParchmentBackground extends StatelessWidget {
  const ParchmentBackground({super.key});

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: Image.asset(
        EldritchColors.parchmentBackgroundAsset,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => Container(color: EldritchColors.parchmentWarm),
      ),
    );
  }
}
