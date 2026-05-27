class FinalItinerary {
  final String title;
  final String overview;
  final String bestTimeToVisit;
  final List<String> whyThisPlan;
  final List<String> travelTips;
  final List<String> localCustoms;
  final List<String> safetyAdvice;
  final List<String> budgetTips;
  final List<FinalDay> days;

  FinalItinerary({
    required this.title,
    required this.overview,
    required this.bestTimeToVisit,
    required this.whyThisPlan,
    required this.travelTips,
    required this.localCustoms,
    required this.safetyAdvice,
    required this.budgetTips,
    required this.days,
  });

  factory FinalItinerary.fromJson(Map<String, dynamic> json) {
    return FinalItinerary(
      title: json['title'] ?? '',
      overview: json['overview'] ?? '',
      bestTimeToVisit: json['bestTimeToVisit'] ?? '',
      whyThisPlan: List<String>.from(json['whyThisPlan'] ?? []),
      travelTips: List<String>.from(json['travelTips'] ?? []),
      localCustoms: List<String>.from(json['localCustoms'] ?? []),
      safetyAdvice: List<String>.from(json['safetyAdvice'] ?? []),
      budgetTips: List<String>.from(json['budgetTips'] ?? []),
      days:
          (json['days'] as List?)?.map((d) => FinalDay.fromJson(d)).toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
    'title': title,
    'overview': overview,
    'bestTimeToVisit': bestTimeToVisit,
    'whyThisPlan': whyThisPlan,
    'travelTips': travelTips,
    'localCustoms': localCustoms,
    'safetyAdvice': safetyAdvice,
    'budgetTips': budgetTips,
    'days': days.map((d) => d.toJson()).toList(),
  };
}

class FinalDay {
  final int day;
  final String theme;
  final String areaFocus;
  final String difficulty;
  final String pace;
  final List<FinalActivity> activities;

  FinalDay({
    required this.day,
    required this.theme,
    required this.areaFocus,
    required this.difficulty,
    required this.pace,
    required this.activities,
  });

  factory FinalDay.fromJson(Map<String, dynamic> json) {
    return FinalDay(
      day: json['day'] ?? 0,
      theme: json['theme'] ?? '',
      areaFocus: json['areaFocus'] ?? '',
      difficulty: json['difficulty'] ?? 'low',
      pace: json['pace'] ?? '',
      activities:
          (json['activities'] as List?)
              ?.map((a) => FinalActivity.fromJson(a))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
    'day': day,
    'theme': theme,
    'areaFocus': areaFocus,
    'difficulty': difficulty,
    'pace': pace,
    'activities': activities.map((a) => a.toJson()).toList(),
  };
}

class FinalActivity {
  final String time;
  final String title;
  final String description;
  final List<String> highlights;
  final String? photoUrl;
  final String editorialSummary;
  final String duration;
  final String cost;
  final String tip;
  final double rating;
  final int totalRatings;
  final String address;
  final String transportNote;

  FinalActivity({
    required this.time,
    required this.title,
    required this.description,
    required this.highlights,
    this.photoUrl,
    required this.editorialSummary,
    required this.duration,
    required this.cost,
    required this.tip,
    required this.rating,
    required this.totalRatings,
    required this.address,
    required this.transportNote,
  });

  factory FinalActivity.fromJson(Map<String, dynamic> json) {
    return FinalActivity(
      time: json['time'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      highlights: List<String>.from(json['highlights'] ?? []),
      photoUrl: json['photoUrl'],
      editorialSummary: json['editorialSummary'] ?? '',
      duration: json['duration'] ?? '',
      cost: json['cost'] ?? '',
      tip: json['tip'] ?? '',
      rating: (json['rating'] ?? 0).toDouble(),
      totalRatings: json['totalRatings'] ?? 0,
      address: json['address'] ?? '',
      transportNote: json['transportNote'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'time': time,
    'title': title,
    'description': description,
    'highlights': highlights,
    'photoUrl': photoUrl,
    'editorialSummary': editorialSummary,
    'duration': duration,
    'cost': cost,
    'tip': tip,
    'rating': rating,
    'totalRatings': totalRatings,
    'address': address,
    'transportNote': transportNote,
  };
}
