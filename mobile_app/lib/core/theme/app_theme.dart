import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // Core palette - "iWillTravel Airy Trust"
  static const surfaceLowest = Color(0xFFffffff);
  static const surfaceLow = Color(0xFFf3f4f6);
  static const surface = Color(0xFFedeef0);
  static const surfaceHigh = Color(0xFFe7e8ea);
  static const surfaceHighest = Color(0xFFe1e2e4);
  static const background = Color(0xFFf8f9fb);
  static const surfaceBright = Color(0xFFf8f9fb);

  // Lines
  static const outlineVariant = Color(0xFFc3c6d6);
  static const outline = Color(0xFF737685);

  // Text
  static const onBackground = Color(0xFF191c1e);
  static const onSurfaceVariant = Color(0xFF434654); 

  // Brand / Accents
  static const primary = Color(0xFF003d9b); // Adventure Blue
  static const primaryContainer = Color(0xFF0052cc);
  static const secondary = Color(0xFF825500); // Golden Horizon
  static const secondaryContainer = Color(0xFFfeaa00);
  static const error = Color(0xFFba1a1a);

  // Functional Accents
  static const emerald = Color(0xFF10b981); // Success
  static const cyan = Color(0xFF22d3ee); // Info
  static const amber = Color(0xFFFFC107); // Warning/Stars
  static const tertiary = Color(0xFF006B5E); // Tertiary Accents

  // Gradients
  static const List<Color> heroGradient = [
    Color(0xFF003d9b),
    Color(0xFF0052cc),
  ];

  static const List<Color> cardGradient = [
    Color(0xFFffffff),
    Color(0xFFf3f4f6),
  ];

  static const List<Color> lightOverlay = [
    Colors.transparent,
    Color(0x33000000),
  ];
}

class AppTheme {
  static ThemeData get light {
    final baseTextTheme = GoogleFonts.interTextTheme(
      ThemeData.light().textTheme,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        primaryContainer: AppColors.primaryContainer,
        secondary: AppColors.secondary,
        secondaryContainer: AppColors.secondaryContainer,
        surface: AppColors.surfaceLowest, // Using white for surfaces
        error: AppColors.error,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: AppColors.onBackground,
        onSurfaceVariant: AppColors.onSurfaceVariant,
        outline: AppColors.outline,
        outlineVariant: AppColors.outlineVariant,
      ),

      textTheme: baseTextTheme.copyWith(
        displayLarge: GoogleFonts.montserrat(
          fontSize: 48,
          fontWeight: FontWeight.w700,
          color: AppColors.onBackground,
          letterSpacing: -0.96,
          height: 1.16, // 56/48
        ),
        displayMedium: GoogleFonts.montserrat(
          fontSize: 36,
          fontWeight: FontWeight.w700,
          color: AppColors.onBackground,
          letterSpacing: -0.72,
          height: 1.22, // 44/36
        ),
        headlineLarge: GoogleFonts.montserrat(
          fontSize: 32,
          fontWeight: FontWeight.w700,
          color: AppColors.onBackground,
          height: 1.25, // 40/32
        ),
        headlineMedium: GoogleFonts.montserrat(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          color: AppColors.onBackground,
          height: 1.33, // 32/24
        ),
        titleLarge: GoogleFonts.montserrat(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: AppColors.onBackground,
        ),
        titleMedium: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: AppColors.onBackground,
        ),
        bodyLarge: GoogleFonts.inter(
          fontSize: 18,
          color: AppColors.onSurfaceVariant,
          height: 1.55, // 28/18
        ),
        bodyMedium: GoogleFonts.inter(
          fontSize: 16,
          color: AppColors.onSurfaceVariant,
          height: 1.5, // 24/16
        ),
        labelLarge: GoogleFonts.inter(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: AppColors.onSurfaceVariant,
          letterSpacing: 0.14, // 0.01em
          height: 1.14, // 16/14
        ),
        labelSmall: GoogleFonts.inter(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: AppColors.onSurfaceVariant,
          letterSpacing: 0.48, // 0.04em
          height: 1.33, // 16/12
        ),
      ),

      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.background,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        foregroundColor: AppColors.onBackground,
      ),

      cardTheme: CardThemeData(
        color: AppColors.surfaceLowest, // White surfaces
        elevation: 1, // Level 1 (Card/Surface)
        shadowColor: AppColors.primary.withValues(alpha: 0.06), // Diffused primary tinted shadow
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16), // rounded-lg
          side: const BorderSide(
            color: Colors.transparent, // No borders, ambient shadows
            width: 0,
          ),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.background, // Clean slate background for inputs
        hintStyle: const TextStyle(color: AppColors.outline),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(
            color: AppColors.outlineVariant,
            width: 1,
          ), 
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(
            color: AppColors.outlineVariant,
            width: 1,
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: AppColors.error, width: 1),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.secondaryContainer, // Golden Horizon for primary CTA
          foregroundColor: const Color(0xFF172B4D), // Dark text for visibility
          elevation: 2,
          shadowColor: AppColors.primary.withValues(alpha: 0.12), // Level 2 shadow
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          textStyle: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.primary, // Adventure Blue
          textStyle: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.surfaceLowest,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.outline,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),

      dividerTheme: const DividerThemeData(
        color: AppColors.surfaceHigh, 
        space: 24,
        thickness: 1,
      ),
    );
  }
}
