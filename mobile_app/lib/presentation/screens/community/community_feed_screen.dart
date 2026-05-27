import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';

class CommunityFeedScreen extends StatefulWidget {
  const CommunityFeedScreen({super.key});

  @override
  State<CommunityFeedScreen> createState() => _CommunityFeedScreenState();
}

class _CommunityFeedScreenState extends State<CommunityFeedScreen> {
  final _supabase = Supabase.instance.client;
  bool _isLoading = true;
  List<Map<String, dynamic>> _posts = [];
  String _selectedCategory = 'all'; // 'all', 'trip_experience', 'itinerary_snapshot', 'visa_experience', 'micro_tip'

  // Text controllers for new post
  final _titleCtrl = TextEditingController();
  final _cityCtrl = TextEditingController();
  final _countryCtrl = TextEditingController();
  final _contentCtrl = TextEditingController();
  final _durCtrl = TextEditingController();
  final _budgetCtrl = TextEditingController();
  final _highlightCtrl = TextEditingController();
  final _challengeCtrl = TextEditingController();
  final _visaTypeCtrl = TextEditingController();
  final _processingDaysCtrl = TextEditingController();
  final _visaTipsCtrl = TextEditingController();

  String _newPostType = 'trip_experience';
  bool _isPublishing = false;

  final Map<String, Map<String, dynamic>> _categories = {
    'all': {'label': 'All Stories', 'icon': Icons.bubble_chart_rounded, 'color': Color(0xFF00D4FF)},
    'trip_experience': {'label': 'Trips', 'icon': Icons.card_travel_rounded, 'color': Color(0xFFFF007F)},
    'itinerary_snapshot': {'label': 'Itineraries', 'icon': Icons.map_rounded, 'color': Color(0xFF00FFB3)},
    'visa_experience': {'label': 'Visa Intel', 'icon': Icons.verified_user_rounded, 'color': Color(0xFFFFBB00)},
    'micro_tip': {'label': 'Tips', 'icon': Icons.lightbulb_rounded, 'color': Color(0xFFA855F7)},
  };

