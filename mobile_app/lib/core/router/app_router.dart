import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../presentation/screens/splash_screen.dart';
import '../../presentation/screens/auth/login_screen.dart';
import '../../presentation/screens/auth/signup_screen.dart';
import '../../presentation/screens/auth/onboarding_screen.dart';
import '../../presentation/screens/community/community_feed_screen.dart';
import '../../presentation/screens/translate/omni_linguist_screen.dart';
import '../../presentation/screens/main_shell.dart';
import '../../presentation/screens/discover/discover_screen.dart';
import '../../presentation/screens/itinerary/itinerary_form_screen.dart';
import '../../presentation/screens/itinerary/itinerary_detail_screen.dart';

import '../../presentation/screens/visa/visa_hub_screen.dart';
import '../../presentation/screens/news/travel_news_screen.dart';
import '../../presentation/screens/profile/profile_screen.dart';
import '../../presentation/screens/profile/saved_itineraries_screen.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final GoRouter appRouter = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/splash',
  redirect: (context, state) {
    final session = Supabase.instance.client.auth.currentSession;
    final isLoggedIn = session != null;
    final loc = state.matchedLocation;

    if (loc == '/splash') return null;
    if (!isLoggedIn && loc != '/login' && loc != '/signup' && loc != '/onboarding') return '/login';
    if (isLoggedIn && (loc == '/login' || loc == '/signup')) return '/discover';
    return null;
  },
  routes: [
    GoRoute(path: '/splash', builder: (context, state) => const SplashScreen()),
    GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
    GoRoute(path: '/signup', builder: (context, state) => const SignupScreen()),
    
    // Full-screen routes (no bottom nav)
    GoRoute(
      path: '/onboarding',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const OnboardingScreen(),
    ),
    GoRoute(
      path: '/itinerary/new',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) {
        final extra = state.extra as Map<String, dynamic>?;
        return ItineraryFormScreen(
          cityId: extra?['cityId'],
          cityName: extra?['cityName'],
        );
      },
    ),
    GoRoute(
      path: '/itinerary/:id',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) =>
          ItineraryDetailScreen(id: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/saved-itineraries',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const SavedItinerariesScreen(),
    ),

    // Shell (bottom nav)
    ShellRoute(
      navigatorKey: _shellNavigatorKey,
      builder: (context, state, child) => MainShell(child: child),
      routes: [
        GoRoute(path: '/discover', builder: (context, state) => const DiscoverScreen()),

        GoRoute(path: '/community', builder: (context, state) => const CommunityFeedScreen()),
        GoRoute(path: '/translate', builder: (context, state) => const OmniLinguistScreen()),
        GoRoute(path: '/visa', builder: (context, state) => const VisaHubScreen()),
        GoRoute(path: '/news', builder: (context, state) => const TravelNewsScreen()),
        GoRoute(path: '/profile', builder: (context, state) => const ProfileScreen()),
      ],
    ),
  ],
);
