import 'package:flutter/material.dart';

/// Dart port of libs/design-tokens/tokens.json (docs/ui-ux.md) — the single
/// source of truth for the liquid-glass design system, shared with the admin
/// panel. Keep values in sync with that file by hand; there is no shared
/// build step between the Next.js and Flutter toolchains.
class AppColors {
  final Color primary;
  final Color secondary;
  final Color accent;
  final Color warn;
  final Color danger;
  final Color surfaceSolid;
  final Color onGlassText;

  const AppColors({
    required this.primary,
    required this.secondary,
    required this.accent,
    required this.warn,
    required this.danger,
    required this.surfaceSolid,
    required this.onGlassText,
  });

  static const light = AppColors(
    primary: Color(0xFF0FA958),
    secondary: Color(0xFF0B3954),
    accent: Color(0xFF00C2A8),
    warn: Color(0xFFF5A524),
    danger: Color(0xFFE5484D),
    surfaceSolid: Color(0xFFF7F9FA),
    onGlassText: Color(0xFF0B1215),
  );

  static const dark = AppColors(
    primary: Color(0xFF38D57F),
    secondary: Color(0xFF9AC1D9),
    accent: Color(0xFF2EE6CB),
    warn: Color(0xFFF7B84E),
    danger: Color(0xFFFF6B6E),
    surfaceSolid: Color(0xFF0E1416),
    onGlassText: Color(0xFFF2F7F5),
  );
}

enum GlassTier { raised, overlay, modal }

class GlassSpec {
  final double blur;
  final Color fillLight;
  final Color fillDark;
  final Color borderLight;
  final Color borderDark;

  const GlassSpec({
    required this.blur,
    required this.fillLight,
    required this.fillDark,
    required this.borderLight,
    required this.borderDark,
  });
}

class AppGlass {
  static const raised = GlassSpec(
    blur: 24,
    fillLight: Color(0xA6FFFFFF), // rgba(255,255,255,0.65)
    fillDark: Color(0x8C101820), // rgba(16,24,32,0.55)
    borderLight: Color(0x73FFFFFF), // rgba(255,255,255,0.45)
    borderDark: Color(0x29FFFFFF), // rgba(255,255,255,0.16)
  );

  static const overlay = GlassSpec(
    blur: 16,
    fillLight: Color(0x80FFFFFF), // rgba(255,255,255,0.50)
    fillDark: Color(0x73101820), // rgba(16,24,32,0.45)
    borderLight: Color(0x4DFFFFFF), // rgba(255,255,255,0.30)
    borderDark: Color(0x1FFFFFFF), // rgba(255,255,255,0.12)
  );

  static const modal = GlassSpec(
    blur: 40,
    fillLight: Color(0xC7FFFFFF), // rgba(255,255,255,0.78)
    fillDark: Color(0xB30B1215), // rgba(11,18,21,0.70)
    borderLight: Color(0x8CFFFFFF), // rgba(255,255,255,0.55)
    borderDark: Color(0x33FFFFFF), // rgba(255,255,255,0.20)
  );

  static GlassSpec of(GlassTier tier) => switch (tier) {
        GlassTier.raised => raised,
        GlassTier.overlay => overlay,
        GlassTier.modal => modal,
      };
}

class AppRadius {
  static const card = 24.0;
  static const sheet = 28.0;
  static const button = 16.0;
  static const pill = 999.0;
}

class AppMotion {
  static const sheet = Duration(milliseconds: 350);
  static const morph = Duration(milliseconds: 300);
  static const pulse = Duration(milliseconds: 1600);
  static const sweep = Duration(milliseconds: 600);
  static const press = Duration(milliseconds: 120);
}
