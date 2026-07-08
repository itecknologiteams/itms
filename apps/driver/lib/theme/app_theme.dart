import 'package:flutter/material.dart';
import 'tokens.dart';

/// Solid (non-glass) app chrome — full-screen forms, dense lists — uses
/// Material 3 as the base layer; glass is the differentiating skin applied
/// only to floating elements (docs/ui-ux.md §1.2). Driver-mode rules apply
/// throughout (§4): minimum 56dp touch targets, base type 18 for
/// sunlight/vibration legibility — larger than the passenger app's theme.
class AppTheme {
  static ThemeData light = _build(Brightness.light, AppColors.light);
  static ThemeData dark = _build(Brightness.dark, AppColors.dark);

  static ThemeData _build(Brightness brightness, AppColors colors) {
    final scheme = ColorScheme(
      brightness: brightness,
      primary: colors.primary,
      onPrimary: brightness == Brightness.light ? Colors.white : Colors.black,
      secondary: colors.secondary,
      onSecondary: brightness == Brightness.light ? Colors.white : Colors.black,
      error: colors.danger,
      onError: Colors.white,
      surface: colors.surfaceSolid,
      onSurface: colors.onGlassText,
    );
    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: colors.surfaceSolid,
      fontFamily: 'Roboto',
      textTheme: const TextTheme(
        bodyLarge: TextStyle(fontSize: 18),
        bodyMedium: TextStyle(fontSize: 18),
        titleMedium: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
        titleLarge: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: colors.surfaceSolid,
        foregroundColor: colors.onGlassText,
        elevation: 0,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colors.primary,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(56),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.button),
          ),
          textStyle: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: brightness == Brightness.light
            ? Colors.white.withOpacity(0.7)
            : Colors.white.withOpacity(0.06),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadius.button),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      ),
    );
  }
}
