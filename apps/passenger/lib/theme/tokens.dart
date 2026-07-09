import 'package:flutter/material.dart';

/// Dart port of the "drivver" design system (colors/type/spacing/shadows —
/// see the imported tokens/*.css) — replaces the previous "liquid glass"
/// tokens this file used to hold. Values are hand-kept in sync with the
/// source design system; there is no shared build step. Brand identifiers
/// (name/copy) are NOT adopted — only the visual system.
class AppSky {
  static const s50 = Color(0xFFECFAFD);
  static const s100 = Color(0xFFD2F2F9);
  static const s200 = Color(0xFFA8E6F2);
  static const s300 = Color(0xFF78D6E9);
  static const s400 = Color(0xFF55CCE4);
  static const s500 = Color(0xFF42C5E1); // brand core
  static const s600 = Color(0xFF23A9C6);
  static const s700 = Color(0xFF197E96);
  static const s800 = Color(0xFF155F72);
  static const s900 = Color(0xFF123F4E);
}

class AppSlate {
  static const s0 = Color(0xFFFFFFFF);
  static const s50 = Color(0xFFF6F8FA);
  static const s100 = Color(0xFFEDF1F5);
  static const s200 = Color(0xFFDDE4EB);
  static const s300 = Color(0xFFC4CFDA);
  static const s400 = Color(0xFF9AA9B8);
  static const s500 = Color(0xFF6B7C8E);
  static const s600 = Color(0xFF4B5A6A);
  static const s700 = Color(0xFF33414F);
  static const s800 = Color(0xFF1E2A38);
  static const s900 = Color(0xFF0E1B2B); // ink
}

class AppCoral {
  static const c50 = Color(0xFFFFF0EC);
  static const c100 = Color(0xFFFFDBD1);
  static const c300 = Color(0xFFFFA891);
  static const c400 = Color(0xFFFF8367);
  static const c500 = Color(0xFFFF6A4D);
  static const c600 = Color(0xFFEB4E30);
}

class AppSemanticHues {
  static const green50 = Color(0xFFE6F7EF);
  static const green500 = Color(0xFF12B76A);
  static const green600 = Color(0xFF039855);
  static const amber50 = Color(0xFFFEF6E7);
  static const amber500 = Color(0xFFF5A623);
  static const amber600 = Color(0xFFDC8A06);
  static const red50 = Color(0xFFFEECEB);
  static const red500 = Color(0xFFF04438);
  static const red600 = Color(0xFFD92D20);
}

/// Semantic aliases — reference THESE from screens/widgets, not the raw
/// ramps above (mirrors tokens/colors.css's alias section).
class AppColors {
  final Color primary; // color-brand
  final Color primaryHover;
  final Color primaryPress;
  final Color primarySubtle;
  final Color secondary; // ink navy — professional anchor
  final Color accent; // coral — playful, used sparingly
  final Color warn;
  final Color danger;
  final Color success;
  final Color surfacePage;
  final Color surfaceCard;
  final Color surfaceSunken;
  final Color surfaceSolid; // = surfacePage; kept for existing call sites
  final Color textPrimary;
  final Color textSecondary;
  final Color textMuted;
  final Color textOnBrand; // ink-on-cyan — the signature primary-button look
  final Color textOnInk;
  final Color borderSubtle;
  final Color borderDefault;
  final Color overlayScrim; // translucent ink modal backdrop

  const AppColors({
    required this.primary,
    required this.primaryHover,
    required this.primaryPress,
    required this.primarySubtle,
    required this.secondary,
    required this.accent,
    required this.warn,
    required this.danger,
    required this.success,
    required this.surfacePage,
    required this.surfaceCard,
    required this.surfaceSunken,
    required this.surfaceSolid,
    required this.textPrimary,
    required this.textSecondary,
    required this.textMuted,
    required this.textOnBrand,
    required this.textOnInk,
    required this.borderSubtle,
    required this.borderDefault,
    required this.overlayScrim,
  });

  static const light = AppColors(
    primary: AppSky.s500,
    primaryHover: AppSky.s600,
    primaryPress: AppSky.s700,
    primarySubtle: AppSky.s50,
    secondary: AppSlate.s900,
    accent: AppCoral.c500,
    warn: AppSemanticHues.amber500,
    danger: AppSemanticHues.red500,
    success: AppSemanticHues.green500,
    surfacePage: AppSlate.s50,
    surfaceCard: AppSlate.s0,
    surfaceSunken: AppSlate.s100,
    surfaceSolid: AppSlate.s50,
    textPrimary: AppSlate.s900,
    textSecondary: AppSlate.s600,
    textMuted: AppSlate.s500,
    textOnBrand: AppSlate.s900,
    textOnInk: AppSlate.s0,
    borderSubtle: AppSlate.s200,
    borderDefault: AppSlate.s300,
    overlayScrim: Color(0x8C0E1B2B), // rgba(14,27,43,0.55)
  );

