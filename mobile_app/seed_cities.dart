import 'dart:convert';
import 'dart:io';

const url = 'https://gupnphrvbgkrftgwhuvf.supabase.co/rest/v1/cities';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1cG5waHJ2YmdrcmZ0Z3dodXZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMjc0MjIsImV4cCI6MjA4NzgwMzQyMn0.h5Ah9CkivkMA7ZKsRoDnDUGHpBS3C2ZXsTz5NuQqfXc';

void main() async {
  final List<Map<String, dynamic>> cities = [
    {
      'id': 'kyoto-jp',
      'name': 'Kyoto',
      'country': 'Japan',
      'description': 'A city of thousands of classical Buddhist temples, gardens, imperial palaces, Shinto shrines and traditional wooden houses.',
      'image_url': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e',
      'lat': 35.0116,
      'lng': 135.7681,
      'cost_per_day': 120.0,
      'safety_score': 95,
      'internet_speed': 150,
      'temperature': 18,
      'best_for': 'Culture, History, Food',
      'vibes': ['Culture', 'City', 'Nature'],
      'best_season': ['Spring', 'Autumn']
    },
    {
      'id': 'reykjavik-is',
      'name': 'Reykjavik',
      'country': 'Iceland',
      'description': 'The capital of Iceland is known for its striking landscapes, geothermal pools, and the gateway to the Northern Lights.',
      'image_url': 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb',
      'lat': 64.1466,
      'lng': -21.9426,
      'cost_per_day': 180.0,
      'safety_score': 98,
      'internet_speed': 120,
      'temperature': 5,
      'best_for': 'Adventure, Landscapes',
      'vibes': ['Adventure', 'Nature', 'Mountains'],
      'best_season': ['Summer', 'Winter']
    },
    {
      'id': 'petra-jo',
      'name': 'Petra',
      'country': 'Jordan',
      'description': 'A famous archaeological site in Jordan\'s southwestern desert, featuring temples and tombs carved into pink sandstone cliffs.',
      'image_url': 'https://images.unsplash.com/photo-1579606034871-3375c3db066a',
      'lat': 30.3285,
      'lng': 35.4444,
      'cost_per_day': 90.0,
      'safety_score': 85,
      'internet_speed': 30,
      'temperature': 25,
      'best_for': 'History, Hidden Gems',
      'vibes': ['Culture', 'Adventure'],
      'best_season': ['Spring', 'Autumn']
    },
    {
      'id': 'salalah-om',
      'name': 'Salalah',
      'country': 'Oman',
      'description': 'A tropical paradise in the Middle East, known for its khareef (monsoon) festival, lush green mountains, and beautiful beaches. A true hidden gem.',
      'image_url': 'https://images.unsplash.com/photo-1627441113064-2821d30fb286',
      'lat': 17.0151,
      'lng': 54.0924,
      'cost_per_day': 75.0,
      'safety_score': 90,
      'internet_speed': 40,
      'temperature': 28,
      'best_for': 'Nature, Seclusion',
      'vibes': ['Nature', 'Beach', 'Mountains'],
      'best_season': ['Summer', 'Autumn']
    },
    {
      'id': 'banff-ca',
      'name': 'Banff',
      'country': 'Canada',
      'description': 'A resort town in the province of Alberta, located within Banff National Park, featuring majestic mountains and hot springs.',
      'image_url': 'https://images.unsplash.com/photo-1549429402-36d1b22e1cd8',
      'lat': 51.1784,
      'lng': -115.5708,
      'cost_per_day': 160.0,
      'safety_score': 96,
      'internet_speed': 80,
      'temperature': -2,
      'best_for': 'Hiking, Skiing, Scenery',
      'vibes': ['Mountains', 'Adventure', 'Nature'],
      'best_season': ['Summer', 'Winter']
    }
  ];

  final client = HttpClient();

  try {
    for (var city in cities) {
      final request = await client.postUrl(Uri.parse(url));
      request.headers.add('apikey', anonKey);
      request.headers.add('Authorization', 'Bearer $anonKey');
      request.headers.add('Content-Type', 'application/json');
      // Use UPSERT
      request.headers.add('Prefer', 'resolution=merge-duplicates');
      
      request.write(jsonEncode(city));
      final response = await request.close();
      
      final responseBody = await response.transform(utf8.decoder).join();
      if (response.statusCode >= 200 && response.statusCode < 300) {
        print("Successfully inserted: ${city['name']}");
      } else {
        print("Failed to insert ${city['name']}: ${response.statusCode} $responseBody");
      }
    }
  } finally {
    client.close();
  }
}