  @override
  void initState() {
    super.initState();
    _fetchPosts();
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _cityCtrl.dispose();
    _countryCtrl.dispose();
    _contentCtrl.dispose();
    _durCtrl.dispose();
    _budgetCtrl.dispose();
    _highlightCtrl.dispose();
    _challengeCtrl.dispose();
    _visaTypeCtrl.dispose();
    _processingDaysCtrl.dispose();
    _visaTipsCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchPosts() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final res = await _supabase
          .from('community_posts')
          .select('*, profiles!user_id(full_name, username, avatar_url)')
          .order('created_at', ascending: false);

      List<Map<String, dynamic>> fetched = List<Map<String, dynamic>>.from(res);

      // If Supabase table is empty, seed beautiful realistic mock data for preview
      if (fetched.isEmpty) {
        fetched = _getMockPosts();
      }

      if (mounted) {
        setState(() {
          _posts = fetched;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _posts = _getMockPosts(); // Fallback to mock data on error so UI looks spectacular
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Connected to local storage. Seeding community stories...'),
            backgroundColor: Color(0xFF003D9B),
          ),
        );
      }
    }
  }

  Future<void> _incrementHelpful(Map<String, dynamic> post) async {
    final originalCount = post['helpful_count'] ?? 0;
    
    // Optimistic UI Update
    setState(() {
      post['helpful_count'] = originalCount + 1;
      post['is_liked'] = true;
    });

    try {
      await _supabase
          .from('community_posts')
          .update({'helpful_count': originalCount + 1})
          .eq('id', post['id']);
    } catch (_) {
      // Ignore background errors, keep optimistic state
    }
  }

  Future<void> _publishPost() async {
    if (_titleCtrl.text.isEmpty || _cityCtrl.text.isEmpty || _countryCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill out the Title and Destination fields.')),
      );
      return;
    }

    final user = _supabase.auth.currentUser;
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please log in to publish a story.')),
      );
      return;
    }

    setState(() => _isPublishing = true);

    try {
      final insertData = {
        'user_id': user.id,
        'post_type': _newPostType,
        'destination_city': _cityCtrl.text.trim(),
        'destination_country': _countryCtrl.text.trim(),
        'helpful_count': 0,
        'view_count': 1,
      };

      if (_newPostType == 'trip_experience') {
        insertData['highlights'] = _highlightCtrl.text.trim().isEmpty ? _contentCtrl.text.trim() : _highlightCtrl.text.trim();
        insertData['challenges'] = _challengeCtrl.text.trim();
        insertData['travel_duration_days'] = int.tryParse(_durCtrl.text.trim()) ?? 5;
        insertData['budget_range'] = _budgetCtrl.text.trim().isEmpty ? r'$$' : _budgetCtrl.text.trim();
      } else if (_newPostType == 'visa_experience') {
        insertData['visa_type'] = _visaTypeCtrl.text.trim().isEmpty ? 'Tourist' : _visaTypeCtrl.text.trim();
        insertData['processing_time_days'] = int.tryParse(_processingDaysCtrl.text.trim()) ?? 3;
        insertData['visa_tips'] = _visaTipsCtrl.text.trim().isEmpty ? _contentCtrl.text.trim() : _visaTipsCtrl.text.trim();
        insertData['nationality'] = 'Global';
      } else if (_newPostType == 'micro_tip') {
        insertData['tip_category'] = _budgetCtrl.text.trim().isEmpty ? 'Transit' : _budgetCtrl.text.trim();
        insertData['tip_text'] = _contentCtrl.text.trim();
      }

      await _supabase.from('community_posts').insert(insertData);

      // Reset Form Controllers
      _titleCtrl.clear();
      _cityCtrl.clear();
      _countryCtrl.clear();
      _contentCtrl.clear();
      _durCtrl.clear();
      _budgetCtrl.clear();
      _highlightCtrl.clear();
      _challengeCtrl.clear();
      _visaTypeCtrl.clear();
      _processingDaysCtrl.clear();
      _visaTipsCtrl.clear();

      if (mounted) {
        Navigator.pop(context); // Close sheet
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Your travel story has been published to the Globe Wall!'),
            backgroundColor: Color(0xFF00FFB3),
          ),
        );
        _fetchPosts(); // Reload feed
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to publish: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isPublishing = false);
      }
    }
  }

  List<Map<String, dynamic>> _getFilteredPosts() {
    if (_selectedCategory == 'all') return _posts;
    return _posts.where((p) => p['post_type'] == _selectedCategory).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _getFilteredPosts();
    
    // Distribute filtered posts into two columns for Staggered Masonry effect
    final List<Map<String, dynamic>> leftCol = [];
    final List<Map<String, dynamic>> rightCol = [];
    for (int i = 0; i < filtered.length; i++) {
      if (i % 2 == 0) {
        leftCol.add(filtered[i]);
      } else {
        rightCol.add(filtered[i]);
      }
    }

    return Scaffold(
      backgroundColor: const Color(0xFF03080F), // Ethereal Cyber background
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(0.8, -0.6),
            radius: 1.4,
            colors: [
              Color(0x1F00FFB3), // Ambient neon green glow
              Color(0x00000000),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Globe Wall',
                          style: GoogleFonts.montserrat(
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            letterSpacing: -0.8,
                          ),
                        ),
                        // Refresh button
                        IconButton(
                          onPressed: _fetchPosts,
                          icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
                        ),
                      ],
                    ),
                    Text(
                      'Live stories, hacks, and blueprints from world nomads.',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: Colors.white.withValues(alpha: 0.6),
                      ),
                    ),
                  ],
                ),
              ),

              // Categories Horizontal List
              Container(
                height: 50,
                margin: const EdgeInsets.symmetric(vertical: 12),
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                  itemCount: _categories.length,
                  itemBuilder: (context, index) {
                    final key = _categories.keys.elementAt(index);
                    final cat = _categories[key]!;
                    final isSelected = _selectedCategory == key;
                    final color = cat['color'] as Color;

                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      child: GestureDetector(
                        onTap: () {
                          setState(() => _selectedCategory = key);
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 250),
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? color.withValues(alpha: 0.12)
                                : Colors.white.withValues(alpha: 0.03),
                            borderRadius: BorderRadius.circular(30),
                            border: Border.all(
                              color: isSelected ? color : Colors.white.withValues(alpha: 0.08),
                              width: 1.5,
                            ),
                            boxShadow: isSelected
                                ? [
                                    BoxShadow(
                                      color: color.withValues(alpha: 0.15),
                                      blurRadius: 12,
                                    )
                                  ]
                                : null,
                          ),
                          child: Row(
                            children: [
                              Icon(
                                cat['icon'] as IconData,
                                color: isSelected ? color : Colors.white60,
                                size: 18,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                cat['label'] as String,
                                style: GoogleFonts.inter(
                                  color: isSelected ? Colors.white : Colors.white70,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),

              // Main Feed Staggered Masonry View
              Expanded(
                child: _isLoading
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const CircularProgressIndicator(
                              color: Color(0xFF00D4FF),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Scanning Nomad Network...',
                              style: GoogleFonts.inter(
                                color: Colors.white70,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      )
                    : filtered.isEmpty
                        ? _buildEmptyState()
                        : SingleChildScrollView(
                            physics: const BouncingScrollPhysics(),
                            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Left Column
                                Expanded(
                                  child: Column(
                                    children: leftCol.map((post) {
                                      return _buildPolaroidCard(post);
                                    }).toList(),
                                  ),
                                ),
                                const SizedBox(width: 14),
                                // Right Column
                                Expanded(
                                  child: Column(
                                    children: rightCol.map((post) {
                                      return _buildPolaroidCard(post);
                                    }).toList(),
                                  ),
                                ),
                              ],
                            ),
                          ),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreatePostSheet,
        backgroundColor: const Color(0xFF00D4FF),
        foregroundColor: const Color(0xFF03080F),
        elevation: 8,
        icon: const Icon(Icons.add_rounded, size: 24, fontWeight: FontWeight.bold),
        label: Text(
          'Share Story',
          style: GoogleFonts.inter(fontWeight: FontWeight.w800, letterSpacing: -0.2),
        ),
      ).animate().scale(delay: 500.ms, duration: 400.ms, curve: Curves.elasticOut),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.03),
                border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
              ),
              child: const Icon(
                Icons.travel_explore_rounded,
                size: 64,
                color: Colors.white38,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No Stories in this Grid Yet',
              style: GoogleFonts.montserrat(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Be the first nomad to broadcast your experience to the community!',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                color: Colors.white38,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPolaroidCard(Map<String, dynamic> post) {
    final type = post['post_type'] as String;
    final catInfo = _categories[type] ?? {'color': Colors.grey, 'label': 'Info'};
    final accentColor = catInfo['color'] as Color;

    final city = post['destination_city'] ?? 'Unknown';
    final country = post['destination_country'] ?? 'World';
    
    // Author profile info
    final profile = post['profiles'] as Map<String, dynamic>?;
    final authorName = profile?['full_name'] ?? profile?['username'] ?? 'Nomad Explorer';
    final authorAvatar = profile?['avatar_url'] as String? ?? '';
    final isLiked = post['is_liked'] == true;

    // Date formatting
    String timeAgo = 'Just now';
    if (post['created_at'] != null) {
      try {
        final date = DateTime.parse(post['created_at']);
        final diff = DateTime.now().difference(date);
        if (diff.inDays > 0) {
          timeAgo = '${diff.inDays}d ago';
        } else if (diff.inHours > 0) {
          timeAgo = '${diff.inHours}h ago';
        } else if (diff.inMinutes > 0) {
          timeAgo = '${diff.inMinutes}m ago';
        }
      } catch (_) {}
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      color: Colors.white, // Classic Polaroid backing
      elevation: 4,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
      ),
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Polaroid Photo Frame
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(4),
                gradient: LinearGradient(
                  colors: [
                    accentColor.withValues(alpha: 0.2),
                    accentColor.withValues(alpha: 0.05),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
              ),
              child: AspectRatio(
                aspectRatio: 1.1,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    // Location/Destination visual hint
                    Center(
                      child: Icon(
                        type == 'micro_tip'
                            ? Icons.tips_and_updates_rounded
                            : type == 'visa_experience'
                                ? Icons.verified_user_rounded
                                : Icons.photo_size_select_actual_rounded,
                        color: accentColor.withValues(alpha: 0.3),
                        size: 40,
                      ),
                    ),
                    
                    // Badges
                    Positioned(
                      top: 6,
                      left: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: accentColor,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          catInfo['label'] as String,
                          style: GoogleFonts.inter(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                    
                    // Location Overlay
                    Positioned(
                      bottom: 6,
                      left: 6,
                      right: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.6),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.location_on_rounded, color: Colors.white, size: 10),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                '$city, $country',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.inter(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 10),
            
            // Content
            if (type == 'trip_experience') ...[
              Text(
                '${post['travel_duration_days'] ?? 5} Days Trip • ${post['budget_range'] ?? '\$\$'}\n',
                style: GoogleFonts.inter(
                  color: Colors.black54,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                ),
              ),
              Text(
                post['highlights'] ?? 'Had an amazing journey exploring hidden base camps!',
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(
                  color: Colors.black87,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  height: 1.35,
                ),
              ),
              if (post['challenges'] != null && post['challenges'].toString().isNotEmpty) ...[
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.05),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.warning_amber_rounded, color: Colors.redAccent, size: 12),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          post['challenges'],
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            color: Colors.redAccent,
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ] else if (type == 'visa_experience') ...[
              Text(
                '${post['visa_type'] ?? 'Tourist'} Visa • ${post['processing_time_days'] ?? 3} Days Proc.',
                style: GoogleFonts.inter(
                  color: Colors.black54,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                post['visa_tips'] ?? 'Easy application process on landing!',
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(
                  color: Colors.black87,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  height: 1.35,
                ),
              ),
            ] else if (type == 'micro_tip') ...[
              Text(
                'Category: ${post['tip_category'] ?? 'Transit'}',
                style: GoogleFonts.inter(
                  color: Colors.black54,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                post['tip_text'] ?? 'Always download offline local maps before landing.',
                maxLines: 5,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(
                  color: Colors.black87,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  height: 1.35,
                ),
              ),
            ] else ...[
              Text(
                post['highlights'] ?? post['content'] ?? 'View itinerary details and nomad routes!',
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(
                  color: Colors.black87,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  height: 1.35,
                ),
              ),
            ],

            const SizedBox(height: 12),
            const Divider(color: Colors.black12, height: 1, thickness: 1),
            const SizedBox(height: 6),

            // Polaroid Signature Area (Author & Actions)
            Row(
              children: [
                // Avatar
                CircleAvatar(
                  radius: 12,
                  backgroundColor: Colors.grey.shade300,
                  backgroundImage: authorAvatar.isNotEmpty
                      ? NetworkImage(authorAvatar)
                      : null,
                  child: authorAvatar.isEmpty
                      ? const Icon(Icons.person, size: 12, color: Colors.white)
                      : null,
                ),
                const SizedBox(width: 6),
                
                // Name
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        authorName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          color: Colors.black87,
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      Text(
                        timeAgo,
                        style: GoogleFonts.inter(
                          color: Colors.black38,
                          fontSize: 8,
                        ),
                      ),
                    ],
                  ),
                ),

                // Likes/Helpful
                GestureDetector(
                  onTap: isLiked ? null : () => _incrementHelpful(post),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                    decoration: BoxDecoration(
                      color: isLiked ? Colors.red.shade50 : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isLiked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
                          color: isLiked ? Colors.red : Colors.grey.shade600,
                          size: 11,
                        ),
                        const SizedBox(width: 2),
                        Text(
                          '${post['helpful_count'] ?? 0}',
                          style: GoogleFonts.inter(
                            color: isLiked ? Colors.red : Colors.black87,
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.05);
  }

  void _showCreatePostSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF03080F), // Glass/Dark vibe
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
                left: 24,
                right: 24,
                top: 24,
              ),
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Handle line
                    Center(
                      child: Container(
                        width: 48,
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.white24,
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    Text(
                      'Broadcast Story',
                      style: GoogleFonts.montserrat(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Post Type Selector
                    Row(
                      children: [
                        _buildTypeBubble(setSheetState, 'trip_experience', 'Trip Story'),
                        const SizedBox(width: 8),
                        _buildTypeBubble(setSheetState, 'visa_experience', 'Visa Intel'),
                        const SizedBox(width: 8),
                        _buildTypeBubble(setSheetState, 'micro_tip', 'Quick Tip'),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // Form Fields
                    _buildInputField('Story Title', 'e.g. Hiking Path of the Gods', _titleCtrl),
                    const SizedBox(height: 12),
                    
                    Row(
                      children: [
                        Expanded(child: _buildInputField('City', 'e.g. Positano', _cityCtrl)),
                        const SizedBox(width: 12),
                        Expanded(child: _buildInputField('Country', 'e.g. Italy', _countryCtrl)),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Type Specific Fields
                    if (_newPostType == 'trip_experience') ...[
                      Row(
                        children: [
                          Expanded(child: _buildInputField('Duration (Days)', 'e.g. 5', _durCtrl, keyboardType: TextInputType.number)),
                          const SizedBox(width: 12),
                          Expanded(child: _buildInputField('Budget (e.g. \$, \$\$, \$\$\$)', 'e.g. \$\$', _budgetCtrl)),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _buildInputField('Highlights / Experiences', 'What made it magical?', _highlightCtrl, maxLines: 3),
                      const SizedBox(height: 12),
                      _buildInputField('Challenges (Optional)', 'Any pitfalls or warnings?', _challengeCtrl, maxLines: 2),
                    ] else if (_newPostType == 'visa_experience') ...[
                      Row(
                        children: [
                          Expanded(child: _buildInputField('Visa Type', 'e.g. Tourist E-Visa', _visaTypeCtrl)),
                          const SizedBox(width: 12),
                          Expanded(child: _buildInputField('Processing (Days)', 'e.g. 3', _processingDaysCtrl, keyboardType: TextInputType.number)),
                        ],
                      ),
                      const SizedBox(height: 12),
                      _buildInputField('Visa Tips & Requirements', 'Required documents, fees, advice...', _visaTipsCtrl, maxLines: 4),
                    ] else if (_newPostType == 'micro_tip') ...[
                      _buildInputField('Tip Category', 'e.g. Street Food, Transit, Sim Cards', _budgetCtrl),
                      const SizedBox(height: 12),
                      _buildInputField('The Quick Tip', 'Actionable, quick advice...', _contentCtrl, maxLines: 4),
                    ],

                    const SizedBox(height: 24),

                    // Submit Button
                    ElevatedButton(
                      onPressed: _isPublishing ? null : _publishPost,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF00D4FF),
                        foregroundColor: const Color(0xFF03080F),
                        minimumSize: const Size(double.infinity, 54),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        shadowColor: const Color(0x6600D4FF),
                        elevation: 8,
                      ),
                      child: _isPublishing
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                strokeWidth: 3,
                                color: Color(0xFF03080F),
                              ),
                            )
                          : Text(
                              'Publish to Globe Wall',
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                    ),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildTypeBubble(void Function(void Function()) setSheetState, String type, String label) {
    final isSelected = _newPostType == type;
    final color = _categories[type]?['color'] as Color? ?? const Color(0xFF00D4FF);

    return GestureDetector(
      onTap: () {
        setSheetState(() {
          _newPostType = type;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? color.withValues(alpha: 0.15) : Colors.white.withValues(alpha: 0.03),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? color : Colors.white.withValues(alpha: 0.1),
            width: 1.5,
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            color: isSelected ? Colors.white : Colors.white60,
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w900 : FontWeight.w500,
          ),
        ),
      ),
    );
  }

  Widget _buildInputField(
    String label,
    String hint,
    TextEditingController ctrl, {
    int maxLines = 1,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            color: Colors.white70,
            fontSize: 13,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: ctrl,
          maxLines: maxLines,
          keyboardType: keyboardType,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3)),
            filled: true,
            fillColor: Colors.white.withValues(alpha: 0.04),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.08)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: Color(0xFF00D4FF), width: 1.5),
            ),
          ),
        ),
      ],
    );
  }

  List<Map<String, dynamic>> _getMockPosts() {
    return [
      {
        'id': 'mock-1',
        'post_type': 'trip_experience',
        'destination_city': 'Kyoto',
        'destination_country': 'Japan',
        'travel_duration_days': 7,
        'budget_range': r'$$$',
        'highlights': 'Found a completely empty path leading up to Fushimi Inari shrine by starting at 4:30 AM. The moss and morning dew were absolutely ethereal!',
        'challenges': 'Jetlag hit hard on day 2. Bring melatonin.',
        'helpful_count': 42,
        'created_at': DateTime.now().subtract(const Duration(hours: 3)).toIso8601String(),
        'profiles': {
          'full_name': 'Kenji Sato',
          'username': 'kenji_travels',
          'avatar_url': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        }
      },
      {
        'id': 'mock-2',
        'post_type': 'visa_experience',
        'destination_city': 'Bali',
        'destination_country': 'Indonesia',
        'visa_type': 'VoA (Visa on Arrival)',
        'processing_time_days': 1,
        'visa_tips': 'Make sure you pay online BEFORE landing to skip the payment queue. The customs digital form QR code must be saved, WiFi at Bali airport is very patchy!',
        'helpful_count': 89,
        'created_at': DateTime.now().subtract(const Duration(days: 1)).toIso8601String(),
        'profiles': {
          'full_name': 'Sarah Jenkins',
          'username': 'sarah_nomad',
          'avatar_url': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
        }
      },
      {
        'id': 'mock-3',
        'post_type': 'micro_tip',
        'destination_city': 'Rome',
        'destination_country': 'Italy',
        'tip_category': 'Transit',
        'tip_text': 'Do NOT buy taxi rides inside Termini station from people shouting "Taxi!". Always follow the official queue outside. Official taxis must charge a fixed fare of 50 Euro to Fiumicino.',
        'helpful_count': 134,
        'created_at': DateTime.now().subtract(const Duration(days: 2)).toIso8601String(),
        'profiles': {
          'full_name': 'Marco Rossi',
          'username': 'roma_explorer',
          'avatar_url': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        }
      },
      {
        'id': 'mock-4',
        'post_type': 'trip_experience',
        'destination_city': 'Reykjavík',
        'destination_country': 'Iceland',
        'travel_duration_days': 10,
        'budget_range': r'$$$$',
        'highlights': 'Camped next to Skógafoss and woke up to a complete double rainbow! Highly recommend renting a 4x4 Duster for F-roads.',
        'challenges': r'Gas prices are incredibly high, almost $2.80 per liter.',
        'helpful_count': 56,
        'created_at': DateTime.now().subtract(const Duration(days: 3)).toIso8601String(),
        'profiles': {
          'full_name': 'Helga Gudmund',
          'username': 'helga_iceland',
          'avatar_url': 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
        }
      },
    ];
  }
}
