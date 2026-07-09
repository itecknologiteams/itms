import 'package:flutter/material.dart';
import 'tokens.dart';

/// Flat, generously-rounded cards/sheets (docs/ui-ux.md has been superseded
/// by the "drivver" design system's visual language — see theme/tokens.dart)
/// on a Material 3 base. Primary buttons use ink text on the brand cyan —
/// the system's signature high-contrast move.
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
    final baseTextTheme = _textTheme(colors);
    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: colors.surfacePage,
      fontFamily: AppFonts.sans,
      textTheme: baseTextTheme,
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
            fontSize: AppTextSizes.base,
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
            fontSize: AppTextSizes.base,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.2,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: colors.primaryPress,
          textStyle: const TextStyle(fontFamily: AppFonts.sans, fontWeight: FontWeight.w700),
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

  static TextTheme _textTheme(AppColors colors) {
    TextStyle display(double size, FontWeight weight, {double letterSpacing = -0.4}) => TextStyle(
          fontFamily: AppFonts.display,
          fontSize: size,
          fontWeight: weight,
          letterSpacing: letterSpacing,
          color: colors.textPrimary,
        );
    TextStyle sans(double size, FontWeight weight) => TextStyle(
          fontFamily: AppFonts.sans,
          fontSize: size,
          fontWeight: weight,
          color: colors.textPrimary,
        );
    return TextTheme(
      displayLarge: display(AppTextSizes.xl5, FontWeight.w800),
      displayMedium: display(AppTextSizes.xl4, FontWeight.w800),
      displaySmall: display(AppTextSizes.xl3, FontWeight.w800), // big fare numerals
      headlineLarge: display(AppTextSizes.xl4, FontWeight.w800),
      headlineMedium: display(AppTextSizes.xl3, FontWeight.w700),
      headlineSmall: display(AppTextSizes.xl2, FontWeight.w700),
      titleLarge: display(AppTextSizes.xl2, FontWeight.w700, letterSpacing: -0.3),
      titleMedium: display(AppTextSizes.xl, FontWeight.w700),
      titleSmall: sans(AppTextSizes.base, FontWeight.w700),
      bodyLarge: sans(AppTextSizes.base, FontWeight.w500),
      bodyMedium: sans(AppTextSizes.sm, FontWeight.w500),
      bodySmall: sans(AppTextSizes.xs, FontWeight.w500),
      labelLarge: sans(AppTextSizes.base, FontWeight.w700),
      labelMedium: sans(AppTextSizes.sm, FontWeight.w700),
      labelSmall: sans(AppTextSizes.xs, FontWeight.w700),
    );
  }
}
