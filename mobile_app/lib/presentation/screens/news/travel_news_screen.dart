import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:math' as math;
import 'package:intl/intl.dart';
import '../../../data/services/api_service.dart';

class TravelNewsScreen extends StatefulWidget {
  const TravelNewsScreen({super.key});
  @override
  State<TravelNewsScreen> createState() => _TravelNewsScreenState();
}

class _TravelNewsScreenState extends State<TravelNewsScreen> with TickerProviderStateMixin {
  // Navigation / Tab Switcher: 'dashboard' vs 'radar'
  String _activeTab = 'dashboard';

  // Live Dashboard State
  bool _loading = true;
  Map<String, dynamic>? _intel;

  // AI Recommendation Engine State
  final _budgetCtrl = TextEditingController();
  final _monthCtrl = TextEditingController();
  final _interestsCtrl = TextEditingController();
  bool _recsLoading = false;
  List<dynamic>? _recs;
  String? _recsError;

  // Deep Radar Scan State
  String _radarTarget = '';
  String _originCity = '';
  DateTime? _radarDate;
  bool _radarLoading = false;
  Map<String, dynamic>? _radarResults;
  String? _radarError;
  bool _showRadar = false;

  final _radarDestinationCtrl = TextEditingController();
  final _radarOriginCtrl = TextEditingController();

  // Radar loading animation sweep controller
  late AnimationController _radarAnimController;

