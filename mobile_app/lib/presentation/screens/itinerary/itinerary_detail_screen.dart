import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shimmer/shimmer.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../../core/theme/app_theme.dart';

class ItineraryDetailScreen extends StatefulWidget {
  final String id;
  const ItineraryDetailScreen({super.key, required this.id});

  @override
  State<ItineraryDetailScreen> createState() => _ItineraryDetailScreenState();
}

class _ItineraryDetailScreenState extends State<ItineraryDetailScreen>
    with SingleTickerProviderStateMixin {
  final _supabase = Supabase.instance.client;
  Map<String, dynamic>? _row; // full DB row
  Map<String, dynamic>? _content; // row['content'] — the FinalItinerary JSON
  bool _isLoading = true;
  String? _error;
  late TabController _tab;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 4, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final res = await _supabase
          .from('itineraries')
          .select()
          .eq('id', widget.id)
          .single();

      if (mounted) {
        // content can be stored as Map or as a JSON string (handle both)
        dynamic rawContent = res['content'];
        Map<String, dynamic>? content;
        if (rawContent is Map) {
          content = Map<String, dynamic>.from(rawContent);
        } else if (rawContent is String) {
          try {
            final decoded = await compute(jsonDecode, rawContent);
            content = Map<String, dynamic>.from(decoded);
          } catch (_) {}
        }

        // Website saves { hotels, flights, itinerary, ... }
        // Mobile saves { title, overview, days, ... } directly
        if (content != null && content.containsKey('itinerary')) {
          final itin = content['itinerary'];
          if (itin is Map) {
            // Merge hotels/flights into the itinerary object if they exist at the root
            if (content.containsKey('hotels') &&
                !itin.containsKey('hotelInfo')) {
              itin['hotelInfo'] = content['hotels'];
            }
            if (content.containsKey('flights') &&
                !itin.containsKey('flightInfo')) {
              itin['flightInfo'] = content['flights'];
            }
            content = Map<String, dynamic>.from(itin);
          }
        }

        setState(() {
          _row = res;
          _content = content;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    if (_error != null || _row == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(backgroundColor: AppColors.background),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.error_outline,
                  color: AppColors.error,
                  size: 48,
                ),
                const SizedBox(height: 16),
                Text(
                  'Could not load itinerary',
                  style: GoogleFonts.outfit(color: AppColors.onBackground, fontSize: 18),
                ),
                const SizedBox(height: 8),
                Text(
                  _error ?? 'Not found',
                  style: const TextStyle(color: AppColors.onSurfaceVariant),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => context.go('/saved'),
                  child: const Text('Back to Saved'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final days = _safeList(_content?['days']);
    final title = _content?['title'] ?? _row!['title'] ?? 'My Itinerary';
    final overview = _content?['overview']?.toString() ?? '';
    final travelTips = _safeList(_content?['travelTips']);
    final localCustoms = _safeList(_content?['localCustoms']);
    final safetyAdvice = _safeList(_content?['safetyAdvice']);
    final budgetTips = _safeList(_content?['budgetTips']);
    final budgetBreakdown = _content?['budgetBreakdown'];
    final flightInfo = _content?['flightInfo'];
    final hotelInfo = _safeList(_content?['hotelInfo']);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.surfaceLowest,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.surfaceLow,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.arrow_back_ios_new, size: 16),
          ),
          onPressed: () => context.pop(),
        ),
        title: Text(
          title,
          style: GoogleFonts.outfit(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppColors.onBackground,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        bottom: TabBar(
          controller: _tab,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          indicatorColor: AppColors.primary,
          labelColor: Colors.white,
          unselectedLabelColor: AppColors.onSurfaceVariant,
          labelStyle: GoogleFonts.outfit(fontWeight: FontWeight.w600, letterSpacing: 1.1),
          unselectedLabelStyle: GoogleFonts.outfit(fontWeight: FontWeight.w500),
          tabs: const [
            Tab(text: 'ITINERARY'),
            Tab(text: 'ROADMAP'),
            Tab(text: 'INFO'),
            Tab(text: 'BUDGET'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tab,
        children: [
          // TAB 1: Days
          _buildDaysTab(days, overview, travelTips),
          // TAB 2: Roadmap Map
          _buildRoadmapTab(days),
          // TAB 3: Info (tips, customs, safety, hotels, flights)
          _buildInfoTab(localCustoms, safetyAdvice, hotelInfo, flightInfo),
          // TAB 4: Budget
          _buildBudgetTab(budgetBreakdown, budgetTips),
        ],
      ),
    );
  }

  Widget _buildRoadmapTab(List days) {
    if (days.isEmpty) {
      return const Center(
        child: Text(
          'No roadmap data available',
          style: TextStyle(color: AppColors.onSurfaceVariant),
        ),
      );
    }

    List<Marker> markers = [];
    List<LatLng> polylinePoints = [];

    for (int d = 0; d < days.length; d++) {
      final day = Map<String, dynamic>.from(days[d] ?? {});
      final activities = _safeList(day['activities']);
      for (int a = 0; a < activities.length; a++) {
        final act = activities[a];
        if (act is Map && act['lat'] != null && act['lng'] != null) {
          try {
            final lat = double.parse(act['lat'].toString());
            final lng = double.parse(act['lng'].toString());
            final point = LatLng(lat, lng);
            polylinePoints.add(point);
            markers.add(
              Marker(
                point: point,
                width: 40,
                height: 40,
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: AppColors.primary,
                        shape: BoxShape.circle,
                      ),
                      child: Text('${d + 1}',
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                    const Icon(Icons.location_on, color: AppColors.error, size: 20),
                  ],
                ),
              ),
            );
          } catch (_) {}
        }
      }
    }

    if (markers.isEmpty) {
      return _buildRoadmapListTab(days);
    }

    final bounds = LatLngBounds.fromPoints(polylinePoints);

    return FlutterMap(
      options: MapOptions(
        initialCameraFit: CameraFit.bounds(bounds: bounds, padding: const EdgeInsets.all(50)),
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.wanderplan.wanderplan_mobile',
        ),
        PolylineLayer(
          polylines: [
            Polyline(points: polylinePoints, color: AppColors.primary, strokeWidth: 3.0),
          ],
        ),
        MarkerLayer(markers: markers),
      ],
    );
  }

  Widget _buildRoadmapListTab(List days) {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      itemCount: days.length,
      itemBuilder: (context, i) {
        final day = Map<String, dynamic>.from(days[i] ?? {});
        final activities = _safeList(day['activities']);
        final dayNum = day['day'] ?? (i + 1);
        final isLast = i == days.length - 1;

        return IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Timeline Column
              SizedBox(
                width: 40,
                child: Column(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(colors: AppColors.heroGradient),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          '$dayNum',
                          style: const TextStyle(
                            color: AppColors.onBackground,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ),
                    ),
                    if (!isLast)
                      Expanded(
                        child: Container(
                          width: 2,
                          color: AppColors.primary.withValues(alpha: 0.3),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              // Content Column
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 8),
                    Text(
                      day['theme']?.toString() ?? 'Day $dayNum',
                      style: GoogleFonts.outfit(
                        color: AppColors.onBackground,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if ((day['areaFocus']?.toString() ?? '').isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(Icons.location_on_outlined, size: 14, color: AppColors.primary),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              day['areaFocus'].toString(),
                              style: const TextStyle(color: AppColors.primary, fontSize: 13, fontWeight: FontWeight.w500),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 16),
                    ...activities.map((a) {
                      final act = a is Map ? Map<String, dynamic>.from(a) : {};
                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLow,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.surface),
                        ),
                        child: Row(
                          children: [
                            if ((act['time']?.toString() ?? '').isNotEmpty) ...[
                              Text(
                                act['time'].toString(),
                                style: const TextStyle(
                                  color: AppColors.onSurfaceVariant,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Container(width: 1, height: 24, color: AppColors.surfaceHigh),
                              const SizedBox(width: 12),
                            ],
                            Expanded(
                              child: Text(
                                act['title']?.toString() ?? 'Activity',
                                style: const TextStyle(
                                  color: AppColors.onBackground,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ],
          ),
        ).animate().fadeIn(delay: Duration(milliseconds: i * 100)).slideX(begin: 0.1);
      },
    );
  }

  Widget _buildDaysTab(List days, String overview, List travelTips) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: CustomScrollView(
        slivers: [
        SliverToBoxAdapter(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Meta badges
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _badge(
                    '${_row!['days'] ?? days.length} days',
                    Icons.calendar_today_outlined,
                    AppColors.primary,
                  ),
                  if (_row!['budget'] != null)
                    _badge(
                      _row!['budget'],
                      Icons.account_balance_wallet_outlined,
                      AppColors.emerald,
                    ),
                  if (_row!['travel_style'] != null)
                    _badge(
                      _row!['travel_style'],
                      Icons.style_outlined,
                      AppColors.amber,
                    ),
                ],
              ).animate().fadeIn(),
              const SizedBox(height: 16),

              // Overview
              if (overview.isNotEmpty) ...[
                _sectionTitle('Overview'),
                const SizedBox(height: 8),
                Text(
                  overview,
                  style: GoogleFonts.outfit(color: AppColors.onSurfaceVariant, height: 1.6),
                ),
                const SizedBox(height: 20),
              ],

              // Travel tips preview
              if (travelTips.isNotEmpty) ...[
                _sectionTitle('✈️ Travel Tips'),
                const SizedBox(height: 8),
                ...travelTips
                    .take(3)
                    .map(
                      (tip) => _tipCard(
                        tip.toString(),
                        Icons.tips_and_updates_outlined,
                        AppColors.amber,
                      ),
                    ),
                const SizedBox(height: 20),
              ],

              _sectionTitle('🗓️ Day-by-Day Plan'),
              const SizedBox(height: 12),

              if (days.isEmpty)
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLow,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      const Icon(
                        Icons.info_outline,
                        color: AppColors.onSurfaceVariant,
                        size: 32,
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'No day data found in this itinerary.\nIt may have been generated with an older format.',
                        style: TextStyle(color: AppColors.onSurfaceVariant),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),

        if (days.isNotEmpty)
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                return DayCard(
                  day: Map<String, dynamic>.from(days[index] ?? {}),
                  index: index,
                )
                .animate(delay: Duration(milliseconds: index * 100))
                .fadeIn()
                .slideY(begin: 0.3);
              },
              childCount: days.length,
            ),
          ),

        const SliverToBoxAdapter(child: SizedBox(height: 80)),
      ],
    ),
  );
}

  Widget _buildInfoTab(
    List localCustoms,
    List safetyAdvice,
    List hotelInfo,
    dynamic flightInfo,
  ) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (localCustoms.isNotEmpty) ...[
          _sectionTitle('🎌 Local Customs'),
          const SizedBox(height: 8),
          ...localCustoms.map(
            (c) =>
                _tipCard(c.toString(), Icons.public_outlined, AppColors.primary),
          ),
          const SizedBox(height: 20),
        ],
        if (safetyAdvice.isNotEmpty) ...[
          _sectionTitle('🛡️ Safety'),
          const SizedBox(height: 8),
          ...safetyAdvice.map(
            (s) =>
                _tipCard(s.toString(), Icons.security_outlined, AppColors.error),
          ),
          const SizedBox(height: 20),
        ],
        if (hotelInfo.isNotEmpty) ...[
          _sectionTitle('🏨 Hotels'),
          const SizedBox(height: 8),
          ...hotelInfo.map((h) {
            final hotel = h as Map<String, dynamic>? ?? {};
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.surfaceLowest,
                borderRadius: BorderRadius.circular(28),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
                border: Border.all(color: AppColors.surface),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.emerald.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.hotel_rounded,
                      color: AppColors.emerald,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          hotel['name']?.toString() ?? '',
                          style: const TextStyle(
                            color: AppColors.onBackground,
                            fontWeight: FontWeight.bold,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          '${hotel['city'] ?? ''} · \$${hotel['price'] ?? ''}/night',
                          style: const TextStyle(
                            color: AppColors.onSurfaceVariant,
                            fontSize: 12,
                          ),
                        ),
                        if (hotel['rating'] != null)
                          Row(
                            children: [
                              const Icon(
                                Icons.star_rounded,
                                color: AppColors.amber,
                                size: 13,
                              ),
                              Text(
                                ' ${hotel['rating']}',
                                style: const TextStyle(
                                  color: AppColors.amber,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }),
          const SizedBox(height: 20),
        ],
        if (flightInfo != null) ...[
          _sectionTitle('✈️ Flights'),
          const SizedBox(height: 8),
          _tipCard(
            flightInfo.toString(),
            Icons.flight_outlined,
            AppColors.cyan,
          ),
        ],
        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildBudgetTab(dynamic budgetBreakdown, List budgetTips) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (budgetBreakdown != null) ...[
          _sectionTitle('💰 Budget Breakdown'),
          const SizedBox(height: 16),
          _buildBudgetCard(budgetBreakdown),
          const SizedBox(height: 24),
        ] else ...[
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.surfaceLow,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Text(
              'No budget breakdown available.',
              style: TextStyle(color: AppColors.onSurfaceVariant),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 20),
        ],
        if (budgetTips.isNotEmpty) ...[
          _sectionTitle('💡 Budget Tips'),
          const SizedBox(height: 12),
          ...budgetTips.map(
            (t) => _tipCard(
              t.toString(),
              Icons.savings_outlined,
              AppColors.emerald,
            ),
          ),
        ],
        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildBudgetCard(dynamic breakdown) {
    if (breakdown == null) return const SizedBox();

    List<Map<String, dynamic>> items = [];
    dynamic total;
    dynamic perDay;

    if (breakdown is String) {
      try {
        final decoded = jsonDecode(breakdown);
        if (decoded is Map || decoded is List) {
          breakdown = decoded;
        }
      } catch (_) {}
    }

    if (breakdown is List) {
      for (var item in breakdown) {
        if (item is Map) {
          items.add({
            'category': item['category']?.toString() ?? 'Other',
            'amount': item['amount']?.toString() ?? item['cost']?.toString() ?? '',
          });
        }
      }
    } else if (breakdown is Map) {
      final map = Map<String, dynamic>.from(breakdown);
      total = map['total'] ?? map['estimatedTotal'] ?? map['totalCost'];
      perDay = map['perDay'] ?? map['dailyAverage'];
      
      if (map['breakdown'] is List) {
        for (var item in map['breakdown']) {
          if (item is Map) {
            items.add({
              'category': item['category']?.toString() ?? 'Other',
              'amount': item['amount']?.toString() ?? item['cost']?.toString() ?? '',
            });
          }
        }
      } else {
        final entries = map.entries.where((e) => e.value != null && e.key != 'total' && e.key != 'currency' && e.key != 'perDay' && e.key != 'estimatedTotal' && e.key != 'totalCost' && e.key != 'dailyAverage').toList();
        for (var entry in entries) {
          items.add({
            'category': _toLabel(entry.key),
            'amount': entry.value.toString(),
          });
        }
      }
    }

    if (total == null && items.isEmpty) {
      return Text(
        breakdown.toString(),
        style: const TextStyle(color: AppColors.onSurfaceVariant),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (total != null)
          Container(
            margin: const EdgeInsets.only(bottom: 24),
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: AppColors.surfaceLow,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.surface, width: 1),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('ESTIMATED TOTAL', style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
                const SizedBox(height: 12),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    '$total',
                    style: GoogleFonts.outfit(color: AppColors.onBackground, fontSize: 48, fontWeight: FontWeight.w600, letterSpacing: -1),
                  ),
                ),
                if (perDay != null) ...[
                  const SizedBox(height: 8),
                  Text('~ $perDay per day', style: GoogleFonts.outfit(color: AppColors.onSurfaceVariant, fontSize: 14)),
                ],
              ],
            ),
          ),
        
        if (items.isNotEmpty)
          ...items.map((item) {
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.surface.withValues(alpha: 0.5), width: 1),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: const BoxDecoration(
                      color: AppColors.surfaceLow,
                      shape: BoxShape.circle,
                    ),
                    child: _getBudgetIcon(item['category']!),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      item['category']!,
                      style: GoogleFonts.outfit(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Flexible(
                    child: Text(
                      item['amount']!,
                      textAlign: TextAlign.right,
                      style: GoogleFonts.outfit(
                        color: AppColors.onBackground,
                        fontWeight: FontWeight.w600,
                        fontSize: 18,
                      ),
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
      ],
    );
  }

  Icon _getBudgetIcon(String key) {
    switch (key.toLowerCase()) {
      case 'accommodation': return const Icon(Icons.hotel_outlined, color: AppColors.primary, size: 20);
      case 'food': return const Icon(Icons.restaurant_outlined, color: AppColors.primary, size: 20);
      case 'transport': return const Icon(Icons.directions_car_outlined, color: AppColors.primary, size: 20);
      case 'activities': return const Icon(Icons.local_activity_outlined, color: AppColors.primary, size: 20);
      case 'flights': return const Icon(Icons.flight_outlined, color: AppColors.primary, size: 20);
      default: return const Icon(Icons.attach_money_outlined, color: AppColors.primary, size: 20);
    }
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  List _safeList(dynamic v) => v is List ? v : [];

  Widget _badge(String text, IconData icon, Color color) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: color.withValues(alpha: 0.2)),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color, size: 14),
        const SizedBox(width: 6),
        Text(
          text,
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.w600,
            fontSize: 12,
          ),
        ),
      ],
    ),
  );

  Widget _sectionTitle(String t) => Text(
    t,
    style: GoogleFonts.outfit(
      color: AppColors.onBackground,
      fontWeight: FontWeight.w800,
      fontSize: 16,
    ),
  );

  Widget _tipCard(String text, IconData icon, Color color) => Container(
    margin: const EdgeInsets.only(bottom: 12),
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: AppColors.surfaceLowest,
      borderRadius: BorderRadius.circular(24),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.02),
          blurRadius: 10,
          offset: const Offset(0, 5),
        ),
      ],
      border: Border.all(color: AppColors.surface),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: color, size: 16),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: GoogleFonts.outfit(color: AppColors.onSurfaceVariant, fontSize: 13),
          ),
        ),
      ],
    ),
  );

  String _toLabel(String key) {
    final map = {
      'accommodation': 'Accommodation',
      'food': 'Food & Dining',
      'transport': 'Transport',
      'activities': 'Activities',
      'flights': 'Flights',
      'total': 'TOTAL',
      'perDay': 'Per Day',
      'currency': 'Currency',
    };
    return map[key] ?? key;
  }
}

