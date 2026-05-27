import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Central configuration loaded from the .env file.
/// All API keys and environment-specific URLs live here.
class AppConfig {
  AppConfig._(); // prevent instantiation

  // ── Supabase ───────────────────────────────────────────────────────────────
  static String get supabaseUrl =>
      dotenv.env['SUPABASE_URL'] ?? '';

  static String get supabaseAnonKey =>
      dotenv.env['SUPABASE_ANON_KEY'] ?? '';

  // ── Google APIs ───────────────────────────────────────────────────────────
  static String get googlePlacesApiKey =>
      dotenv.env['GOOGLE_PLACES_API_KEY'] ?? '';

  static String get googleMapsApiKey =>
      dotenv.env['GOOGLE_MAPS_API_KEY'] ?? '';

  static String get geminiApiKey =>
      dotenv.env['GEMINI_API_KEY'] ?? '';

  // ── Backend (Next.js) API ─────────────────────────────────────────────────
  /// Base URL of the Next.js backend.
  /// • Android emulator → http://10.0.2.2:3000
  /// • iOS simulator    → http://localhost:3000
  /// • Production       → https://your-app.vercel.app
  static String get apiBaseUrl =>
      dotenv.env['API_BASE_URL'] ?? 'http://10.0.2.2:3000';

  // Convenience endpoint getters
  static String get itineraryEndpoint => '$apiBaseUrl/api/agent-itinerary';
  static String get visaEndpoint      => '$apiBaseUrl/api/visa';
  static String get newsEndpoint      => '$apiBaseUrl/api/travel-news';
  static String get flightsEndpoint   => '$apiBaseUrl/api/flights';
  static String get hotelsEndpoint    => '$apiBaseUrl/api/hotels';

  // ── Amadeus (Flights) ─────────────────────────────────────────────────────
  static String get amadeusClientId =>
      dotenv.env['AMADEUS_CLIENT_ID'] ?? '';

  static String get amadeusClientSecret =>
      dotenv.env['AMADEUS_CLIENT_SECRET'] ?? '';

  // ── Apify (News scraping) ─────────────────────────────────────────────────
  static String get apifyApiKey =>
      dotenv.env['APIFY_API_KEY'] ?? '';

  // ── Affiliate ─────────────────────────────────────────────────────────────
  static String get travelpayoutsMarker =>
      dotenv.env['TRAVELPAYOUTS_MARKER'] ?? '';

  // ── Debug helper ──────────────────────────────────────────────────────────
  static void debugPrintConfig() {
    assert(() {
      // Only runs in debug mode
      debugPrint('──── AppConfig ────');
      debugPrint('Supabase URL     : $supabaseUrl');
      debugPrint('API Base URL     : $apiBaseUrl');
      debugPrint('Places key set?  : ${googlePlacesApiKey.isNotEmpty}');
      debugPrint('Gemini key set?  : ${geminiApiKey.isNotEmpty}');
      debugPrint('Amadeus ID set?  : ${amadeusClientId.isNotEmpty}');
      debugPrint('───────────────────');
      return true;
    }());
  }
}
