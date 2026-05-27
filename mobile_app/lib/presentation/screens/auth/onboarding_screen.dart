import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/theme/app_theme.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _supabase = Supabase.instance.client;
  int _currentStep = 0;
  bool _isSaving = false;

  // Selections
  String? _selectedTravelStyle;
  final List<String> _selectedInterests = [];
  final List<String> _selectedAccessibility = [];

  final List<Map<String, dynamic>> _steps = [
    {
      'title': 'How do you like to travel?',
      'subtitle': 'Select a travel style that fits your vibe.',
      'field': 'travel_style',
      'multiple': false,
      'options': [
        {
          'id': 'luxury',
          'label': 'Luxury',
          'icon': Icons.auto_awesome_rounded,
          'desc': 'High-end experiences and maximum comfort'
        },
        {
          'id': 'budget',
          'label': 'Budget',
          'icon': Icons.bolt_rounded,
          'desc': 'Cost-conscious adventures and local finds'
        },
        {
          'id': 'balanced',
          'label': 'Balanced',
          'icon': Icons.flight_takeoff_rounded,
          'desc': 'A sweet spot between comfort and absolute value'
        },
      ]
    },
    {
      'title': 'What are your core interests?',
      'subtitle': 'Pick as many as you like to build your itineraries.',
      'field': 'interests',
      'multiple': true,
      'options': [
        {
          'id': 'culture',
          'label': 'Culture & History',
          'icon': Icons.museum_rounded,
        },
        {
          'id': 'nature',
          'label': 'Nature & Outdoors',
          'icon': Icons.forest_rounded,
        },
        {
          'id': 'food',
          'label': 'Food & Gastronomy',
          'icon': Icons.restaurant_rounded,
        },
        {
          'id': 'relaxation',
          'label': 'Relaxation & Spa',
          'icon': Icons.spa_rounded,
        },
      ]
    },
    {
      'title': 'Any accessibility needs?',
      'subtitle': 'Let us know if you require special support.',
      'field': 'accessibility',
      'multiple': true,
      'options': [
        {
          'id': 'wheelchair',
          'label': 'Wheelchair Access',
          'icon': Icons.accessible_rounded,
        },
        {
          'id': 'low_mobility',
          'label': 'Low Mobility',
          'icon': Icons.assist_walker_rounded,
        },
        {
          'id': 'none',
          'label': 'No specific needs',
          'icon': Icons.check_circle_outline_rounded,
        },
      ]
    }
  ];

  void _handleOptionSelect(String optionId, bool isMultiple) {
    setState(() {
      if (!isMultiple) {
        _selectedTravelStyle = optionId;
        // Auto-advance for single select
        Future.delayed(const Duration(milliseconds: 350), () {
          if (_currentStep < _steps.length - 1 && mounted) {
            setState(() => _currentStep++);
          }
        });
      } else {
        final targetList = _currentStep == 1 ? _selectedInterests : _selectedAccessibility;
        if (targetList.contains(optionId)) {
          targetList.remove(optionId);
        } else {
          // If 'none' selected in accessibility, clear others
          if (_currentStep == 2 && optionId == 'none') {
            targetList.clear();
          } else if (_currentStep == 2 && optionId != 'none') {
            targetList.remove('none');
          }
          targetList.add(optionId);
        }
      }
    });
  }

  bool _isNextEnabled() {
    if (_currentStep == 0) return _selectedTravelStyle != null;
    if (_currentStep == 1) return _selectedInterests.isNotEmpty;
    if (_currentStep == 2) return _selectedAccessibility.isNotEmpty;
    return false;
  }

  Future<void> _handleFinish() async {
    setState(() => _isSaving = true);
    try {
      final user = _supabase.auth.currentUser;
      if (user == null) {
        context.go('/login');
        return;
      }

      final preferencesMap = {
        'travel_style': _selectedTravelStyle,
        'interests': _selectedInterests,
        'accessibility': _selectedAccessibility,
      };

      final res = await _supabase
          .from('profiles')
          .update({
            'preferences': preferencesMap,
            'travel_style': _selectedTravelStyle,
          })
          .eq('id', user.id)
          .select();

      if (res.isEmpty) {
        throw Exception('Failed to save onboarding data.');
      }

      if (mounted) {
        context.go('/discover');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to save preferences. Please try again.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final step = _steps[_currentStep];
    final isMultiple = step['multiple'] as bool;
    final options = step['options'] as List<Map<String, dynamic>>;

    return Scaffold(
      backgroundColor: const Color(0xFF03080F), // Ethereal Cyber background
      body: SafeArea(
        child: Container(
          width: double.infinity,
          height: double.infinity,
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment(0, -0.6),
              radius: 1.2,
              colors: [
                Color(0x1A00D4FF), // Ambient cyan glow
                Color(0x00000000),
              ],
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Step Progress Bar
                Row(
                  children: List.generate(_steps.length, (index) {
                    final isActive = index <= _currentStep;
                    return Expanded(
                      child: Container(
                        height: 4,
                        margin: EdgeInsets.only(
                          right: index == _steps.length - 1 ? 0 : 8,
                        ),
                        decoration: BoxDecoration(
                          color: isActive
                              ? const Color(0xFF00D4FF) // Vibrant Cyan
                              : Colors.white.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: isActive
                              ? [
                                  const BoxShadow(
                                    color: Color(0x3300D4FF),
                                    blurRadius: 8,
                                    spreadRadius: 1,
                                  )
                                ]
                              : null,
                        ),
                      ),
                    );
                  }),
                ),

                const SizedBox(height: 48),

                // Question Header
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      step['title'] as String,
                      style: GoogleFonts.montserrat(
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      step['subtitle'] as String,
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        color: Colors.white.withValues(alpha: 0.6),
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                  ],
                ).animate(key: ValueKey(_currentStep)).fadeIn(duration: 400.ms).slideY(begin: 0.1),

                const SizedBox(height: 32),

                // Selection Options Grid
                Expanded(
                  child: ListView.builder(
                    itemCount: options.length,
                    itemBuilder: (context, index) {
                      final opt = options[index];
                      final optId = opt['id'] as String;

                      // Check selection state
                      final bool isSelected;
                      if (!isMultiple) {
                        isSelected = _selectedTravelStyle == optId;
                      } else {
                        final targetList = _currentStep == 1
                            ? _selectedInterests
                            : _selectedAccessibility;
                        isSelected = targetList.contains(optId);
                      }

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 16),
                        child: GestureDetector(
                          onTap: () => _handleOptionSelect(optId, isMultiple),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 250),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 18,
                            ),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? const Color(0x1A00D4FF) // cyan transparent
                                  : Colors.white.withValues(alpha: 0.03),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: isSelected
                                    ? const Color(0xFF00D4FF)
                                    : Colors.white.withValues(alpha: 0.08),
                                width: 1.5,
                              ),
                              boxShadow: isSelected
                                  ? [
                                      BoxShadow(
                                        color: const Color(0x1400D4FF),
                                        blurRadius: 16,
                                        offset: const Offset(0, 4),
                                      )
                                    ]
                                  : null,
                            ),
                            child: Row(
                              children: [
                                // Icon
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? const Color(0xFF00D4FF)
                                        : Colors.white.withValues(alpha: 0.05),
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: Icon(
                                    opt['icon'] as IconData,
                                    color: isSelected
                                        ? const Color(0xFF03080F)
                                        : Colors.white.withValues(alpha: 0.7),
                                    size: 24,
                                  ),
                                ),
                                const SizedBox(width: 18),
                                // Content
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        opt['label'] as String,
                                        style: GoogleFonts.inter(
                                          color: Colors.white,
                                          fontSize: 16,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                      if (opt.containsKey('desc')) ...[
                                        const SizedBox(height: 4),
                                        Text(
                                          opt['desc'] as String,
                                          style: GoogleFonts.inter(
                                            color: Colors.white
                                                .withValues(alpha: 0.45),
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                // Selection Dot / Check
                                Container(
                                  width: 24,
                                  height: 24,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: isSelected
                                          ? const Color(0xFF00D4FF)
                                          : Colors.white.withValues(alpha: 0.2),
                                      width: 2,
                                    ),
                                    color: isSelected
                                        ? const Color(0xFF00D4FF)
                                        : Colors.transparent,
                                  ),
                                  child: isSelected
                                      ? const Icon(
                                          Icons.check,
                                          color: Color(0xFF03080F),
                                          size: 14,
                                        )
                                      : null,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ).animate().fadeIn(delay: (index * 80).ms, duration: 400.ms).slideX(begin: 0.05);
                    },
                  ),
                ),

                const SizedBox(height: 24),

                // Action Navigation buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Previous Button
                    TextButton(
                      onPressed: _currentStep == 0
                          ? null
                          : () {
                              setState(() => _currentStep--);
                            },
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.white.withValues(alpha: 0.6),
                        disabledForegroundColor:
                            Colors.white.withValues(alpha: 0.1),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 16,
                        ),
                      ),
                      child: Text(
                        'Previous',
                        style: GoogleFonts.inter(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                    ),

                    // Next / Start Planning Button
                    _currentStep == _steps.length - 1
                        ? ElevatedButton(
                            onPressed:
                                (!_isNextEnabled() || _isSaving) ? null : _handleFinish,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF00D4FF),
                              foregroundColor: const Color(0xFF03080F),
                              disabledBackgroundColor:
                                  const Color(0xFF00D4FF).withValues(alpha: 0.3),
                              disabledForegroundColor:
                                  const Color(0xFF03080F).withValues(alpha: 0.5),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 32,
                                vertical: 16,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              elevation: 8,
                              shadowColor: const Color(0x3300D4FF),
                            ),
                            child: _isSaving
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2.5,
                                      color: Color(0xFF03080F),
                                    ),
                                  )
                                : Text(
                                    'Start Planning',
                                    style: GoogleFonts.inter(
                                      fontWeight: FontWeight.w900,
                                      fontSize: 15,
                                    ),
                                  ),
                          )
                        : ElevatedButton(
                            onPressed: !_isNextEnabled()
                                ? null
                                : () {
                                    setState(() => _currentStep++);
                                  },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white.withValues(alpha: 0.08),
                              foregroundColor: Colors.white,
                              disabledBackgroundColor:
                                  Colors.white.withValues(alpha: 0.02),
                              disabledForegroundColor:
                                  Colors.white.withValues(alpha: 0.2),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 28,
                                vertical: 16,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                                side: BorderSide(
                                  color: _isNextEnabled()
                                      ? Colors.white.withValues(alpha: 0.15)
                                      : Colors.transparent,
                                ),
                              ),
                              elevation: 0,
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'Next',
                                  style: GoogleFonts.inter(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Icon(Icons.arrow_forward, size: 16),
                              ],
                            ),
                          ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
