import 'dart:developer';
import 'dart:io';
import 'package:supabase/supabase.dart';

Future<void> main() async {
  final webEnvFile = File('../.env.local');
  String? url;
  String? key;

  if (webEnvFile.existsSync()) {
    final lines = webEnvFile.readAsLinesSync();
    for (final line in lines) {
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        url = line.split('=')[1].trim().replaceAll('"', '').replaceAll("'", '');
      }
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
        key = line.split('=')[1].trim().replaceAll('"', '').replaceAll("'", '');
      }
    }
  }

  if (url == null || key == null) {
    log('Could not find Supabase credentials in .env.local');
    return;
  }

  final client = SupabaseClient(url, key);

  try {
    final response = await client
        .from('itineraries')
        .select()
        .limit(1)
        .order('created_at', ascending: false);

    for (final row in response) {
      log('--- ID: ${row["id"]} ---');
      final content = row['content'];
      if (content is Map) {
        if (content.containsKey('itinerary')) {
          log(
            'itinerary keys: ${(content["itinerary"] as Map).keys.toList()}',
          );
          if ((content['itinerary'] as Map).containsKey('days')) {
            final days = (content['itinerary'] as Map)['days'];
            log('days type: ${days.runtimeType}');
            if (days is List && days.isNotEmpty) {
              log('First day keys: ${(days[0] as Map).keys.toList()}');
            }
          }
        }
      }
    }
  } catch (e, st) {
    log('test_db error', error: e, stackTrace: st);
  }
}
