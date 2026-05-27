import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../../core/constants/app_config.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Central HTTP client for all calls to the Next.js backend API.
/// Uses [AppConfig.apiBaseUrl] so the target environment is driven by .env.
class ApiService {
  ApiService._();
  static final ApiService instance = ApiService._();

  static const Duration _timeout = Duration(seconds: 120);

  Map<String, String> get _headers {
    final session = Supabase.instance.client.auth.currentSession;
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (session != null) {
      headers['Authorization'] = 'Bearer ${session.accessToken}';
    }
    return headers;
  }

  // ── Itinerary ──────────────────────────────────────────────────────────────

  /// Sends a streaming itinerary generation request and collects the full body.
  /// Returns the parsed itinerary map, or throws on error.
  Future<Map<String, dynamic>> generateItinerary({
    required String destination,
    required int days,
    required String budget,
    required String style,
    required String travelerType,
    required List<String> interests,
    void Function(String agentName, String status)? onAgentUpdate,
  }) async {
    final uri = Uri.parse(AppConfig.itineraryEndpoint);
    // NOTE: backend schema uses `travelStyle` (not `style`) and requires `transport`
    final body = jsonEncode({
      'destination': destination,
      'days': days,
      'budget': budget,
      'travelStyle': style,        // ← was 'style', backend needs 'travelStyle'
      'travelerType': travelerType,
      'interests': interests,
      'transport': 'public',       // ← required by backend schema
    });

    try {
      final request = http.Request('POST', uri)
        ..headers.addAll(_headers)
        ..body = body;

      final streamedResponse = await request.send().timeout(_timeout);

      // Accumulate all SSE lines; also fire onAgentUpdate for log events
      final buffer = StringBuffer();
      String? pendingEvent;

      await streamedResponse.stream.transform(utf8.decoder).forEach((chunk) {
        buffer.write(chunk);

        if (onAgentUpdate != null) {
          // Parse SSE in the streaming chunk for live agent updates
          for (final line in chunk.split('\n')) {
            final trimmed = line.trim();
            if (trimmed.startsWith('event: ')) {
              pendingEvent = trimmed.substring(7);
            } else if (trimmed.startsWith('data: ') && pendingEvent == 'log') {
              try {
                final eventData =
                    jsonDecode(trimmed.substring(6)) as Map<String, dynamic>;
                if (eventData.containsKey('agent') && eventData.containsKey('status')) {
                  onAgentUpdate(
                    eventData['agent'] as String,
                    eventData['status'] as String,
                  );
                }
              } catch (_) {}
              pendingEvent = null;
            } else if (trimmed.isEmpty) {
              pendingEvent = null;
            }
          }
        }
      });

      final raw = buffer.toString();
      debugPrint('[ApiService] SSE response length: ${raw.length}');

      // Parse the full SSE response to find the result event
      final lines = raw.split('\n');
      String? resultJson;
      String? currentEvent;

      for (final line in lines) {
        final trimmed = line.trim();
        if (trimmed.startsWith('event: ')) {
          currentEvent = trimmed.substring(7);
        } else if (trimmed.startsWith('data: ') && currentEvent == 'result') {
          resultJson = trimmed.substring(6);
          break;
        } else if (trimmed.isEmpty) {
          currentEvent = null;
        }
      }

      if (resultJson == null) {
        // Log a snippet of the raw response to help debug
        debugPrint('[ApiService] Raw SSE snippet: ${raw.length > 500 ? raw.substring(0, 500) : raw}');
        throw Exception('No result event found in itinerary SSE response');
      }

      // The result data has shape: { itinerary: {...}, flights, hotels, agents, ... }
      // We extract the inner `itinerary` object which is what the app needs.
      final dynamic decoded = await compute(jsonDecode, resultJson);
      final resultMap = decoded as Map<String, dynamic>;

      // Check for error event
      if (resultMap.containsKey('message') && !resultMap.containsKey('itinerary')) {
        throw Exception(resultMap['message']);
      }

      // Merge top-level hotels/flights into the itinerary for the detail screen
      final itinerary = Map<String, dynamic>.from(
        resultMap['itinerary'] as Map<String, dynamic>? ?? resultMap,
      );
      if (resultMap.containsKey('hotels') && !itinerary.containsKey('hotelInfo')) {
        itinerary['hotelInfo'] = resultMap['hotels'];
      }
      if (resultMap.containsKey('flights') && !itinerary.containsKey('flightInfo')) {
        itinerary['flightInfo'] = resultMap['flights'];
      }

      return itinerary;
    } catch (e) {
      debugPrint('[ApiService] generateItinerary error: $e');
      rethrow;
    }
  }

