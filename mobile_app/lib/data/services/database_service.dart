import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/city_model.dart';

class DatabaseService {
  final _supabase = Supabase.instance.client;

  Future<List<City>> getCities() async {
    try {
      final response = await _supabase
          .from('cities')
          .select()
          .order('name', ascending: true);

      return (response as List).map((json) => City.fromJson(json)).toList();
    } catch (e) {
      debugPrint('Error fetching cities: $e');
      return [];
    }
  }

  Future<List<Map<String, dynamic>>> getUserItineraries(String userId) async {
    try {
      final response = await _supabase
          .from('itineraries')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false);

      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      debugPrint('Error fetching discover data: $e');
      return [];
    }
  }

  Future<void> saveItinerary({
    required String userId,
    required String cityId,
    required String title,
    required Map<String, dynamic> content,
  }) async {
    await _supabase.from('itineraries').insert({
      'user_id': userId,
      'city_id': cityId,
      'title': title,
      'content': content,
      'status': 'planned',
    });
  }
}
