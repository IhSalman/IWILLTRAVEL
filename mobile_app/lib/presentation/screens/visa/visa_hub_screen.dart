import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/services/api_service.dart';

class VisaHubScreen extends StatefulWidget {
  const VisaHubScreen({super.key});
  @override
  State<VisaHubScreen> createState() => _VisaHubScreenState();
}

class _VisaHubScreenState extends State<VisaHubScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tab;
  // Checker
  final _srcCtrl = TextEditingController();
  final _dstCtrl = TextEditingController();
  bool _checking = false;
  Map<String, dynamic>? _visaResult;
  // Denial
  final _natCtrl = TextEditingController();
  final _denDstCtrl = TextEditingController();
  final _empCtrl = TextEditingController();
  final _incCtrl = TextEditingController();
  bool _assessing = false;
  Map<String, dynamic>? _denialResult;
  // Passport
  final _ppCtrl = TextEditingController();
  bool _loadingPP = false;
  Map<String, dynamic>? _passportResult;
  // Simplifier
  final _rawCtrl = TextEditingController();
  bool _simplifying = false;
  Map<String, dynamic>? _simplifiedResult;

  @override
  void initState() {
    super.initState();
    _tab = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tab.dispose();
    super.dispose();
  }

  Future<void> _checkVisa() async {
    if (_srcCtrl.text.isEmpty || _dstCtrl.text.isEmpty) return;
    setState(() {
      _checking = true;
      _visaResult = null;
    });
    try {
      final res = await ApiService.instance.checkVisa(
        sourceCountry: _srcCtrl.text,
        destinationCountry: _dstCtrl.text,
      );
      setState(() => _visaResult = res);
    } catch (_) {}
    setState(() => _checking = false);
  }

  Future<void> _assessDenial() async {
    if (_natCtrl.text.isEmpty || _denDstCtrl.text.isEmpty) return;
    setState(() {
      _assessing = true;
      _denialResult = null;
    });
    try {
      final res = await ApiService.instance.assessDenialRisk(
        nationality: _natCtrl.text,
        destination: _denDstCtrl.text,
        employment: _empCtrl.text,
        income: _incCtrl.text,
      );
      setState(() => _denialResult = res);
    } catch (_) {}
    setState(() => _assessing = false);
  }

  Future<void> _lookupPassport() async {
    if (_ppCtrl.text.isEmpty) return;
    setState(() {
      _loadingPP = true;
      _passportResult = null;
    });
    try {
      final res = await ApiService.instance.getPassportStrength(_ppCtrl.text);
      setState(() => _passportResult = res);
    } catch (_) {}
    setState(() => _loadingPP = false);
  }

  Future<void> _simplify() async {
    if (_rawCtrl.text.isEmpty) return;
    setState(() {
      _simplifying = true;
      _simplifiedResult = null;
    });
    try {
      final res = await ApiService.instance.simplifyVisaRequirements(_rawCtrl.text);
      setState(() => _simplifiedResult = res);
    } catch (_) {}
    setState(() => _simplifying = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: NestedScrollView(
        headerSliverBuilder: (ctx, _) => [
          SliverAppBar(
            backgroundColor: AppColors.background,
            pinned: true,
            expandedHeight: 140,
            flexibleSpace: FlexibleSpaceBar(
              titlePadding: const EdgeInsets.fromLTRB(16, 0, 16, 56),
              title: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        const Text(
                          'VISA PORTAL',
                          style: TextStyle(
                            fontSize: 8,
                            color: AppColors.primary,
                            letterSpacing: 1.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  RichText(
                    text: const TextSpan(
                      children: [
                        TextSpan(
                          text: 'VISA ',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            color: AppColors.onBackground,
                            letterSpacing: -0.5,
                          ),
                        ),
                        TextSpan(
                          text: 'HUB',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w300,
                            color: AppColors.primary,
                            letterSpacing: -0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            bottom: TabBar(
              controller: _tab,
              isScrollable: true,
              tabAlignment: TabAlignment.start,
              indicatorColor: AppColors.primary,
              dividerColor: Colors.transparent,
              labelColor: AppColors.onBackground,
              unselectedLabelColor: AppColors.onSurfaceVariant,
              labelStyle: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                letterSpacing: 1,
              ),
              tabs: const [
                Tab(text: 'Do I need a Visa?'),
                Tab(text: 'Will I get denied?'),
                Tab(text: 'Passport Power'),
                Tab(text: 'Make it simple'),
              ],
            ),
          ),
        ],
        body: TabBarView(
          controller: _tab,
          children: [
            _buildCheckerTab(),
            _buildDenialTab(),
            _buildPassportTab(),
            _buildSimplifierTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildCheckerTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _glassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _label('Where are you from?', AppColors.primary),
                _field(_srcCtrl, 'e.g. United Kingdom', AppColors.primary),
                const SizedBox(height: 16),
                _label('Where are you going?', AppColors.secondary),
                _field(_dstCtrl, 'e.g. Japan', AppColors.secondary),
                const SizedBox(height: 20),
                _actionBtn(
                  'Check Visa Requirements',
                  _checking,
                  _checkVisa,
                  AppColors.primary,
                ),
              ],
            ),
          ),
          if (_checking) ...[const SizedBox(height: 24), _radarWidget()],
          if (_visaResult != null) ...[
            const SizedBox(height: 20),
            _visaResultCard(),
          ],
        ],
      ),
    );
  }

  Widget _visaResultCard() {
    final v = _visaResult!;
    final color = _statusColor(v['statusColor']);
    return _glassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${_srcCtrl.text} → ${_dstCtrl.text}',
                  style: GoogleFonts.inter(
                    color: AppColors.onBackground,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  v['status'] ?? '',
                  style: GoogleFonts.inter(
                    color: color,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            v['description'] ?? '',
            style: GoogleFonts.inter(
              color: AppColors.onSurfaceVariant,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _statChip('TIME', v['processingTime']),
              const SizedBox(width: 8),
              _statChip('COST', v['estimatedCost']),
              const SizedBox(width: 8),
              _statChip('STAY', v['maxStay']),
            ],
          ),
          if ((v['requirements'] as List?)?.isNotEmpty == true) ...[
            const SizedBox(height: 16),
            const Text(
              'REQUIRED DOCS',
              style: TextStyle(
                color: AppColors.primary,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            ...(v['requirements'] as List).map(
              (r) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _glassCard(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.check_circle_outline,
                        color: AppColors.emerald,
                        size: 16,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          r['title'] ?? '',
                          style: GoogleFonts.inter(
                            color: AppColors.onBackground,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDenialTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _glassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.shield, color: AppColors.error, size: 32),
                const SizedBox(height: 8),
                const Text(
                  'WILL I GET DENIED?',
                  style: TextStyle(
                    color: AppColors.onBackground,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Fill this out to see if your visa might be denied.',
                  style: GoogleFonts.inter(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 20),
                _label('Nationality', AppColors.error),
                _field(_natCtrl, 'e.g. Nigeria', AppColors.error),
                const SizedBox(height: 12),
                _label('Destination', AppColors.error),
                _field(_denDstCtrl, 'e.g. United States', AppColors.error),
                const SizedBox(height: 12),
                _label('What is your job?', AppColors.error),
                _field(_empCtrl, 'e.g. Software Engineer', AppColors.error),
                const SizedBox(height: 12),
                _label('How much do you earn per month?', AppColors.error),
                _field(_incCtrl, 'e.g. \$2,500/month', AppColors.error),
                const SizedBox(height: 20),
                _actionBtn(
                  'Check My Risk',
                  _assessing,
                  _assessDenial,
                  AppColors.error,
                ),
              ],
            ),
          ),
          if (_denialResult != null) ...[
            const SizedBox(height: 20),
            _denialResultCard(),
          ],
        ],
      ),
    );
  }

  Widget _denialResultCard() {
    final d = _denialResult!;
    final score = int.tryParse(d['riskScore']?.toString() ?? '50') ?? 50;
    final color = score > 70
        ? AppColors.error
        : score > 40
        ? AppColors.amber
        : AppColors.emerald;
    return _glassCard(
      child: Column(
        children: [
          Row(
            children: [
              SizedBox(
                width: 100,
                height: 100,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    CircularProgressIndicator(
                      value: score / 100,
                      strokeWidth: 8,
                      backgroundColor: AppColors.surfaceHighest,
                      color: color,
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '$score%',
                          style: GoogleFonts.inter(
                            color: color,
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          'RISK',
                          style: GoogleFonts.inter(
                            color: AppColors.onSurfaceVariant,
                            fontSize: 9,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      d['riskLevel'] ?? '',
                      style: GoogleFonts.inter(
                        color: color,
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      d['summary'] ?? '',
                      style: GoogleFonts.inter(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if ((d['topRiskFactors'] as List?)?.isNotEmpty == true) ...[
            const SizedBox(height: 24),
            ...((d['topRiskFactors'] as List).map(
              (rf) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Icon(
                      Icons.warning_amber_rounded,
                      color: rf['severity'] == 'high'
                          ? AppColors.error
                          : AppColors.amber,
                      size: 16,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            rf['factor'] ?? '',
                            style: GoogleFonts.inter(
                              color: AppColors.onBackground,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            rf['advice'] ?? '',
                            style: GoogleFonts.inter(
                              color: AppColors.onSurfaceVariant,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            )),
          ],
        ],
      ),
    );
  }

  Widget _buildPassportTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _glassCard(
            child: Column(
              children: [
                const Icon(
                  Icons.fingerprint,
                  color: AppColors.emerald,
                  size: 48,
                ),
                const SizedBox(height: 12),
                const Text(
                  'HOW STRONG IS YOUR PASSPORT?',
                  style: TextStyle(
                    color: AppColors.onBackground,
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 16),
                _field(
                  _ppCtrl,
                  'Enter country (e.g. Germany)',
                  AppColors.emerald,
                ),
                const SizedBox(height: 12),
                _actionBtn(
                  'Check Passport',
                  _loadingPP,
                  _lookupPassport,
                  AppColors.emerald,
                ),
              ],
            ),
          ),
          if (_passportResult != null) ...[
            const SizedBox(height: 20),
            _passportResultCard(),
          ],
        ],
      ),
    );
  }

  Widget _passportResultCard() {
    final p = _passportResult!;
    return _glassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  _ppCtrl.text.toUpperCase(),
                  style: GoogleFonts.inter(
                    color: AppColors.onBackground,
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.emerald.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Text(
                      '#${p['passportRank'] ?? '--'}',
                      style: GoogleFonts.inter(
                        color: AppColors.emerald,
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      'RANK',
                      style: GoogleFonts.inter(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 9,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _statChip('VISA-FREE', '${p['visaFreeCount'] ?? '--'}'),
              const SizedBox(width: 8),
              _statChip('MOBILITY', '${p['mobilityScore'] ?? '--'}'),
            ],
          ),
          if (p['tip'] != null) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.surfaceHigh,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                p['tip'],
                style: GoogleFonts.inter(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 12,
                ),
              ),
            ),
          ],
          if ((p['topDestinations'] as List?)?.isNotEmpty == true) ...[
            const SizedBox(height: 16),
            const Text(
              'VISA-FREE DESTINATIONS',
              style: TextStyle(
                color: AppColors.primary,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            ...(p['topDestinations'] as List)
                .take(6)
                .map(
                  (d) => Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.flight_takeoff,
                          size: 14,
                          color: AppColors.onSurfaceVariant,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            d['country'] ?? '',
                            style: GoogleFonts.inter(
                              color: AppColors.onBackground,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.emerald.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            d['entryType'] ?? '',
                            style: GoogleFonts.inter(
                              color: AppColors.emerald,
                              fontSize: 10,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
          ],
        ],
      ),
    );
  }

  Widget _buildSimplifierTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _glassCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(
                      Icons.document_scanner_outlined,
                      color: AppColors.amber,
                      size: 24,
                    ),
                    SizedBox(width: 8),
                    Text(
                      'VISA TEXT SIMPLIFIER',
                      style: TextStyle(
                        color: AppColors.onBackground,
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.5,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Paste long, confusing embassy text here and AI will summarize it in simple words.',
                  style: GoogleFonts.inter(
                    color: AppColors.onSurfaceVariant,
                    fontSize: 12,
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  height: 160,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceHighest,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: TextField(
                    controller: _rawCtrl,
                    maxLines: null,
                    expands: true,
                    style: GoogleFonts.inter(color: AppColors.onBackground, fontSize: 13),
                    decoration: const InputDecoration(
                      hintText: 'Paste official embassy text here...',
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding: EdgeInsets.all(12),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                _actionBtn('Make it simple', _simplifying, _simplify, AppColors.amber),
              ],
            ),
          ),
          if (_simplifiedResult != null) ...[
            const SizedBox(height: 20),
            _simplifiedResultCard(),
          ],
        ],
      ),
    );
  }

  Widget _simplifiedResultCard() {
    final s = _simplifiedResult!;
    return _glassCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'SIMPLE SUMMARY',
            style: TextStyle(
              color: AppColors.amber,
              fontSize: 10,
              fontWeight: FontWeight.bold,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(height: 12),
          if (s['summary'] != null)
            Text(
              s['summary'],
              style: GoogleFonts.inter(
                color: AppColors.onBackground,
                fontSize: 14,
                height: 1.6,
              ),
            ),
          if ((s['keyPoints'] as List?)?.isNotEmpty == true) ...[
            const SizedBox(height: 16),
            const Text(
              'KEY POINTS',
              style: TextStyle(
                color: AppColors.primary,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            ...(s['keyPoints'] as List).map(
              (kp) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '•',
                      style: TextStyle(color: AppColors.primary, fontSize: 16),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        kp.toString(),
                        style: GoogleFonts.inter(
                          color: AppColors.onBackground,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  Widget _glassCard({required Widget child, EdgeInsets? padding}) => Container(
    width: double.infinity,
    padding: padding ?? const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: AppColors
          .surface, // Stitch layer hierarchy instead of transparent glass with borders
      borderRadius: BorderRadius.circular(20),
    ),
    child: child,
  );

  Widget _label(String text, Color color) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text(
      text,
      style: GoogleFonts.inter(
        color: color,
        fontSize: 10,
        fontWeight: FontWeight.bold,
        letterSpacing: 2,
      ),
    ),
  );

  Widget _field(TextEditingController ctrl, String hint, Color accent) =>
      TextField(
        controller: ctrl,
        style: GoogleFonts.inter(color: AppColors.onBackground),
        decoration: InputDecoration(
          hintText: hint,
          fillColor: AppColors.surfaceHighest, // Nested layer
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(
              color: accent.withValues(alpha: 0.4),
              width: 1,
            ),
          ),
        ),
      );

  Widget _actionBtn(
    String label,
    bool loading,
    VoidCallback onTap,
    Color color,
  ) => SizedBox(
    width: double.infinity,
    height: 52,
    child: ElevatedButton(
      onPressed: loading ? null : onTap,
      style: ElevatedButton.styleFrom(
        backgroundColor: color.withValues(alpha: 0.15),
        foregroundColor: color,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      child: loading
          ? SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2, color: color),
            )
          : Text(
              label,
              style: GoogleFonts.inter(
                fontWeight: FontWeight.w900,
                letterSpacing: 2,
                fontSize: 13,
              ),
            ),
    ),
  );

  Widget _statChip(String label, dynamic value) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surfaceHigh,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: GoogleFonts.inter(
              color: AppColors.onSurfaceVariant,
              fontSize: 9,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value?.toString() ?? '--',
            style: GoogleFonts.inter(
              color: AppColors.onBackground,
              fontSize: 13,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    ),
  );

  Widget _radarWidget() => Center(
    child: Container(
      width: 120,
      height: 120,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: AppColors.primary.withValues(alpha: 0.05),
      ),
      child: const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 32,
            height: 32,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: AppColors.primary,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'SCANNING',
            style: TextStyle(
              color: AppColors.primary,
              fontSize: 9,
              letterSpacing: 2,
            ),
          ),
        ],
      ),
    ),
  );

  Color _statusColor(String? s) {
    switch (s) {
      case 'green':
        return AppColors.emerald;
      case 'blue':
        return AppColors.primary;
      case 'yellow':
        return AppColors.amber;
      case 'orange':
        return AppColors.tertiary;
      case 'red':
        return AppColors.error;
      default:
        return AppColors.primary;
    }
  }
}
