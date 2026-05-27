import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shimmer/shimmer.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/models/city_model.dart';

class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  final _supabase = Supabase.instance.client;
  List<City> _cities = [];
  List<City> _filtered = [];
  bool _isLoading = true;
  String _search = '';
  String? _selectedVibe;

  static const _vibes = [
    'All',
    'Hidden Gem',
    'Wonders',
    'Beach',
    'Mountains',
    'Culture',
    'City',
    'Nature',
    'Adventure',
  ];

  @override
  void initState() {
    super.initState();
    _loadCities();
  }

  Future<void> _loadCities() async {
    // Mock data since the 'cities' table does not exist in Supabase
    final mockCities = [
      City(
        id: 'kyoto-jp',
        name: 'Kyoto',
        country: 'Japan',
        description: 'A city of thousands of classical Buddhist temples, gardens, imperial palaces, Shinto shrines and traditional wooden houses.',
        imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600&auto=format&fit=crop',
        lat: 35.0116,
        lng: 135.7681,
        costPerDay: 120.0,
        safetyScore: 95,
        internetSpeed: 150,
        temperature: 18,
        bestFor: 'Culture, History, Food',
        vibes: ['Culture', 'City', 'Nature'],
        bestSeason: ['Spring', 'Autumn'],
      ),
      City(
        id: 'reykjavik-is',
        name: 'Reykjavik',
        country: 'Iceland',
        description: 'The capital of Iceland is known for its striking landscapes, geothermal pools, and the gateway to the Northern Lights.',
        imageUrl: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?q=80&w=600&auto=format&fit=crop',
        lat: 64.1466,
        lng: -21.9426,
        costPerDay: 180.0,
        safetyScore: 98,
        internetSpeed: 120,
        temperature: 5,
        bestFor: 'Adventure, Landscapes',
        vibes: ['Adventure', 'Nature', 'Mountains'],
        bestSeason: ['Summer', 'Winter'],
      ),
      City(
        id: 'petra-jo',
        name: 'Petra',
        country: 'Jordan',
        description: 'A famous archaeological site in Jordan\'s southwestern desert, featuring temples and tombs carved into pink sandstone cliffs. A true hidden gem.',
        imageUrl: 'https://images.unsplash.com/photo-1579606034871-3375c3db066a?q=80&w=600&auto=format&fit=crop',
        lat: 30.3285,
        lng: 35.4444,
        costPerDay: 90.0,
        safetyScore: 85,
        internetSpeed: 30,
        temperature: 25,
        bestFor: 'History, Hidden Gems',
        vibes: ['Culture', 'Adventure', 'Hidden Gem'],
        bestSeason: ['Spring', 'Autumn'],
      ),
      City(
        id: 'salalah-om',
        name: 'Salalah',
        country: 'Oman',
        description: 'A tropical paradise in the Middle East, known for its khareef (monsoon) festival, lush green mountains, and beautiful beaches. The ultimate hidden gem.',
        imageUrl: 'https://images.unsplash.com/photo-1627441113064-2821d30fb286?q=80&w=600&auto=format&fit=crop',
        lat: 17.0151,
        lng: 54.0924,
        costPerDay: 75.0,
        safetyScore: 90,
        internetSpeed: 40,
        temperature: 28,
        bestFor: 'Nature, Seclusion',
        vibes: ['Nature', 'Beach', 'Mountains', 'Hidden Gem'],
        bestSeason: ['Summer', 'Autumn'],
      ),
      City(
        id: 'banff-ca',
        name: 'Banff',
        country: 'Canada',
        description: 'A resort town in the province of Alberta, located within Banff National Park, featuring majestic mountains and hot springs.',
        imageUrl: 'https://images.unsplash.com/photo-1549429402-36d1b22e1cd8?q=80&w=600&auto=format&fit=crop',
        lat: 51.1784,
        lng: -115.5708,
        costPerDay: 160.0,
        safetyScore: 96,
        internetSpeed: 80,
        temperature: -2,
        bestFor: 'Hiking, Skiing, Scenery',
        vibes: ['Mountains', 'Adventure', 'Nature'],
        bestSeason: ['Summer', 'Winter'],
      ),
      City(
        id: 'maldives',
        name: 'Malé & Atolls',
        country: 'Maldives',
        description: 'A tropical nation in the Indian Ocean composed of 26 ring-shaped atolls, which are made up of more than 1,000 coral islands.',
        imageUrl: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=600&auto=format&fit=crop',
        lat: 4.1755,
        lng: 73.5093,
        costPerDay: 300.0,
        safetyScore: 95,
        internetSpeed: 50,
        temperature: 29,
        bestFor: 'Relaxation, Scuba Diving, Honeymoon',
        vibes: ['Beach', 'Nature', 'Romantic'],
        bestSeason: ['Winter', 'Spring'],
      ),
      City(
        id: 'rio-br',
        name: 'Rio de Janeiro',
        country: 'Brazil',
        description: 'A huge seaside city in Brazil, famed for its Copacabana and Ipanema beaches, Christ the Redeemer statue, and Sugarloaf Mountain.',
        imageUrl: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?q=80&w=600&auto=format&fit=crop',
        lat: -22.9068,
        lng: -43.1729,
        costPerDay: 85.0,
        safetyScore: 65,
        internetSpeed: 60,
        temperature: 26,
        bestFor: 'Carnival, Beaches, Culture',
        vibes: ['City', 'Beach', 'Culture'],
        bestSeason: ['Summer', 'Winter'],
      ),
      City(
        id: 'bali-id',
        name: 'Bali',
        country: 'Indonesia',
        description: 'An Indonesian island known for its forested volcanic mountains, iconic rice paddies, beaches and coral reefs.',
        imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=600&auto=format&fit=crop',
        lat: -8.4095,
        lng: 115.1889,
        costPerDay: 60.0,
        safetyScore: 82,
        internetSpeed: 45,
        temperature: 27,
        bestFor: 'Surfing, Yoga, Culture',
        vibes: ['Nature', 'Culture', 'Beach'],
        bestSeason: ['Summer', 'Autumn'],
      ),
      City(
        id: 'machupicchu-pe',
        name: 'Machu Picchu',
        country: 'Peru',
        description: 'An Incan citadel set high in the Andes Mountains, one of the New Seven Wonders of the World.',
        imageUrl: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?q=80&w=600&auto=format&fit=crop',
        lat: -13.1631,
        lng: -72.5450,
        costPerDay: 100.0,
        safetyScore: 80,
        internetSpeed: 20,
        temperature: 15,
        bestFor: 'History, Wonders, Hiking',
        vibes: ['Adventure', 'Mountains', 'Culture'],
        bestSeason: ['Autumn', 'Spring'],
      ),
      City(
        id: 'shirakawago-jp',
        name: 'Shirakawa-go',
        country: 'Japan',
        description: 'A traditional Japanese village showcasing a building style known as gassho-zukuri. A breathtaking hidden gem in winter.',
        imageUrl: 'https://images.unsplash.com/photo-1613143525283-16a7dc1d8828?q=80&w=600&auto=format&fit=crop',
        lat: 36.2576,
        lng: 136.9064,
        costPerDay: 95.0,
        safetyScore: 99,
        internetSpeed: 85,
        temperature: 2,
        bestFor: 'Winter Magic, Photography',
        vibes: ['Nature', 'Hidden Gem', 'Culture'],
        bestSeason: ['Winter', 'Autumn'],
      ),
      City(
        id: 'colosseum-it',
        name: 'Rome',
        country: 'Italy',
        description: 'The capital of Italy and home to the Colosseum, one of the iconic wonders of the world.',
        imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=600&auto=format&fit=crop',
        lat: 41.9028,
        lng: 12.4964,
        costPerDay: 130.0,
        safetyScore: 85,
        internetSpeed: 100,
        temperature: 22,
        bestFor: 'Food, History, Architecture',
        vibes: ['City', 'Culture', 'Wonders'],
        bestSeason: ['Spring', 'Autumn'],
      ),
      City(
        id: 'giethoorn-nl',
        name: 'Giethoorn',
        country: 'Netherlands',
        description: 'Known as the "Venice of the North", a mostly car-free village full of picturesque canals and thatched-roof farmhouses. A lovely hidden gem.',
        imageUrl: 'https://images.unsplash.com/photo-1616057488975-68e1ab6c0cba?q=80&w=600&auto=format&fit=crop',
        lat: 52.7303,
        lng: 6.0792,
        costPerDay: 110.0,
        safetyScore: 98,
        internetSpeed: 150,
        temperature: 14,
        bestFor: 'Boating, Relaxation, Fairy Tale',
        vibes: ['Nature', 'Hidden Gem', 'Romantic'],
        bestSeason: ['Spring', 'Summer'],
      ),
    ];

    if (mounted) {
      setState(() {
        _cities = mockCities;
        _filtered = mockCities;
        _isLoading = false;
      });
    }
  }

  void _filter() {
    setState(() {
      _filtered = _cities.where((c) {
        final matchSearch =
            _search.isEmpty ||
            c.name.toLowerCase().contains(_search.toLowerCase()) ||
            c.country.toLowerCase().contains(_search.toLowerCase());
        final matchVibe =
            _selectedVibe == null ||
            _selectedVibe == 'All' ||
            c.vibes.any(
              (v) => v.toLowerCase().contains(_selectedVibe!.toLowerCase()),
            );
        return matchSearch && matchVibe;
      }).toList();
    });
  }

  void _openPlanTrip({String? cityId, String? cityName}) {
    context.push(
      '/itinerary/new',
      extra: {'cityId': cityId, 'cityName': cityName},
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = _supabase.auth.currentUser;
    final firstName =
        user?.userMetadata?['full_name']?.toString().split(' ').first ??
        user?.email?.split('@').first ??
        'Explorer';

    return Scaffold(
      backgroundColor: AppColors.background,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openPlanTrip(),
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.auto_awesome, color: Colors.white),
        label: Text(
          'Plan Trip',
          style: GoogleFonts.inter(
            color: Colors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      body: CustomScrollView(
        slivers: [
          // Header
          SliverToBoxAdapter(
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Hey, $firstName! ✈️',
                                style: GoogleFonts.inter(
                                  color: AppColors.onSurfaceVariant,
                                  fontSize: 14,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Where to next?',
                                style: Theme.of(
                                  context,
                                ).textTheme.displayMedium,
                              ),
                            ],
                          ),
                        ),
                        GestureDetector(
                          onTap: () => context.go('/profile'),
                          child: Container(
                            width: 46,
                            height: 46,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: const LinearGradient(
                                colors: AppColors.heroGradient,
                              ),
                            ),
                            child: Center(
                              child: Text(
                                firstName[0].toUpperCase(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 18,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ).animate().fadeIn(duration: 400.ms),

                    const SizedBox(height: 20),

                    // Search
                    TextField(
                      onChanged: (v) {
                        _search = v;
                        _filter();
                      },
                      style: const TextStyle(color: AppColors.onBackground),
                      decoration: InputDecoration(
                        hintText: 'Search destinations...',
                        prefixIcon: const Icon(
                          Icons.search,
                          color: AppColors.onSurfaceVariant,
                        ),
                        filled: true,
                        fillColor: AppColors.surfaceLow,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(
                            color: AppColors.surface,
                          ),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(
                            color: AppColors.surface,
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(
                            color: AppColors.primary,
                            width: 2,
                          ),
                        ),
                      ),
                    ).animate(delay: 100.ms).fadeIn().slideY(begin: 0.2),

                    const SizedBox(height: 16),

                    // Vibe filter
                    SizedBox(
                      height: 36,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _vibes.length,
                        separatorBuilder: (context, index) => const SizedBox(width: 8),
                        itemBuilder: (context, i) {
                          final vibe = _vibes[i];
                          final active = (_selectedVibe ?? 'All') == vibe;
                          return GestureDetector(
                            onTap: () {
                              setState(() => _selectedVibe = vibe);
                              _filter();
                            },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: active
                                    ? AppColors.primary
                                    : AppColors.surfaceLow,
                                borderRadius: BorderRadius.circular(50),
                                border: Border.all(
                                  color: active
                                      ? AppColors.primary
                                      : AppColors.surface,
                                ),
                              ),
                              child: Text(
                                vibe,
                                style: TextStyle(
                                  color: active
                                      ? Colors.white
                                      : AppColors.onSurfaceVariant,
                                  fontSize: 13,
                                  fontWeight: active
                                      ? FontWeight.w600
                                      : FontWeight.normal,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ).animate(delay: 200.ms).fadeIn(),

                    const SizedBox(height: 20),
                    Text(
                      '${_filtered.length} destinations',
                      style: GoogleFonts.inter(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ),
          ),

          // Grid
          _isLoading
              ? SliverToBoxAdapter(child: _buildShimmer())
              : _filtered.isEmpty
              ? SliverToBoxAdapter(
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(48.0),
                      child: Column(
                        children: [
                          const Icon(
                            Icons.search_off,
                            size: 56,
                            color: AppColors.surface,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'No destinations found',
                            style: TextStyle(color: AppColors.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              : SliverPadding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 120),
                  sliver: SliverGrid(
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 14,
                          mainAxisSpacing: 14,
                          childAspectRatio: 0.75,
                        ),
                    delegate: SliverChildBuilderDelegate(
                      (ctx, i) =>
                          CityCard(
                                city: _filtered[i],
                                onTap: () => _showCityDetail(_filtered[i]),
                              )
                              .animate(delay: Duration(milliseconds: i * 60))
                              .fadeIn()
                              .slideY(begin: 0.3),
                      childCount: _filtered.length,
                    ),
                  ),
                ),
        ],
      ),
    );
  }

  // Show a bottom sheet with city info + Plan Trip button
  void _showCityDetail(City city) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => _CityDetailSheet(
        city: city,
        onPlanTrip: () {
          Navigator.pop(context);
          _openPlanTrip(cityId: city.id, cityName: city.name);
        },
      ),
    );
  }

  Widget _buildShimmer() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 14,
          mainAxisSpacing: 14,
          childAspectRatio: 0.75,
        ),
        itemCount: 6,
        itemBuilder: (context, index) => Shimmer.fromColors(
          baseColor: AppColors.surfaceLow,
          highlightColor: AppColors.surface,
          child: Container(
            decoration: BoxDecoration(
              color: AppColors.surfaceLow,
              borderRadius: BorderRadius.circular(20),
            ),
          ),
        ),
      ),
    );
  }
}

/// Bottom sheet with city detail + Plan Trip CTA
class _CityDetailSheet extends StatelessWidget {
  final City city;
  final VoidCallback onPlanTrip;

  const _CityDetailSheet({required this.city, required this.onPlanTrip});

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.65,
      minChildSize: 0.4,
      maxChildSize: 0.92,
      builder: (context, ctrl) => Container(
        decoration: const BoxDecoration(
          color: AppColors.surfaceLowest,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: ListView(
          controller: ctrl,
          padding: EdgeInsets.zero,
          children: [
            // Drag handle
            Center(
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Hero image
            ClipRRect(
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(0),
              ),
              child: CachedNetworkImage(
                imageUrl: city.imageUrl,
                height: 200,
                width: double.infinity,
                fit: BoxFit.cover,
                placeholder: (context, url) =>
                    Container(height: 200, color: AppColors.surfaceLow),
                errorWidget: (context, url, error) => Container(
                  height: 200,
                  color: AppColors.surfaceLow,
                  child: const Icon(
                    Icons.image_not_supported_outlined,
                    color: AppColors.surfaceHigh,
                    size: 48,
                  ),
                ),
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              city.name,
                              style: GoogleFonts.outfit(
                                color: AppColors.onBackground,
                                fontSize: 26,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            Text(
                              city.country,
                              style: const TextStyle(
                                color: AppColors.onSurfaceVariant,
                                fontSize: 15,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '\$${city.costPerDay.toInt()}/day',
                            style: GoogleFonts.inter(
                              color: AppColors.emerald,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Text(
                            'avg cost',
                            style: TextStyle(
                              color: AppColors.onSurfaceVariant,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Stats row
                  Row(
                    children: [
                      _StatPill(
                        Icons.shield_outlined,
                        '${city.safetyScore}',
                        'Safety',
                        AppColors.emerald,
                      ),
                      const SizedBox(width: 10),
                      _StatPill(
                        Icons.thermostat_outlined,
                        '${city.temperature}°C',
                        'Temp',
                        AppColors.amber,
                      ),
                      const SizedBox(width: 10),
                      _StatPill(
                        Icons.wifi_outlined,
                        '${city.internetSpeed}',
                        'Wifi',
                        AppColors.primary,
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Description
                  Text(
                    city.description,
                    style: GoogleFonts.inter(
                      color: AppColors.onSurfaceVariant,
                      height: 1.6,
                      fontSize: 13,
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Vibes
                  if (city.vibes.isNotEmpty) ...[
                    Text(
                      'Vibes',
                      style: GoogleFonts.inter(
                        color: AppColors.onBackground,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: city.vibes
                          .map(
                            (v) => Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(50),
                                border: Border.all(
                                  color: AppColors.primary.withValues(
                                    alpha: 0.4,
                                  ),
                                ),
                              ),
                              child: Text(
                                v,
                                style: const TextStyle(
                                  color: AppColors.primary,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                    const SizedBox(height: 20),
                  ],

                  // Best season
                  if (city.bestSeason.isNotEmpty) ...[
                    Text(
                      'Best Season',
                      style: GoogleFonts.inter(
                        color: AppColors.onBackground,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: city.bestSeason
                          .map(
                            (s) => Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.amber.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(50),
                                border: Border.all(
                                  color: AppColors.amber.withValues(alpha: 0.4),
                                ),
                              ),
                              child: Text(
                                s,
                                style: const TextStyle(
                                  color: AppColors.amber,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // Plan Trip button
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton.icon(
                      onPressed: onPlanTrip,
                      icon: const Icon(Icons.auto_awesome, color: Colors.white),
                      label: Text(
                        'Plan Trip to ${city.name}',
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(18),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 20),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatPill extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color color;
  const _StatPill(this.icon, this.value, this.label, this.color);

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: 14,
            ),
          ),
          Text(
            label,
            style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 10),
          ),
        ],
      ),
    ),
  );
}

class CityCard extends StatelessWidget {
  final City city;
  final VoidCallback onTap;

  const CityCard({super.key, required this.city, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          fit: StackFit.expand,
          children: [
            CachedNetworkImage(
              imageUrl: city.imageUrl,
              fit: BoxFit.cover,
              placeholder: (context, url) => Shimmer.fromColors(
                baseColor: AppColors.surfaceLow,
                highlightColor: AppColors.surface,
                child: Container(color: AppColors.surfaceLow),
              ),
              errorWidget: (context, url, error) => Container(
                color: AppColors.surfaceLow,
                child: const Icon(
                  Icons.image_not_supported_outlined,
                  color: AppColors.surfaceHigh,
                ),
              ),
            ),
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.85),
                  ],
                  stops: const [0.3, 1.0],
                ),
              ),
            ),
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (city.vibes.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.8),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          city.vibes.first,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    const SizedBox(height: 6),
                    Text(
                      city.name,
                      style: GoogleFonts.outfit(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 17,
                      ),
                    ),
                    Text(
                      city.country,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.70),
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(
                          Icons.shield_outlined,
                          color: AppColors.emerald,
                          size: 13,
                        ),
                        const SizedBox(width: 3),
                        Text(
                          '${city.safetyScore}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          '\$${city.costPerDay.toInt()}/day',
                          style: const TextStyle(
                            color: AppColors.emerald,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            Positioned.fill(
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: onTap,
                  borderRadius: BorderRadius.circular(20),
                  splashColor: AppColors.primary.withValues(alpha: 0.2),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
