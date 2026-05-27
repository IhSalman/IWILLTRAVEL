import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/theme/app_theme.dart';
import '../../../data/services/api_service.dart';

class ItineraryFormScreen extends StatefulWidget {
  final String? cityId;
  final String? cityName;
  const ItineraryFormScreen({super.key, this.cityId, this.cityName});

  @override
  State<ItineraryFormScreen> createState() => _ItineraryFormScreenState();
}

class _ItineraryFormScreenState extends State<ItineraryFormScreen> {
  // Form state
  int _days = 5;
  String _budget = 'moderate';
  String _style = 'balanced';
  String _traveler = 'single';
  final List<String> _interests = [];
  bool _isGenerating = false;
  List<Map<String, String>> _agentLogs = [];
  String? _error;
  final _destCtrl = TextEditingController();

  static const _budgets = [
    {'value': 'budget', 'label': 'Budget', 'icon': '💰'},
    {'value': 'moderate', 'label': 'Moderate', 'icon': '💳'},
    {'value': 'luxury', 'label': 'Luxury', 'icon': '💎'},
  ];

  static const _styles = [
    {'value': 'relaxed', 'label': 'Relaxed', 'icon': '🌅'},
    {'value': 'balanced', 'label': 'Balanced', 'icon': '⚖️'},
    {'value': 'adventure', 'label': 'Adventure', 'icon': '🧗'},
    {'value': 'cultural', 'label': 'Cultural', 'icon': '🎭'},
  ];

  static const _travelers = [
    {'value': 'single', 'label': 'Solo', 'icon': '🧳'},
    {'value': 'couple', 'label': 'Couple', 'icon': '💑'},
    {'value': 'family', 'label': 'Family', 'icon': '👨‍👩‍👧'},
    {'value': 'friends', 'label': 'Friends', 'icon': '👥'},
  ];

  static const _interestList = [
    'Food & Dining',
    'Museums',
    'Nature',
    'Nightlife',
    'Shopping',
    'History',
    'Photography',
    'Local Markets',
    'Beaches',
    'Architecture',
  ];

  @override
  void initState() {
    super.initState();
    _destCtrl.text = widget.cityName ?? '';
  }

  @override
  void dispose() {
    _destCtrl.dispose();
    super.dispose();
  }

  Future<void> _generate() async {
    if (_destCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a destination')),
      );
      return;
    }

    setState(() {
      _isGenerating = true;
      _agentLogs = [];
      _error = null;
    });

