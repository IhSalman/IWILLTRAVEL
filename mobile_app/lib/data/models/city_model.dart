class City {
  final String id;
  final String name;
  final String country;
  final String description;
  final String imageUrl;
  final double lat;
  final double lng;
  final double costPerDay;
  final int safetyScore;
  final int internetSpeed;
  final int temperature;
  final String bestFor;
  final List<String> vibes;
  final List<String> bestSeason;

  const City({
    required this.id,
    required this.name,
    required this.country,
    required this.description,
    required this.imageUrl,
    required this.lat,
    required this.lng,
    required this.costPerDay,
    required this.safetyScore,
    required this.internetSpeed,
    required this.temperature,
    required this.bestFor,
    required this.vibes,
    required this.bestSeason,
  });

  factory City.fromJson(Map<String, dynamic> json) {
    return City(
      id: json['id'] as String,
      name: json['name'] as String,
      country: json['country'] as String,
      description: json['description'] as String? ?? '',
      imageUrl: json['image_url'] as String? ?? '',
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      costPerDay: (json['cost_per_day'] as num).toDouble(),
      safetyScore: (json['safety_score'] as num).toInt(),
      internetSpeed: (json['internet_speed'] as num?)?.toInt() ?? 0,
      temperature: (json['temperature'] as num?)?.toInt() ?? 20,
      bestFor: json['best_for'] as String? ?? '',
      vibes: List<String>.from(json['vibes'] ?? []),
      bestSeason: List<String>.from(json['best_season'] ?? []),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'country': country,
    'description': description,
    'image_url': imageUrl,
    'lat': lat,
    'lng': lng,
    'cost_per_day': costPerDay,
    'safety_score': safetyScore,
    'internet_speed': internetSpeed,
    'temperature': temperature,
    'best_for': bestFor,
    'vibes': vibes,
    'best_season': bestSeason,
  };
}
