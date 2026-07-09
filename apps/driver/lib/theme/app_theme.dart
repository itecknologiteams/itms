import 'package:flutter/material.dart';
import 'tokens.dart';

/// Flat, generously-rounded cards/sheets (docs/ui-ux.md has been superseded
/// by the "drivver" design system's visual language — see theme/tokens.dart)
/// on a Material 3 base. Primary buttons use ink text on the brand cyan —
/// the system's signature high-contrast move. Driver-mode rules apply
/// throughout (§4): minimum 56dp touch targets, base type 18 for
/// sunlight/vibration legibility — larger than the passenger app's theme.
class AppTheme {
  static ThemeData light = _build(Brightness.light, AppColors.light);
  static ThemeData dark = _build(Brightness.dark, AppColors.dark);

  static ThemeData _build(Brightness brightness, AppColors colors) {
    final scheme = ColorScheme(
      brightness: brightness,
      primary: colors.primary,
      onPrimary: colors.textOnBrand,
      secondary: colors.secondary,
      onSecondary: colors.textOnInk,
      error: colors.danger,
      onError: Colors.white,
      surface: colors.surfaceCard,
      onSurface: colors.textPrimary,
    );
    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: colors.surfacePage,
      fontFamily: AppFonts.sans,
      textTheme: TextTheme(
        bodyLarge: TextStyle(fontFamily: AppFonts.sans, fontSize: 18, fontWeight: FontWeight.w500, color: colors.textPrimary),
        bodyMedium: TextStyle(fontFamily: AppFonts.sans, fontSize: 18, fontWeight: FontWeight.w500, color: colors.textPrimary),
        bodySmall: TextStyle(fontFamily: AppFonts.sans, fontSize: 15, fontWeight: FontWeight.w500, color: colors.textSecondary),
        titleSmall: TextStyle(fontFamily: AppFonts.sans, fontSize: 18, fontWeight: FontWeight.w700, color: colors.textPrimary),
        titleMedium: TextStyle(fontFamily: AppFonts.display, fontSize: 20, fontWeight: FontWeight.w700, color: colors.textPrimary),
        titleLarge: TextStyle(fontFamily: AppFonts.display, fontSize: 26, fontWeight: FontWeight.w800, color: colors.textPrimary, letterSpacing: -0.3),
        headlineSmall: TextStyle(fontFamily: AppFonts.display, fontSize: 24, fontWeight: FontWeight.w700, color: colors.textPrimary),
        displaySmall: TextStyle(fontFamily: AppFonts.display, fontSize: 32, fontWeight: FontWeight.w800, color: colors.textPrimary),
        labelLarge: TextStyle(fontFamily: AppFonts.sans, fontSize: 18, fontWeight: FontWeight.w700, color: colors.textPrimary),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: colors.surfacePage,
        foregroundColor: colors.textPrimary,
        elevation: 0,
        titleTextStyle: TextStyle(
          fontFamily: AppFonts.display,
          fontSize: AppTextSizes.xl,
          fontWeight: FontWeight.w700,
          color: colors.textPrimary,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colors.primary,
          foregroundColor: colors.textOnBrand,
          disabledBackgroundColor: AppSlate.s200,
          disabledForegroundColor: colors.textMuted,
          elevation: 0,
          minimumSize: const Size.fromHeight(56),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.button),
          ),
          textStyle: const TextStyle(
            fontFamily: AppFonts.sans,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.2,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          backgroundColor: colors.surfaceCard,
          foregroundColor: colors.textPrimary,
          side: BorderSide(color: colors.borderDefault, width: 1.5),
          minimumSize: const Size.fromHeight(56),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.button),
          ),
          textStyle: const TextStyle(
            fontFamily: AppFonts.sans,
            fontSize: 18,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.2,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colors.surfaceCard,
        labelStyle: TextStyle(
          fontFamily: AppFonts.sans,
          fontSize: AppTextSizes.sm,
          fontWeight: FontWeight.w600,
          color: colors.textSecondary,
        ),
        hintStyle: TextStyle(color: colors.textMuted),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: colors.borderDefault, width: 1.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: colors.borderDefault, width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: colors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: colors.danger, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.md),
          borderSide: BorderSide(color: colors.danger, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
    );
  }
}