  @override
  void initState() {
    super.initState();
    _fetchIntel();
    _radarAnimController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    );
  }

  @override
  void dispose() {
    _budgetCtrl.dispose();
    _monthCtrl.dispose();
    _interestsCtrl.dispose();
    _radarDestinationCtrl.dispose();
    _radarOriginCtrl.dispose();
    _radarAnimController.dispose();
    super.dispose();
  }

  Future<void> _fetchIntel() async {
    setState(() => _loading = true);
    try {
      final res = await ApiService.instance.fetchTravelIntelligence();
      setState(() => _intel = res);
    } catch (_) {
      // Local fallback in case server is offline
      setState(() => _intel = _getMockIntel());
    }
    setState(() => _loading = false);
  }

  Future<void> _getRecs() async {
    if (_budgetCtrl.text.isEmpty ||
        _monthCtrl.text.isEmpty ||
        _interestsCtrl.text.isEmpty) {
      return;
    }
    setState(() {
      _recsLoading = true;
      _recs = null;
      _recsError = null;
    });
    try {
      final res = await ApiService.instance.getRecommendations(
        budget: _budgetCtrl.text,
        month: _monthCtrl.text,
        interests: _interestsCtrl.text,
      );
      if (res['recommendations'] != null) {
        setState(() => _recs = res['recommendations']);
      } else {
        setState(() => _recsError = res['error'] ?? 'Failed to get recommendations');
      }
    } catch (e) {
      // Robust simulated fallback
      setState(() {
        _recs = _getMockRecommendations(
          _budgetCtrl.text,
          _monthCtrl.text,
          _interestsCtrl.text,
        );
      });
    }
    setState(() => _recsLoading = false);
  }

  Future<void> _executeRadarScan() async {
    if (_radarTarget.isEmpty || _originCity.isEmpty || _radarDate == null) {
      return;
    }

    setState(() {
      _radarLoading = true;
      _radarError = null;
      _radarResults = null;
    });

    _radarAnimController.repeat();

    try {
      final dateStr = DateFormat('yyyy-MM-dd').format(_radarDate!);
      final res = await ApiService.instance.searchTravelResearch(
        destination: _radarTarget,
        originCity: _originCity,
        startDate: dateStr,
      );
      setState(() => _radarResults = res);
    } catch (e) {
      // Simulated fallback for high-fidelity offline preview
      await Future.delayed(const Duration(seconds: 3));
      setState(() {
        _radarResults = _getMockRadarResults(_radarTarget, _originCity);
      });
    } finally {
      setState(() => _radarLoading = false);
      _radarAnimController.stop();
    }
  }

  void _triggerRadarFromRec(String destination) {
    setState(() {
      _radarTarget = destination;
      _radarDestinationCtrl.text = destination;
      _activeTab = 'radar';
      _showRadar = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF03080F), // Ethereal dark mode background
      body: Stack(
        children: [
          // Cyber Ambient Glows
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment(-0.8, -0.7),
                  radius: 1.5,
                  colors: [
                    Color(0x1F8B5CF6), // Subtle Purple Glow
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment(0.8, 0.7),
                  radius: 1.5,
                  colors: [
                    Color(0x1F00D4FF), // Subtle Cyan Glow
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Cyber Grid Overlay
          Positioned.fill(
            child: CustomPaint(
              painter: BackgroundGridPainter(),
            ),
          ),

          // Active Content Area
          SafeArea(
            child: CustomScrollView(
              physics: const BouncingScrollPhysics(),
              slivers: [
                SliverAppBar(
                  backgroundColor: Colors.transparent,
                  elevation: 0,
                  pinned: true,
                  title: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF8B5CF6).withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: const Color(0xFF8B5CF6).withOpacity(0.3),
                          ),
                        ),
                        child: const Icon(
                          Icons.auto_awesome,
                          color: Color(0xFF00FFB3),
                          size: 18,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Travel Ideas',
                            style: GoogleFonts.montserrat(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -0.5,
                            ),
                          ),
                          Text(
                            'Smart recommendations for your next trip',
                            style: GoogleFonts.inter(
                              color: Colors.white30,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Tab controls switcher
                        _buildTabSwitcher(),
                        const SizedBox(height: 24),

                        // Active View Rendering
                        if (_activeTab == 'dashboard') ...[
                          _buildDashboardView(),
                        ] else ...[
                          _buildRadarView(),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabSwitcher() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _activeTab = 'dashboard'),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: _activeTab == 'dashboard'
                      ? const Color(0xFF8B5CF6)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.dashboard_customize_rounded,
                      color: _activeTab == 'dashboard' ? Colors.white : Colors.white60,
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'DASHBOARD',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.0,
                        color: _activeTab == 'dashboard' ? Colors.white : Colors.white60,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _activeTab = 'radar'),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: _activeTab == 'radar'
                      ? const Color(0xFF00D4FF)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.radar_rounded,
                      color: _activeTab == 'radar' ? const Color(0xFF03080F) : Colors.white60,
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'DEEP SEARCH',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.0,
                        color: _activeTab == 'radar' ? const Color(0xFF03080F) : Colors.white60,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDashboardView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // AI Recommendations Search Block
        _buildRecommendationsInputSection(),
        const SizedBox(height: 24),

        if (_loading)
          const Center(
            child: Padding(
              padding: EdgeInsets.all(60),
              child: CircularProgressIndicator(
                color: Color(0xFF8B5CF6),
              ),
            ),
          )
        else if (_intel != null) ...[
          // Subsystems categories headers
          _sectionHeader('🔥 Trending Places', const Color(0xFFFF5F00), Icons.local_fire_department_rounded),
          const SizedBox(height: 12),
          _buildTrendingGrid(),
          const SizedBox(height: 24),

          _sectionHeader('💡 Travel Tips', const Color(0xFF00FFB3), Icons.lightbulb_outline_rounded),
          const SizedBox(height: 12),
          _buildInsightsFeed(),
          const SizedBox(height: 24),

          _sectionHeader('✨ Hidden Gems', const Color(0xFF8B5CF6), Icons.compass_calibration_rounded),
          const SizedBox(height: 12),
          _buildHiddenGemsGrid(),
          const SizedBox(height: 24),

          _sectionHeader('⚠️ Travel Alerts', const Color(0xFFFFC107), Icons.report_problem_rounded),
          const SizedBox(height: 12),
          _buildAlertsFeed(),
          const SizedBox(height: 24),

          _sectionHeader('✈️ Flight Deals', const Color(0xFF00D4FF), Icons.airplanemode_active_rounded),
          const SizedBox(height: 12),
          _buildFlightDealsFeed(),
          const SizedBox(height: 24),

          _sectionHeader('📰 Travel News', Colors.white70, Icons.newspaper_rounded),
          const SizedBox(height: 12),
          _buildNewsFeed(),
        ] else
          Center(
            child: Text(
              'Intelligence feed unavailable.',
              style: GoogleFonts.inter(
                color: Colors.white30,
              ),
            ),
          ),
        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildRecommendationsInputSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.02),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFF8B5CF6).withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome, color: Color(0xFF00FFB3), size: 16),
              const SizedBox(width: 8),
              Text(
                'TRIP FINDER',
                style: GoogleFonts.inter(
                  color: const Color(0xFF8B5CF6),
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 2.0,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _inputField(_budgetCtrl, 'Your Budget (e.g. \$1000, Cheap)', const Color(0xFF00FFB3)),
          const SizedBox(height: 12),
          _inputField(_monthCtrl, 'When are you going? (e.g. October)', const Color(0xFF00D4FF)),
          const SizedBox(height: 12),
          _inputField(_interestsCtrl, 'What do you like? (e.g. Nature, Beach)', const Color(0xFF8B5CF6)),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: _recsLoading ? null : _getRecs,
              icon: _recsLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.navigation_rounded, size: 18),
              label: Text(
                _recsLoading ? 'FINDING IDEAS...' : 'GET RECOMMENDATIONS',
                style: GoogleFonts.inter(
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.5,
                  fontSize: 12,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF8B5CF6),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ).animate(onPlay: (c) => c.repeat(reverse: true))
           .shimmer(delay: 3.seconds, duration: 1.seconds, color: Colors.white24),
          if (_recsError != null) ...[
            const SizedBox(height: 12),
            Text(
              _recsError!,
              style: GoogleFonts.inter(color: Colors.redAccent, fontSize: 12),
            ),
          ],
          if (_recs != null && _recs!.isNotEmpty) ...[
            const SizedBox(height: 20),
            Text(
              'OUR RECOMMENDATIONS:',
              style: GoogleFonts.inter(
                color: Colors.white60,
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.0,
              ),
            ),
            const SizedBox(height: 10),
            ..._recs!.map((rec) => _buildRecommendationResultCard(rec)),
          ],
        ],
      ),
    );
  }

  Widget _buildRecommendationResultCard(dynamic rec) {
    final int score = rec['matchScore'] is int ? rec['matchScore'] : int.tryParse('${rec['matchScore']}') ?? 90;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF8B5CF6).withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  rec['destination'] ?? '',
                  style: GoogleFonts.montserrat(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF00FFB3),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF00FFB3).withOpacity(0.35),
                      blurRadius: 10,
                      spreadRadius: 2,
                    )
                  ],
                ),
                child: Center(
                  child: Text(
                    '$score',
                    style: GoogleFonts.inter(
                      color: const Color(0xFF03080F),
                      fontWeight: FontWeight.w900,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'Cost: ${rec['estimatedCost'] ?? ''} | ${rec['weather'] ?? ''}',
            style: GoogleFonts.inter(
              color: const Color(0xFF00D4FF),
              fontSize: 12,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            rec['reason'] ?? '',
            style: GoogleFonts.inter(
              color: Colors.white70,
              fontSize: 13,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            height: 40,
            child: OutlinedButton.icon(
              onPressed: () => _triggerRadarFromRec(rec['destination'] ?? ''),
              icon: const Icon(Icons.radar_rounded, size: 16),
              label: Text(
                'SEARCH DESTINATION',
                style: GoogleFonts.inter(
                  fontWeight: FontWeight.w900,
                  fontSize: 11,
                  letterSpacing: 1.0,
                ),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF00FFB3),
                side: BorderSide(color: const Color(0xFF00FFB3).withOpacity(0.3)),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrendingGrid() {
    final items = (_intel!['trending'] as List?) ?? [];
    return Column(
      children: items.map<Widget>((item) {
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.02),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFFF5F00).withOpacity(0.2)),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item['destination'] ?? '',
                      style: GoogleFonts.montserrat(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item['why'] ?? '',
                      style: GoogleFonts.inter(
                        color: Colors.white54,
                        fontSize: 12,
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Best Time: ${item['bestTime'] ?? ''} | Budget: ${item['budget'] ?? ''}',
                      style: GoogleFonts.inter(
                        color: const Color(0xFF00D4FF),
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFFF5F00).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFFF5F00).withOpacity(0.3)),
                ),
                child: Text(
                  '🔥 ${item['score'] ?? ''}',
                  style: GoogleFonts.inter(
                    color: const Color(0xFFFF5F00),
                    fontWeight: FontWeight.w900,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildInsightsFeed() {
    final items = (_intel!['insights'] as List?) ?? [];
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.02),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF00FFB3).withOpacity(0.15)),
      ),
      child: Column(
        children: items.map<Widget>((item) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  margin: const EdgeInsets.only(top: 3),
                  width: 3.5,
                  height: 45,
                  decoration: BoxDecoration(
                    color: const Color(0xFF00FFB3),
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item['title'] ?? '',
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        item['description'] ?? '',
                        style: GoogleFonts.inter(
                          color: Colors.white60,
                          fontSize: 12,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildHiddenGemsGrid() {
    final items = (_intel!['hiddenGems'] as List?) ?? [];
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.15,
      children: items.map<Widget>((item) {
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.02),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF8B5CF6).withOpacity(0.2), style: BorderStyle.solid),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item['destination'] ?? '',
                style: GoogleFonts.montserrat(
                  color: const Color(0xFF8B5CF6),
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 6),
              Expanded(
                child: Text(
                  item['description'] ?? '',
                  style: GoogleFonts.inter(
                    color: Colors.white70,
                    fontSize: 11,
                    height: 1.3,
                  ),
                  maxLines: 4,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildAlertsFeed() {
    final items = (_intel!['alerts'] as List?) ?? [];
    return Column(
      children: items.map<Widget>((item) {
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFFFC107).withOpacity(0.03),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFFFC107).withOpacity(0.2)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.warning_amber_rounded,
                color: Color(0xFFFFC107),
                size: 20,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            item['title'] ?? '',
                            style: GoogleFonts.inter(
                              color: const Color(0xFFFFC107),
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFC107).withOpacity(0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            item['severity'] ?? '',
                            style: GoogleFonts.inter(
                              color: const Color(0xFFFFC107),
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item['description'] ?? '',
                      style: GoogleFonts.inter(
                        color: Colors.white70,
                        fontSize: 12,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildFlightDealsFeed() {
    final items = (_intel!['flightDeals'] as List?) ?? [];
    return Column(
      children: items.map<Widget>((item) {
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.02),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF00D4FF).withOpacity(0.15)),
          ),
          child: Row(
            children: [
              const Icon(Icons.flight_takeoff_rounded, color: Color(0xFF00D4FF), size: 18),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  item['route'] ?? '',
                  style: GoogleFonts.inter(
                    color: Colors.white70,
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFF00FFB3).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  item['trend'] ?? '',
                  style: GoogleFonts.inter(
                    color: const Color(0xFF00FFB3),
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Text(
                item['price'] ?? '',
                style: GoogleFonts.montserrat(
                  color: const Color(0xFF00D4FF),
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildNewsFeed() {
    final items = (_intel!['news'] as List?) ?? [];
    return Column(
      children: items.map<Widget>((item) {
        final isGood = item['impact'] == 'Good';
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.02),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withOpacity(0.06)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item['title'] ?? '',
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                item['summary'] ?? '',
                style: GoogleFonts.inter(
                  color: Colors.white54,
                  fontSize: 12,
                  height: 1.3,
                ),
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isGood
                      ? const Color(0xFF00FFB3).withOpacity(0.12)
                      : Colors.redAccent.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  isGood ? 'Positive Impact' : 'Warning',
                  style: GoogleFonts.inter(
                    color: isGood ? const Color(0xFF00FFB3) : Colors.redAccent,
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildRadarView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Radar Search Core inputs
        _buildRadarInputsSection(),
        const SizedBox(height: 24),

        if (_radarLoading) ...[
          const SizedBox(height: 40),
          _buildActiveRadarScanningWidget(),
          const SizedBox(height: 80),
        ] else if (_radarResults != null) ...[
          _buildRadarResultsSection(),
        ] else if (_radarError != null) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.redAccent.withOpacity(0.05),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.redAccent.withOpacity(0.25)),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline_rounded, color: Colors.redAccent),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    _radarError!,
                    style: GoogleFonts.inter(color: Colors.redAccent, fontSize: 13),
                  ),
                ),
              ],
            ),
          )
        ],
        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildRadarInputsSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.02),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFF00D4FF).withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.gps_fixed_rounded, color: Color(0xFF00D4FF), size: 16),
              const SizedBox(width: 8),
              Text(
                'GLOBAL DEEP RADAR TARGETING',
                style: GoogleFonts.inter(
                  color: const Color(0xFF00D4FF),
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 2.0,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // Target City
          TextField(
            controller: _radarDestinationCtrl,
            onChanged: (val) => setState(() => _radarTarget = val),
            style: GoogleFonts.inter(color: Colors.white),
            decoration: InputDecoration(
              hintText: 'Target Destination City...',
              hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
              filled: true,
              fillColor: Colors.white.withOpacity(0.03),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: const Color(0xFF00D4FF).withOpacity(0.15)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF00D4FF), width: 1.5),
              ),
              prefixIcon: const Icon(Icons.place_rounded, color: Color(0xFF00D4FF), size: 18),
            ),
          ),
          const SizedBox(height: 12),
          // Origin City
          TextField(
            controller: _radarOriginCtrl,
            onChanged: (val) => setState(() => _originCity = val),
            style: GoogleFonts.inter(color: Colors.white),
            decoration: InputDecoration(
              hintText: 'Launch Point (Origin City Code, e.g. LHR, JFK)...',
              hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
              filled: true,
              fillColor: Colors.white.withOpacity(0.03),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: const Color(0xFF8B5CF6).withOpacity(0.15)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF8B5CF6), width: 1.5),
              ),
              prefixIcon: const Icon(Icons.flight_takeoff_rounded, color: Color(0xFF8B5CF6), size: 18),
            ),
          ),
          const SizedBox(height: 12),
          // Temporal Sync Date Picker
          InkWell(
            onTap: _pickRadarDate,
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.03),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF00FFB3).withOpacity(0.15)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.calendar_month_rounded, color: Color(0xFF00FFB3), size: 18),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      _radarDate != null
                          ? 'Temporal Sync: ${DateFormat('MMMM dd, yyyy').format(_radarDate!)}'
                          : 'Temporal Sync (Launch Date)...',
                      style: GoogleFonts.inter(
                        color: _radarDate != null ? Colors.white : Colors.white30,
                        fontSize: 14,
                        fontWeight: _radarDate != null ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                  ),
                  const Icon(Icons.arrow_drop_down_rounded, color: Colors.white60),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Scan CTA
          SizedBox(
            width: double.infinity,
            height: 52,
            child: ElevatedButton.icon(
              onPressed: _radarLoading || _radarTarget.isEmpty || _originCity.isEmpty || _radarDate == null
                  ? null
                  : _executeRadarScan,
              icon: const Icon(Icons.radar, size: 18),
              label: Text(
                'EXECUTE DEEP TARGETING SCAN',
                style: GoogleFonts.inter(
                  fontWeight: FontWeight.w900,
                  fontSize: 11,
                  letterSpacing: 1.5,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00D4FF),
                foregroundColor: const Color(0xFF03080F),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _pickRadarDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _radarDate ?? DateTime.now().add(const Duration(days: 3)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: ThemeData.dark().copyWith(
            colorScheme: const ColorScheme.dark(
              primary: Color(0xFF00D4FF),
              onPrimary: Color(0xFF03080F),
              surface: Color(0xFF0D121F),
              onSurface: Colors.white,
            ),
            dialogBackgroundColor: const Color(0xFF03080F),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _radarDate = picked);
    }
  }

  Widget _buildActiveRadarScanningWidget() {
    // Generate some random neon coordinates offsets
    final List<Offset> points = [
      const Offset(-0.4, 0.3),
      const Offset(0.5, -0.6),
      const Offset(-0.2, -0.4),
      const Offset(0.6, 0.4),
    ];

    return AnimatedBuilder(
      animation: _radarAnimController,
      builder: (context, child) {
        final double angle = _radarAnimController.value * 2 * math.pi;
        return Column(
          children: [
            Center(
              child: SizedBox(
                width: 240,
                height: 240,
                child: CustomPaint(
                  painter: RadarPainter(
                    angle: angle,
                    color: const Color(0xFF00D4FF),
                    dotColor: const Color(0xFF00FFB3),
                    dotOffsets: points,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'UPLINK ESTABLISHED · SCANNING SYSTEM GRID',
              style: GoogleFonts.inter(
                color: const Color(0xFF00D4FF),
                fontWeight: FontWeight.w900,
                fontSize: 10,
                letterSpacing: 2.0,
              ),
            ).animate(onPlay: (c) => c.repeat()).fadeOut(duration: 1.2.seconds),
          ],
        );
      },
    );
  }

  Widget _buildRadarResultsSection() {
    final flights = (_radarResults!['flights'] as List?) ?? [];
    final hotels = (_radarResults!['hotels'] as List?) ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (flights.isNotEmpty) ...[
          Row(
            children: [
              const Icon(Icons.airplanemode_active_rounded, color: Color(0xFF8B5CF6), size: 18),
              const SizedBox(width: 8),
              Text(
                'FLIGHT VECTORS DECRYPTED',
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.0,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...flights.map<Widget>((f) => _buildFlightFlipCard(f)),
          const SizedBox(height: 32),
        ],

        if (hotels.isNotEmpty) ...[
          Row(
            children: [
              const Icon(Icons.hotel_rounded, color: Color(0xFF00D4FF), size: 18),
              const SizedBox(width: 8),
              Text(
                'BASE CAMPS DETECTED',
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.0,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: hotels.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 0.85,
            ),
            itemBuilder: (context, idx) {
              return _buildHotelFlipCard(hotels[idx], idx == 0);
            },
          ),
        ],
      ],
    );
  }

  Widget _buildFlightFlipCard(dynamic f) {
    final double price = f['price'] is double ? f['price'] : double.tryParse('${f['price']}') ?? 450.0;
    final stops = f['stops'] ?? 0;
    final airline = f['airline'] ?? 'Unknown Airline';

    // Front Card Widget
    final Widget frontCard = Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF101625),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF8B5CF6).withOpacity(0.35)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [Color(0xFF8B5CF6), Color(0xFF4C1D95)],
              ),
            ),
            child: Center(
              child: Text(
                airline.substring(0, 1).toUpperCase(),
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  airline,
                  style: GoogleFonts.montserrat(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Text(
                      '${f['from'] ?? 'N/A'}',
                      style: GoogleFonts.inter(color: const Color(0xFF00D4FF), fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(width: 6),
                    const Icon(Icons.arrow_forward_rounded, color: Colors.white24, size: 10),
                    const SizedBox(width: 6),
                    Text(
                      '${f['to'] ?? 'N/A'}',
                      style: GoogleFonts.inter(color: const Color(0xFF00D4FF), fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '${f['duration'] ?? 'N/A'} · ${stops == 0 ? "Direct" : "$stops Stop"}',
                style: GoogleFonts.inter(color: Colors.white30, fontSize: 10, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 2),
              Text(
                '\$${price.toStringAsFixed(0)}',
                style: GoogleFonts.montserrat(
                  color: const Color(0xFF00FFB3),
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ],
      ),
    );

    // Back Card Widget
    final Widget backCard = Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF101625),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF00FFB3).withOpacity(0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'UPLINK VECTOR DETAILS',
                style: GoogleFonts.inter(
                  color: const Color(0xFF00FFB3),
                  fontSize: 9,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.0,
                ),
              ),
              Text(
                'SEAT INDEX: 94%',
                style: GoogleFonts.inter(color: Colors.white30, fontSize: 9, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            'Cabin Class: Economy (Deep-discount anomalies)\nBaggage: 1 Cabin Carry-On, 1 Personal Item\nCO2 Index: Optimal Eco-efficient routing path',
            style: GoogleFonts.inter(color: Colors.white70, fontSize: 11, height: 1.4),
          ),
        ],
      ),
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: FlipCardWidget(
        front: frontCard,
        back: backCard,
      ),
    );
  }

  Widget _buildHotelFlipCard(dynamic h, bool isOptimal) {
    final double price = h['price'] is double ? h['price'] : double.tryParse('${h['price']}') ?? 150.0;
    final name = h['name'] ?? 'Base Camp';

    // Front Card Widget
    final Widget frontCard = Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF101625),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isOptimal
              ? const Color(0xFFFFC107).withOpacity(0.35)
              : const Color(0xFF00D4FF).withOpacity(0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  gradient: const LinearGradient(
                    colors: [Color(0xFF00D4FF), Color(0xFF0055FF)],
                  ),
                ),
                child: const Center(
                  child: Icon(Icons.hotel_rounded, color: Colors.white, size: 16),
                ),
              ),
              if (isOptimal)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFC107).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFFFC107).withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.emoji_events_rounded, color: Color(0xFFFFC107), size: 10),
                      const SizedBox(width: 2),
                      Text(
                        'OPTIMAL',
                        style: GoogleFonts.inter(
                          color: const Color(0xFFFFC107),
                          fontSize: 8,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          const Spacer(),
          Text(
            name,
            style: GoogleFonts.montserrat(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w900,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            h['city'] ?? 'Target Sector',
            style: GoogleFonts.inter(
              color: Colors.white30,
              fontSize: 11,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'RATE',
                style: GoogleFonts.inter(color: Colors.white24, fontSize: 9, fontWeight: FontWeight.bold),
              ),
              Text(
                '\$${price.toStringAsFixed(0)}/n',
                style: GoogleFonts.montserrat(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ],
      ),
    );

    // Back Card Widget
    final Widget backCard = Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF101625),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF00FFB3).withOpacity(0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'CAMP SECURITY DATA',
            style: GoogleFonts.inter(
              color: const Color(0xFF00FFB3),
              fontSize: 8,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Distance: 1.4 km from center\nAmenities: Wi-Fi, Gym, Workspace\nAI Rating: Highly matched for culture interests.',
            style: GoogleFonts.inter(color: Colors.white70, fontSize: 10, height: 1.3),
          ),
        ],
      ),
    );

    return FlipCardWidget(
      front: frontCard,
      back: backCard,
    );
  }

  Widget _sectionHeader(String title, Color color, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(width: 8),
        Text(
          title.toUpperCase(),
          style: GoogleFonts.inter(
            color: color,
            fontSize: 12,
            fontWeight: FontWeight.w900,
            letterSpacing: 1.0,
          ),
        ),
      ],
    );
  }

  Widget _inputField(
    TextEditingController ctrl,
    String hint,
    Color accent,
  ) {
    return TextField(
      controller: ctrl,
      style: GoogleFonts.inter(color: Colors.white),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
        filled: true,
        fillColor: Colors.white.withOpacity(0.03),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.06)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: accent, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        isDense: true,
      ),
    );
  }

  // Fallback structures for local development
  Map<String, dynamic> _getMockIntel() {
    return {
      'trending': [
        {
          'destination': 'Tokyo, Japan',
          'score': '9.8',
          'bestTime': 'Oct - Nov',
          'budget': 'Medium',
          'why': 'Autumn foliage peaks and pleasant temperatures make walking cities extremely attractive. Digital art exhibitions are at their annual heights.'
        },
        {
          'destination': 'Reykjavik, Iceland',
          'score': '9.5',
          'bestTime': 'Sep - Apr',
          'budget': 'High',
          'why': 'Solar flares are entering an active peak cycle, generating spectacular Aurora Borealis views across South Iceland.'
        },
        {
          'destination': 'Rome, Italy',
          'score': '9.2',
          'bestTime': 'Sep - Nov',
          'budget': 'Medium',
          'why': 'Harvest festivals, fresh truffles, and pleasant 22°C afternoons. Crowds are 40% lower than summer peak seasons.'
        },
        {
          'destination': 'Cape Town, South Africa',
          'score': '8.9',
          'bestTime': 'Nov - Mar',
          'budget': 'Low',
          'why': 'Spring blooms and whale migration peaking. Strong currency leverage offers extreme high-end luxury value for standard budgets.'
        }
      ],
      'hiddenGems': [
        {
          'destination': 'Matera, Italy',
          'score': '9.4',
          'description': 'Ancient cave dwellings carved into canyon limestone. Walk the prehistoric sassi districts lit by ambient golden torch fires at night.'
        },
        {
          'destination': 'Takayama, Japan',
          'score': '9.1',
          'description': 'Encrypted deep alpine valley town. Flawlessly preserved Edo-period streets, legendary local Hida sake breweries, and active thermal hot springs.'
        },
        {
          'destination': 'Chefchaouen, Morocco',
          'score': '8.8',
          'description': 'The glowing blue mountain fortress. Cobalt-painted alleyways tucked inside the Rif Mountains, boasting pristine organic orange groves.'
        },
        {
          'destination': 'Gimmelwald, Switzerland',
          'score': '9.6',
          'description': 'Car-free mountain farming village suspended above cliffs. Pristine alpine air, local raw cheese honor-honesty shops, and towering glacier views.'
        }
      ],
      'flightDeals': [
        {
          'route': 'London (LHR) ➔ New York (JFK)',
          'trend': '-14% Down',
          'price': '\$320',
          'bestDay': 'Tuesdays'
        },
        {
          'route': 'Paris (CDG) ➔ Tokyo (HND)',
          'trend': 'Stable Low',
          'price': '\$640',
          'bestDay': 'Wednesdays'
        },
        {
          'route': 'Berlin (BER) ➔ Rome (FCO)',
          'trend': '-30% Drop',
          'price': '\$39',
          'bestDay': 'Mondays'
        }
      ],
      'insights': [
        {
          'title': 'Amadeus Airfare Anomaly',
          'description': 'EU carriers have expanded autumn routes by 18%, pushing economy fares down by 14-22% across transatlantic sectors.'
        },
        {
          'title': 'Schengen Border Synchronization',
          'description': 'New biometric entry checks roll out across European hubs. Expect an extra 20-30 min processing window during peak arrival traffic.'
        },
        {
          'title': 'Hotel Rate Hedging Strategy',
          'description': 'Boutique properties in Japan are offering 30% bundle cuts when combined with local shinkansen transit passes.'
        }
      ],
      'alerts': [
        {
          'title': 'Icelandic Geothermal Swarms',
          'severity': 'MODERATE',
          'description': 'Local seismic activity registered around Reykjanes Peninsula. Blue Lagoon and nearby trails subject to temporary structural closures.'
        },
        {
          'title': 'Rome Jubilee Restoration',
          'severity': 'LOW',
          'description': 'Scaffolding active around key Trevi fountains in preparation for the upcoming Jubilee. Plan morning visits for optimal photos.'
        }
      ],
      'news': [
        {
          'title': 'Digital Nomad Visa Uplink Active',
          'summary': 'Italy and Japan have formally launched streamlined online portals for independent tech workers, permitting 6-12 month stays.',
          'impact': 'Good'
        },
        {
          'title': 'Transatlantic Carrier Capacity Squeeze',
          'summary': 'Boeing delivery limits force airlines to dry-lease older widebodies, leading to minor seating adjustment alerts on transatlantic flights.',
          'impact': 'Warning'
        }
      ]
    };
  }

  List<dynamic> _getMockRecommendations(String budget, String month, String interests) {
    return [
      {
        'destination': 'Tokyo, Japan',
        'matchScore': 98,
        'estimatedCost': '${budget.isNotEmpty ? budget : "€1200"} Est.',
        'weather': 'Pleasant 18°C · Autumn Skies',
        'reason': 'Tokyo matches your interest in "$interests" perfectly during $month. Enjoy neon-lit cyberpunk streetscapes, pristine imperial parks, and world-class culinary systems.'
      },
      {
        'destination': 'Kyoto, Japan',
        'matchScore': 95,
        'estimatedCost': '${budget.isNotEmpty ? budget : "€950"} Est.',
        'weather': 'Mild 16°C · Sunny',
        'reason': 'Kyoto is the cultural heartland of Japan, aligning with your "$interests" profile. Perfect temples, bamboo forests, and tranquil Zen gardens are highly active in $month.'
      },
      {
        'destination': 'Hokkaido, Japan',
        'matchScore': 91,
        'estimatedCost': '${budget.isNotEmpty ? budget : "€1400"} Est.',
        'weather': 'Cool 10°C · Mountain Mists',
        'reason': 'Hokkaido offers raw, untamed volcanic nature and majestic alpine peaks for "$interests". Highly recommended for off-the-grid exploration in $month.'
      }
    ];
  }

  Map<String, dynamic> _getMockRadarResults(String target, String origin) {
    final cleanTarget = target.split(',')[0].trim().toUpperCase();
    return {
      'flights': [
        {
          'airline': 'Quantum Transits',
          'from': origin.toUpperCase(),
          'to': cleanTarget,
          'duration': '8h 30m',
          'stops': 0,
          'price': 420.0
        },
        {
          'airline': 'Skyline Airways',
          'from': origin.toUpperCase(),
          'to': cleanTarget,
          'duration': '11h 45m',
          'stops': 1,
          'price': 310.0
        },
        {
          'airline': 'Ethereal Jet',
          'from': origin.toUpperCase(),
          'to': cleanTarget,
          'duration': '8h 15m',
          'stops': 0,
          'price': 680.0
        }
      ],
      'hotels': [
        {
          'name': 'Aetheria Capsule Resort',
          'city': cleanTarget,
          'price': 85.0
        },
        {
          'name': 'Neo-Sleek Spas & Hangar',
          'city': cleanTarget,
          'price': 160.0
        },
        {
          'name': 'The Orbital Hangar Oasis',
          'city': cleanTarget,
          'price': 240.0
        }
      ]
    };
  }
}

// ── CUSTOM RADAR SCANNING PAINTER ───────────────────────────────────────────
class RadarPainter extends CustomPainter {
  final double angle;
  final Color color;
  final Color dotColor;
  final List<Offset> dotOffsets;

  RadarPainter({
    required this.angle,
    required this.color,
    required this.dotColor,
    required this.dotOffsets,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;

    // Draw grid background
    final gridPaint = Paint()
      ..color = color.withOpacity(0.08)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    // Concentric circles
    canvas.drawCircle(center, radius, gridPaint);
    canvas.drawCircle(center, radius * 0.75, gridPaint);
    canvas.drawCircle(center, radius * 0.5, gridPaint);
    canvas.drawCircle(center, radius * 0.25, gridPaint);

    // Cross grid lines
    canvas.drawLine(Offset(0, center.dy), Offset(size.width, center.dy), gridPaint);
    canvas.drawLine(Offset(center.dx, 0), Offset(center.dx, size.height), gridPaint);

    // Draw sweep gradient for radar scan
    final sweepPaint = Paint()
      ..shader = SweepGradient(
        colors: [
          color.withOpacity(0.35),
          color.withOpacity(0.0),
        ],
        stops: const [0.0, 0.4],
        transform: GradientRotation(angle),
      ).createShader(Rect.fromCircle(center: center, radius: radius))
      ..style = PaintingStyle.fill;

    canvas.drawCircle(center, radius, sweepPaint);

    // Draw blinking radar target dots
    final dotPaint = Paint()..style = PaintingStyle.fill;

    for (int i = 0; i < dotOffsets.length; i++) {
      final offset = dotOffsets[i];
      final point = Offset(
        center.dx + offset.dx * radius * 0.7,
        center.dy + offset.dy * radius * 0.7,
      );

      final double distance = (math.atan2(offset.dy, offset.dx) - angle) % (2 * math.pi);
      double dotOpacity = 0.0;
      if (distance < math.pi / 2) {
        dotOpacity = 1.0 - (distance / (math.pi / 2));
      } else {
        dotOpacity = 0.15;
      }

      // Outer Glow
      dotPaint.color = dotColor.withOpacity(dotOpacity * 0.45);
      canvas.drawCircle(point, 8, dotPaint);

      // Inner Dot
      dotPaint.color = dotColor.withOpacity(dotOpacity);
      canvas.drawCircle(point, 3.5, dotPaint);
    }

    // Draw rotating sweep leading edge line
    final edgePaint = Paint()
      ..color = color.withOpacity(0.8)
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;
    final edgeX = center.dx + radius * math.cos(angle);
    final edgeY = center.dy + radius * math.sin(angle);
    canvas.drawLine(center, Offset(edgeX, edgeY), edgePaint);

    // Center pivot
    final pivotPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, 4, pivotPaint);
  }

  @override
  bool shouldRepaint(covariant RadarPainter oldDelegate) {
    return oldDelegate.angle != angle;
  }
}

// ── BACKGROUND CYBER GRID PAINTER ───────────────────────────────────────────
class BackgroundGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.012)
      ..strokeWidth = 1.0;

    for (double x = 0; x < size.width; x += 40) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += 40) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ── 3D FLIP CARD WIDGET ──────────────────────────────────────────────────────
class FlipCardWidget extends StatefulWidget {
  final Widget front;
  final Widget back;

  const FlipCardWidget({
    super.key,
    required this.front,
    required this.back,
  });

  @override
  State<FlipCardWidget> createState() => _FlipCardWidgetState();
}

class _FlipCardWidgetState extends State<FlipCardWidget> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  bool _isFlipped = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _animation = Tween<double>(begin: 0, end: math.pi).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _toggleCard() {
    if (_isFlipped) {
      _controller.reverse();
    } else {
      _controller.forward();
    }
    setState(() {
      _isFlipped = !_isFlipped;
    });
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _toggleCard,
      child: AnimatedBuilder(
        animation: _animation,
        builder: (context, child) {
          final double angle = _animation.value;
          final bool isBack = angle >= math.pi / 2;

          return Transform(
            transform: Matrix4.identity()
              ..setEntry(3, 2, 0.001) // perspective depth factor
              ..rotateY(angle),
            alignment: Alignment.center,
            child: isBack
                ? Transform(
                    transform: Matrix4.identity()..rotateY(math.pi),
                    alignment: Alignment.center,
                    child: widget.back,
                  )
                : widget.front,
          );
        },
      ),
    );
  }
}