  // ── Visa Hub ───────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> checkVisa({
    required String sourceCountry,
    required String destinationCountry,
  }) =>
      _post(AppConfig.visaEndpoint, {
        'source': sourceCountry,
        'destination': destinationCountry,
      });

  Future<Map<String, dynamic>> assessDenialRisk({
    required String nationality,
    required String destination,
    required String employment,
    required String income,
  }) =>
      _post(AppConfig.visaEndpoint, {
        'type': 'denial_risk',
        'profile': {
          'nationality': nationality,
          'destination': destination,
          'employment': employment,
          'income': income,
        },
      });

  Future<Map<String, dynamic>> getPassportStrength(
          String passportCountry) =>
      _post(AppConfig.visaEndpoint, {
        'type': 'passport_power',
        'source': passportCountry,
      });

  Future<Map<String, dynamic>> simplifyVisaRequirements(
          String rawText) =>
      _post(AppConfig.visaEndpoint, {
        'rawText': rawText,
      });

  // ── Travel Intelligence & News ──────────────────────────────────────────────

  Future<Map<String, dynamic>> fetchTravelIntelligence() async {
    try {
      final res = await http.get(Uri.parse('${AppConfig.apiBaseUrl}/api/travel-intelligence'), headers: _headers).timeout(_timeout);
      _checkStatus(res, 'fetchTravelIntelligence');
      final dynamic data = await compute(jsonDecode, res.body);
      return data as Map<String, dynamic>;
    } catch (e) {
      debugPrint('[ApiService] fetchTravelIntelligence error: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getRecommendations({
    required String budget,
    required String month,
    required String interests,
  }) => _post('${AppConfig.apiBaseUrl}/api/travel-recommendation', {
    'budget': budget,
    'month': month,
    'interests': interests,
  });

  Future<Map<String, dynamic>> searchTravelResearch({
    required String destination,
    required String originCity,
    required String startDate,
  }) => _post('${AppConfig.apiBaseUrl}/api/travel-research', {
    'destination': destination,
    'originCity': originCity,
    'startDate': startDate,
    'includeFlights': true,
    'includeHotels': true,
    'adults': 1,
  });

  Future<List<Map<String, dynamic>>> fetchNews({
    String category = 'all',
    int limit = 20,
  }) async {
    final uri = Uri.parse(AppConfig.newsEndpoint)
        .replace(queryParameters: {
      'category': category,
      'limit': limit.toString(),
    });

    try {
      final res =
          await http.get(uri, headers: _headers).timeout(_timeout);
      _checkStatus(res, 'fetchNews');
      final dynamic data = await compute(jsonDecode, res.body);
      if (data is List) {
        return List<Map<String, dynamic>>.from(data);
      }
      if (data is Map && data['articles'] is List) {
        return List<Map<String, dynamic>>.from(
            data['articles'] as List);
      }
      return [];
    } catch (e) {
      debugPrint('[ApiService] fetchNews error: $e');
      rethrow;
    }
  }

  // ── Flights ───────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> searchFlights({
    required String origin,
    required String destination,
    required String departureDate,
    String? returnDate,
    int adults = 1,
  }) =>
      _post(AppConfig.flightsEndpoint, {
        'origin': origin,
        'destination': destination,
        'departureDate': departureDate,
        ...?returnDate != null ? {'returnDate': returnDate} : null,
        'adults': adults,
      });

  // ── Hotels ────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> searchHotels({
    required String cityCode,
    required String checkIn,
    required String checkOut,
    int adults = 1,
  }) =>
      _post(AppConfig.hotelsEndpoint, {
        'cityCode': cityCode,
        'checkIn': checkIn,
        'checkOut': checkOut,
        'adults': adults,
      });

  // ── Private helpers ───────────────────────────────────────────────────────

  Future<Map<String, dynamic>> _post(
      String url, Map<String, dynamic> payload) async {
    try {
      final res = await http
          .post(
            Uri.parse(url),
            headers: _headers,
            body: jsonEncode(payload),
          )
          .timeout(_timeout);
      _checkStatus(res, url);
      final dynamic decoded = await compute(jsonDecode, res.body);
      return decoded as Map<String, dynamic>;
    } catch (e) {
      debugPrint('[ApiService] POST $url error: $e');
      rethrow;
    }
  }

  void _checkStatus(http.Response res, String context) {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(
          '[$context] HTTP ${res.statusCode}: ${res.body}');
    }
  }
}