// ── Day Card ──────────────────────────────────────────────────────────────────
class DayCard extends StatefulWidget {
  final Map<String, dynamic> day;
  final int index;
  const DayCard({super.key, required this.day, required this.index});

  @override
  State<DayCard> createState() => _DayCardState();
}

class _DayCardState extends State<DayCard> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final activities = widget.day['activities'] is List
        ? List<Map<String, dynamic>>.from(
            (widget.day['activities'] as List).map(
              (a) => a is Map ? Map<String, dynamic>.from(a) : <String, dynamic>{},
            ),
          )
        : <Map<String, dynamic>>[];

    final diff = widget.day['difficulty']?.toString() ?? 'medium';
    final pace = widget.day['pace']?.toString() ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 32),
      decoration: BoxDecoration(
        color: AppColors.surfaceLowest,
        borderRadius: BorderRadius.circular(40), // Taste: "rounded-[2.5rem]"
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 40,
            offset: const Offset(0, 20),
          )
        ],
        border: Border.all(color: AppColors.surface, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: const BoxDecoration(
                      color: AppColors.surfaceLow,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        '${widget.day['day'] ?? widget.index + 1}',
                        style: GoogleFonts.outfit(
                          color: AppColors.onBackground,
                          fontWeight: FontWeight.w700,
                          fontSize: 20,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.day['theme']?.toString() ?? 'Day ${widget.index + 1}',
                          style: GoogleFonts.outfit(
                            color: AppColors.onBackground,
                            fontWeight: FontWeight.w600,
                            fontSize: 18,
                            letterSpacing: -0.3,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if ((widget.day['areaFocus']?.toString() ?? '').isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            widget.day['areaFocus'].toString(),
                            style: GoogleFonts.outfit(
                              color: AppColors.onSurfaceVariant,
                              fontSize: 13,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ]
                      ],
                    ),
                  ),
                  Icon(
                    _expanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                    color: AppColors.onSurfaceVariant,
                  ),
                ],
              ),
            ),
          ),

          // Activities
          if (_expanded)
            Padding(
              padding: const EdgeInsets.only(top: 8, bottom: 16),
              child: Column(
                children: activities.asMap().entries.map((e) {
                  return _ActivityCard(
                    activity: e.value,
                    isLast: e.key == activities.length - 1,
                  )
                  .animate()
                  .fadeIn(duration: 400.ms, curve: Curves.easeOut)
                  .slideY(begin: 0.1, duration: 400.ms, curve: Curves.easeOutCirc); // Premium spring physics approximation
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }
}

class _ActivityCard extends StatelessWidget {
  final Map<String, dynamic> activity;
  final bool isLast;
  const _ActivityCard({required this.activity, required this.isLast});

  @override
  Widget build(BuildContext context) {
    final a = activity;
    return Container(
      margin: EdgeInsets.only(bottom: isLast ? 0 : 24, left: 8, right: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title row with Time
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              if ((a['time']?.toString() ?? '').isNotEmpty) ...[
                Text(
                  a['time'].toString(),
                  style: GoogleFonts.outfit(
                    color: AppColors.primary,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(width: 16),
              ],
              Expanded(
                child: Text(
                  a['title']?.toString() ?? 'Activity',
                  style: GoogleFonts.outfit(
                    color: AppColors.onBackground,
                    fontWeight: FontWeight.w600,
                    fontSize: 18,
                    letterSpacing: -0.3,
                  ),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 8),

          // Address
          if ((a['address']?.toString() ?? '').isNotEmpty)
            Row(
              children: [
                const Icon(Icons.location_on_outlined, color: AppColors.onSurfaceVariant, size: 14),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    a['address'].toString(),
                    style: GoogleFonts.outfit(color: AppColors.onSurfaceVariant, fontSize: 13),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            
          const SizedBox(height: 12),

          // Photo
          if ((a['photoUrl']?.toString() ?? '').isNotEmpty)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.surface, width: 1),
              ),
              child: CachedNetworkImage(
                imageUrl: a['photoUrl'].toString(),
                height: 200,
                width: double.infinity,
                fit: BoxFit.cover,
                placeholder: (context, url) => Shimmer.fromColors(
                  baseColor: AppColors.surfaceLow,
                  highlightColor: AppColors.surface,
                  child: Container(height: 200, color: AppColors.surfaceLow),
                ),
                errorWidget: (context, url, error) => const SizedBox.shrink(),
              ),
            ),

          // Description
          if ((a['description']?.toString() ?? '').isNotEmpty)
            Text(
              a['description'].toString(),
              style: GoogleFonts.outfit(
                color: AppColors.onSurfaceVariant,
                fontSize: 14,
                height: 1.6,
              ),
            ),
            
          const SizedBox(height: 12),

          // Cost, Rating, Duration
          Row(
            children: [
              if ((a['cost']?.toString() ?? '').isNotEmpty) ...[
                const Icon(Icons.wallet_outlined, color: AppColors.onSurfaceVariant, size: 14),
                const SizedBox(width: 4),
                Text(
                  a['cost'].toString(),
                  style: GoogleFonts.outfit(color: AppColors.onSurfaceVariant, fontSize: 13, fontWeight: FontWeight.w500),
                ),
                const SizedBox(width: 16),
              ],
              if (a['rating'] != null) ...[
                const Icon(Icons.star_rounded, color: AppColors.amber, size: 14),
                const SizedBox(width: 4),
                Text(
                  '${a['rating']}',
                  style: GoogleFonts.outfit(color: AppColors.amber, fontSize: 13, fontWeight: FontWeight.w600),
                ),
                const SizedBox(width: 16),
              ],
              if ((a['duration']?.toString() ?? '').isNotEmpty) ...[
                const Icon(Icons.timer_outlined, color: AppColors.onSurfaceVariant, size: 14),
                const SizedBox(width: 4),
                Text(
                  a['duration'].toString(),
                  style: GoogleFonts.outfit(color: AppColors.onSurfaceVariant, fontSize: 13, fontWeight: FontWeight.w500),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
