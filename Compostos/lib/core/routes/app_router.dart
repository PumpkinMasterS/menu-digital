import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:compostos/screens/auth/login_screen.dart';
import 'package:compostos/screens/auth/register_screen.dart';
import 'package:compostos/screens/auth/register_advanced_screen.dart';
import 'package:compostos/screens/auth/forgot_password_screen.dart';
import 'package:compostos/screens/auth/reset_password_screen.dart';
import 'package:compostos/screens/robot_detail_screen.dart';
import 'package:compostos/screens/dashboard/dashboard_screen.dart';
import 'package:compostos/screens/investments/investments_screen.dart';
import 'package:compostos/screens/tasks/tasks_screen.dart';
import 'package:compostos/screens/referrals/referrals_screen.dart';
import 'package:compostos/screens/commissions/commissions_screen.dart';
import 'package:compostos/screens/profile/profile_screen.dart';
import 'package:compostos/screens/reports/reports_screen.dart';
import 'package:compostos/screens/admin/admin_dashboard_screen.dart';
import 'package:compostos/screens/achievements/achievements_screen.dart';
import 'package:compostos/screens/notifications_screen.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/providers/user_provider.dart';
import 'package:compostos/core/navigation/main_navigation.dart';
import 'package:compostos/core/routes/auth_listenable.dart';

final authListenableProvider = Provider((ref) => AuthListenable(ref));

final appRouterProvider = Provider<GoRouter>((ref) {
  final authListenable = ref.watch(authListenableProvider);

  return GoRouter(
    refreshListenable: authListenable,
    redirect: (context, state) {
      final user = ref.read(userProvider);
      final isAuthenticated = user != null;

      final isAuthRoute = state.matchedLocation == '/login' ||
                          state.matchedLocation == '/register' ||
                          state.matchedLocation == '/register-advanced' ||
                          state.matchedLocation == '/forgot-password' ||
                          state.matchedLocation.startsWith('/reset-password/');

      if (isAuthenticated && isAuthRoute) {
        return '/dashboard';
      }

      if (!isAuthenticated && !isAuthRoute) {
        return '/login';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/',
        redirect: (context, state) => '/dashboard',
      ),
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) => const MaterialPage(
          child: LoginScreen(),
        ),
      ),
      GoRoute(
        path: '/register',
        pageBuilder: (context, state) => const MaterialPage(
          child: RegisterScreen(),
        ),
      ),
      GoRoute(
        path: '/register-advanced',
        pageBuilder: (context, state) => const MaterialPage(
          child: RegisterAdvancedScreen(),
        ),
      ),
      GoRoute(
        path: '/forgot-password',
        pageBuilder: (context, state) => const MaterialPage(
          child: ForgotPasswordScreen(),
        ),
      ),
      GoRoute(
        path: '/reset-password/:resetToken',
        pageBuilder: (context, state) => MaterialPage(
          child: ResetPasswordScreen(resetToken: state.pathParameters['resetToken']!),
        ),
      ),
      ShellRoute(
        builder: (context, state, child) => MainNavigation(child: child, currentLocation: state.matchedLocation),
        routes: [
          GoRoute(
            path: '/dashboard',
            pageBuilder: (context, state) => const MaterialPage(
              child: DashboardScreen(),
            ),
          ),
          GoRoute(
            path: '/investments',
            pageBuilder: (context, state) => const MaterialPage(
              child: InvestmentsScreen(),
            ),
          ),
          GoRoute(
            path: '/tasks',
            pageBuilder: (context, state) => const MaterialPage(
              child: TasksScreen(),
            ),
          ),
          GoRoute(
            path: '/referrals',
            pageBuilder: (context, state) => const MaterialPage(
              child: ReferralsScreen(),
            ),
          ),
          GoRoute(
            path: '/commissions',
            pageBuilder: (context, state) => const MaterialPage(
              child: CommissionsScreen(),
            ),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (context, state) => const MaterialPage(
              child: ProfileScreen(),
            ),
          ),
          GoRoute(
            path: '/notifications',
            pageBuilder: (context, state) => const MaterialPage(
              child: NotificationsScreen(),
            ),
          ),
          GoRoute(
            path: '/achievements',
            pageBuilder: (context, state) => const MaterialPage(
              child: AchievementsScreen(),
            ),
          ),
          GoRoute(
            path: '/admin',
            pageBuilder: (context, state) => const MaterialPage(
              child: AdminDashboardScreen(),
            ),
          ),
        ],
      ),
      GoRoute(
        path: '/reports',
        pageBuilder: (context, state) => const MaterialPage(
          child: ReportsScreen(),
        ),
      ),
      GoRoute(
         path: '/robot-detail/:robotId',
         pageBuilder: (context, state) => MaterialPage(
           child: RobotDetailScreen(robotId: state.pathParameters['robotId']!),
         ),
       ),
    ],
    errorPageBuilder: (context, state) => const MaterialPage(
      child: Scaffold(
        body: Center(
          child: Text('Página não encontrada'),
        ),
      ),
    ),
  );
});