    try {
      final finalItinerary = await ApiService.instance.generateItinerary(
        destination: _destCtrl.text.trim(),
        days: _days,
        budget: _budget,
        style: _style,
        travelerType: _traveler,
        interests: _interests,
        onAgentUpdate: (agent, status) {
          if (mounted) {
            setState(() {
              _agentLogs.add({'agent': agent, 'status': status});
            });
          }
        },
      );

      if (mounted) {
        // Save to Supabase
        final userId = Supabase.instance.client.auth.currentUser?.id;
        if (userId != null) {
          final newRow = await Supabase.instance.client.from('itineraries').insert({
            'user_id': userId,
            'city_id': widget.cityId ?? 'custom',
            'title': finalItinerary['title'] ?? 'My Itinerary',
            'content': finalItinerary,
            'days': _days,
            'budget': _budget,
            'travel_style': _style,
            'traveler_type': _traveler,
            'interests': _interests,
          }).select().single();

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('✅ Itinerary generated successfully!'),
                backgroundColor: AppColors.emerald,
              ),
            );
            context.pushReplacement('/itinerary/${newRow['id']}');
          }
        } else {
          if (mounted) {
            context.pop();
          }
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
        });
      }
    } finally {
      if (mounted) setState(() => _isGenerating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Plan Your Trip',
          style: Theme.of(context).textTheme.titleLarge,
        ),
      ),
      body: _isGenerating
          ? _buildGenerating()
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Destination
                  _section('Destination'),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _destCtrl,
                    style: const TextStyle(color: AppColors.onBackground),
                    decoration: const InputDecoration(
                      hintText: 'e.g. Tokyo, Paris, Bali...',
                      prefixIcon: Icon(
                        Icons.location_on_outlined,
                        color: AppColors.primary,
                      ),
                    ),
                  ).animate().fadeIn(),

                  const SizedBox(height: 28),

                  // Days
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _section('Duration'),
                      Text(
                        '$_days days',
                        style: GoogleFonts.inter(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Slider(
                    value: _days.toDouble(),
                    min: 1,
                    max: 14,
                    divisions: 13,
                    activeColor: AppColors.primary,
                    inactiveColor: AppColors.outlineVariant,
                    onChanged: (v) => setState(() => _days = v.toInt()),
                  ),

                  const SizedBox(height: 28),

                  // Budget
                  _section('Budget'),
                  const SizedBox(height: 12),
                  _optionRow(
                    _budgets,
                    _budget,
                    (v) => setState(() => _budget = v),
                  ),

                  const SizedBox(height: 28),

                  // Travel Style
                  _section('Travel Style'),
                  const SizedBox(height: 12),
                  _optionRow(
                    _styles,
                    _style,
                    (v) => setState(() => _style = v),
                  ),

                  const SizedBox(height: 28),

                  // Traveler Type
                  _section('Traveling as'),
                  const SizedBox(height: 12),
                  _optionRow(
                    _travelers,
                    _traveler,
                    (v) => setState(() => _traveler = v),
                  ),

                  const SizedBox(height: 28),

                  // Interests
                  _section('Interests'),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _interestList.map((interest) {
                      final selected = _interests.contains(interest);
                      return GestureDetector(
                        onTap: () {
                          setState(() {
                            if (selected) {
                              _interests.remove(interest);
                            } else {
                              _interests.add(interest);
                            }
                          });
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 8,
                          ),
                          decoration: BoxDecoration(
                            color: selected
                                ? AppColors.primary
                                : AppColors.surfaceLow,
                            borderRadius: BorderRadius.circular(50),
                            border: Border.all(
                              color: selected
                                  ? AppColors.primary
                                  : AppColors.outlineVariant,
                            ),
                          ),
                          child: Text(
                            interest,
                            style: TextStyle(
                              color: selected
                                  ? Colors.white
                                  : AppColors.onSurfaceVariant,
                              fontSize: 13,
                              fontWeight: selected
                                  ? FontWeight.w600
                                  : FontWeight.normal,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),

                  const SizedBox(height: 40),

                  // Error
                  if (_error != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.error.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: AppColors.error.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Text(
                        _error!,
                        style: const TextStyle(color: AppColors.error),
                      ),
                    ),

                  // Generate Button
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: _generate,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(18),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.auto_awesome, size: 20),
                          const SizedBox(width: 10),
                          Text(
                            'Generate AI Itinerary',
                            style: GoogleFonts.inter(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 32),
                ],
              ),
            ),
    );
  }

  Widget _buildGenerating() {
    final agentEmojis = {
      'Discovery': '🔍',
      'Planning': '🗺️',
      'Research': '✈️',
      'Finance': '💰',
      'Experience': '🎭',
      'Logistics': '🚗',
      'ESG': '🌱',
      'Composer': '✍️',
    };

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const SizedBox(height: 60),
        Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                gradient: const LinearGradient(colors: AppColors.heroGradient),
              ),
              child: const Icon(
                Icons.auto_awesome,
                size: 40,
                color: AppColors.onBackground,
              ),
            )
            .animate(onPlay: (c) => c.repeat())
            .shimmer(
              duration: 1500.ms,
              color: Colors.white.withValues(alpha: 0.3),
            ),

        const SizedBox(height: 24),
        Text(
          'Crafting your perfect trip...',
          style: GoogleFonts.montserrat(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppColors.onBackground,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          '8 AI agents are working in parallel',
          style: GoogleFonts.inter(color: AppColors.onSurfaceVariant, fontSize: 14),
        ),

        const SizedBox(height: 40),

        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: _agentLogs.length,
            itemBuilder: (_, i) {
              final log = _agentLogs[i];
              final emoji = agentEmojis.entries
                  .firstWhere(
                    (e) => log['agent']!.toLowerCase().contains(
                      e.key.toLowerCase(),
                    ),
                    orElse: () => const MapEntry('', '🤖'),
                  )
                  .value;
              final isDone = log['status'] == 'success';
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: AppColors.surfaceLow,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isDone
                        ? AppColors.emerald.withValues(alpha: 0.3)
                        : AppColors.outlineVariant,
                  ),
                ),
                child: Row(
                  children: [
                    Text(emoji, style: const TextStyle(fontSize: 20)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        log['agent'] ?? '',
                        style: TextStyle(
                          color: isDone ? Colors.white : AppColors.onSurfaceVariant,
                        ),
                      ),
                    ),
                    if (isDone)
                      const Icon(
                        Icons.check_circle_rounded,
                        color: AppColors.emerald,
                        size: 20,
                      )
                    else
                      const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.primary,
                        ),
                      ),
                  ],
                ),
              ).animate().fadeIn().slideX(begin: -0.3);
            },
          ),
        ),
      ],
    );
  }

  Widget _section(String title) => Text(
    title,
    style: GoogleFonts.inter(
      color: AppColors.onBackground,
      fontWeight: FontWeight.w600,
      fontSize: 15,
    ),
  );

  Widget _optionRow(
    List<Map<String, String>> options,
    String selected,
    Function(String) onSelect,
  ) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: options.map((opt) {
        final isActive = selected == opt['value'];
        return GestureDetector(
          onTap: () => onSelect(opt['value']!),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: isActive ? AppColors.primary : AppColors.surfaceLow,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isActive ? AppColors.primary : AppColors.outlineVariant,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(opt['icon']!, style: const TextStyle(fontSize: 16)),
                const SizedBox(width: 8),
                Text(
                  opt['label']!,
                  style: TextStyle(
                    color: isActive ? Colors.white : AppColors.onSurfaceVariant,
                    fontWeight: isActive ? FontWeight.w600 : FontWeight.normal,
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}