  /// No dark "night mode" palette was captured in the source system beyond
  /// the qualitative note that ink navy grounds dark surfaces — this
  /// extrapolates that into a full scheme rather than inventing an
  /// unrelated one.
  static const dark = AppColors(
    primary: AppSky.s400,
    primaryHover: AppSky.s300,
    primaryPress: AppSky.s200,
    primarySubtle: AppSky.s900,
    secondary: AppSlate.s200,
    accent: AppCoral.c400,
    warn: AppSemanticHues.amber500,
    danger: AppSemanticHues.red500,
    success: AppSemanticHues.green500,
    surfacePage: AppSlate.s900,
    surfaceCard: AppSlate.s800,
    surfaceSunken: AppSlate.s700,
    surfaceSolid: AppSlate.s900,
    textPrimary: AppSlate.s0,
    textSecondary: AppSlate.s300,
    textMuted: AppSlate.s400,
    textOnBrand: AppSlate.s900,
    textOnInk: AppSlate.s0,
    borderSubtle: AppSlate.s700,
    borderDefault: AppSlate.s600,
    overlayScrim: Color(0xB30E1B2B), // rgba(14,27,43,0.70) — deeper on dark bg
  );
}

/// Kept as the panel/sheet API every screen already composes with — no
/// longer glass (flat cards + soft shadow now; see widgets/glass_panel.dart)
/// but the tier vocabulary (raised/overlay/modal) still maps sensibly to
/// elevation, so screens didn't need touching to pick up the new look.
enum GlassTier { raised, overlay, modal }

class AppRadius {
  static const xs = 6.0;
  static const sm = 10.0;
  static const md = 14.0;
  static const lg = 18.0;
  static const xl = 24.0;
  static const xl2 = 32.0;
  static const pill = 999.0;

  static const card = xl; // radius-xl
  static const sheet = xl2; // radius-2xl
  static const button = lg; // radius-lg (buttons are control-lg height throughout)
}

class AppSpacing {
  static const space1 = 4.0;
  static const space2 = 8.0;
  static const space3 = 12.0;
  static const space4 = 16.0;
  static const space5 = 20.0;
  static const space6 = 24.0;
  static const space8 = 32.0;
  static const space10 = 40.0;
  static const space12 = 48.0;
  static const space16 = 64.0;
  static const space20 = 80.0;
  static const space24 = 96.0;
}

/// Soft, cool-tinted elevation (rgba of the ink navy, never pure black) —
/// see tokens/effects.css.
class AppShadows {
  static const xs = [BoxShadow(color: Color(0x0F0E1B2B), blurRadius: 2, offset: Offset(0, 1))];
  static const sm = [BoxShadow(color: Color(0x140E1B2B), blurRadius: 6, offset: Offset(0, 2))];
  static const md = [BoxShadow(color: Color(0x1A0E1B2B), blurRadius: 18, offset: Offset(0, 6))];
  static const lg = [BoxShadow(color: Color(0x240E1B2B), blurRadius: 40, offset: Offset(0, 16))];
  static const xl = [BoxShadow(color: Color(0x2E0E1B2B), blurRadius: 64, offset: Offset(0, 28))];

  /// Brand glow — floating action / primary emphasis.
  static const brand = [BoxShadow(color: Color(0x6142C5E1), blurRadius: 28, offset: Offset(0, 10))];

  /// Bottom sheets rising over the map.
  static const sheet = [BoxShadow(color: Color(0x290E1B2B), blurRadius: 32, offset: Offset(0, -8))];
}

class AppMotion {
  static const fast = Duration(milliseconds: 120);
  static const base = Duration(milliseconds: 200);
  static const slow = Duration(milliseconds: 320);
  static const easeOut = Cubic(0.22, 1, 0.36, 1);
  static const easeInOut = Cubic(0.65, 0, 0.35, 1);
  static const spring = Cubic(0.34, 1.56, 0.64, 1); // playful overshoot

  // Existing usages elsewhere in the app; kept for compatibility.
  static const sheet = slow;
  static const morph = base;
  static const pulse = Duration(milliseconds: 1600);
  static const sweep = Duration(milliseconds: 600);
  static const press = fast;
}

/// Sora (display), Plus Jakarta Sans (UI/body), JetBrains Mono (fares, ETAs,
/// codes) — see tokens/typography.css and tokens/fonts.css. Font files are
/// bundled locally (pubspec.yaml `fonts:`), not fetched at runtime.
class AppFonts {
  static const display = 'Sora';
  static const sans = 'Plus Jakarta Sans';
  static const mono = 'JetBrains Mono';
}

class AppTextSizes {
  static const xs2 = 11.0;
  static const xs = 12.0;
  static const sm = 14.0;
  static const base = 16.0;
  static const lg = 18.0;
  static const xl = 20.0;
  static const xl2 = 24.0;
  static const xl3 = 30.0;
  static const xl4 = 38.0;
  static const xl5 = 48.0;
}
