import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:compostos/models/user_model.dart';
import 'package:compostos/core/services/admin_api_service.dart';
import '../core/services/dio_provider.dart';
import '../core/services/auth_service.dart';

// Modelo para dados do dashboard administrativo
class AdminDashboardStats {
  final int totalUsers;
  final int activeUsers;
  final int newUsersToday;
  final double totalInvested;
  final double totalProfit;
  final int totalTasks;
  final int completedTasks;
  final int totalReferrals;
  final int activeReferrals;

  AdminDashboardStats({
    required this.totalUsers,
    required this.activeUsers,
    required this.newUsersToday,
    required this.totalInvested,
    required this.totalProfit,
    required this.totalTasks,
    required this.completedTasks,
    required this.totalReferrals,
    required this.activeReferrals,
  });

  factory AdminDashboardStats.fromJson(Map<String, dynamic> json) {
    return AdminDashboardStats(
      totalUsers: json['totalUsers'] ?? 0,
      activeUsers: json['activeUsers'] ?? 0,
      newUsersToday: json['newUsersToday'] ?? 0,
      totalInvested: (json['totalInvested'] ?? 0).toDouble(),
      totalProfit: (json['totalProfit'] ?? 0).toDouble(),
      totalTasks: json['totalTasks'] ?? 0,
      completedTasks: json['completedTasks'] ?? 0,
      totalReferrals: json['totalReferrals'] ?? 0,
      activeReferrals: json['activeReferrals'] ?? 0,
    );
  }
}

// Modelo para estatísticas de crescimento
class GrowthStats {
  final List<Map<String, dynamic>> userGrowth;
  final List<Map<String, dynamic>> investmentGrowth;
  final List<Map<String, dynamic>> transactionGrowth;

  GrowthStats({
    required this.userGrowth,
    required this.investmentGrowth,
    required this.transactionGrowth,
  });

  factory GrowthStats.fromJson(Map<String, dynamic> json) {
    return GrowthStats(
      userGrowth: List<Map<String, dynamic>>.from(json['userGrowth'] ?? []),
      investmentGrowth: List<Map<String, dynamic>>.from(json['investmentGrowth'] ?? []),
      transactionGrowth: List<Map<String, dynamic>>.from(json['transactionGrowth'] ?? []),
    );
  }
}

// Estado do provider administrativo
class AdminState {
  final AdminDashboardStats? dashboardStats;
  final GrowthStats? growthStats;
  final List<UserModel> users;
  final int currentPage;
  final int totalPages;
  final int totalUsers;
  final bool isLoading;
  final String? error;
  final String searchQuery;
  final String roleFilter;
  final String statusFilter;

  AdminState({
    this.dashboardStats,
    this.growthStats,
    List<UserModel>? users,
    this.currentPage = 1,
    this.totalPages = 1,
    this.totalUsers = 0,
    this.isLoading = false,
    this.error,
    this.searchQuery = '',
    this.roleFilter = '',
    this.statusFilter = '',
  }) : users = users ?? [];

  AdminState copyWith({
    AdminDashboardStats? dashboardStats,
    GrowthStats? growthStats,
    List<UserModel>? users,
    int? currentPage,
    int? totalPages,
    int? totalUsers,
    bool? isLoading,
    String? error,
    String? searchQuery,
    String? roleFilter,
    String? statusFilter,
  }) {
    return AdminState(
      dashboardStats: dashboardStats ?? this.dashboardStats,
      growthStats: growthStats ?? this.growthStats,
      users: users ?? this.users,
      currentPage: currentPage ?? this.currentPage,
      totalPages: totalPages ?? this.totalPages,
      totalUsers: totalUsers ?? this.totalUsers,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
      searchQuery: searchQuery ?? this.searchQuery,
      roleFilter: roleFilter ?? this.roleFilter,
      statusFilter: statusFilter ?? this.statusFilter,
    );
  }
}

// Provider do serviço administrativo
final adminApiServiceProvider = Provider<AdminApiService>((ref) {
  final dio = ref.watch(dioProvider);
  final authService = ref.watch(authServiceProvider);
  return AdminApiService(dio: dio, authService: authService);
});

// Provider do estado administrativo
final adminProvider = NotifierProvider<AdminNotifier, AdminState>(() {
  return AdminNotifier();
});

class AdminNotifier extends Notifier<AdminState> {
  late final AdminApiService _adminApiService;

  @override
  AdminState build() {
    _adminApiService = ref.watch(adminApiServiceProvider);
    return AdminState();
  }

  // Carregar estatísticas do dashboard
  Future<void> loadDashboardStats() async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      final stats = await _adminApiService.getDashboardStats();
      final dashboardStats = AdminDashboardStats.fromJson(stats);
      state = state.copyWith(dashboardStats: dashboardStats, isLoading: false);
    } catch (e) {
      state = state.copyWith(error: e.toString(), isLoading: false);
    }
  }

  // Carregar estatísticas de crescimento
  Future<void> loadGrowthStats() async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      final stats = await _adminApiService.getGrowthStats();
      final growthStats = GrowthStats.fromJson(stats);
      state = state.copyWith(growthStats: growthStats, isLoading: false);
    } catch (e) {
      state = state.copyWith(error: e.toString(), isLoading: false);
    }
  }

  // Carregar lista de usuários
  Future<void> loadUsers({
    int page = 1,
    String search = '',
    String role = '',
    String status = '',
  }) async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      final result = await _adminApiService.getUsers(
        page: page,
        search: search,
        role: role,
        status: status,
      );

      final users = (result['users'] as List)
          .map((user) => UserModel.fromJson(user))
          .toList();

      state = state.copyWith(
        users: users,
        currentPage: result['currentPage'],
        totalPages: result['totalPages'],
        totalUsers: result['totalUsers'],
        searchQuery: search,
        roleFilter: role,
        statusFilter: status,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(error: e.toString(), isLoading: false);
    }
  }

  // Carregar próxima página de usuários
  Future<void> loadNextPage() async {
    if (state.currentPage >= state.totalPages || state.isLoading) {
      return;
    }

    try {
      state = state.copyWith(isLoading: true);
      final result = await _adminApiService.getUsers(
        page: state.currentPage + 1,
        search: state.searchQuery,
        role: state.roleFilter,
        status: state.statusFilter,
      );

      final newUsers = (result['users'] as List)
          .map((user) => UserModel.fromJson(user))
          .toList();

      state = state.copyWith(
        users: [...state.users, ...newUsers],
        currentPage: result['currentPage'],
        totalPages: result['totalPages'],
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(error: e.toString(), isLoading: false);
    }
  }

  // Atualizar status de um usuário
  Future<void> updateUserStatus(String userId, bool isActive) async {
    try {
      await _adminApiService.updateUserStatus(userId, isActive);
      
      // Atualizar usuário na lista local
      final updatedUsers = state.users.map((user) {
        if (user.id == userId) {
          return user.copyWith(isActive: isActive);
        }
        return user;
      }).toList();

      state = state.copyWith(users: updatedUsers);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  // Atualizar role de um usuário
  Future<void> updateUserRole(String userId, String role) async {
    try {
      await _adminApiService.updateUserRole(userId, role);
      
      // Atualizar usuário na lista local
      final updatedUsers = state.users.map((user) {
        if (user.id == userId) {
          return user.copyWith(role: role);
        }
        return user;
      }).toList();

      state = state.copyWith(users: updatedUsers);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  // Limpar erros
  void clearError() {
    state = state.copyWith(error: null);
  }

  // Resetar estado
  void reset() {
    state = AdminState();
  }
}