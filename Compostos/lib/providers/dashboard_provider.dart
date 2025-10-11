import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/core/services/dashboard_service.dart';
import 'package:compostos/core/services/auth_service.dart';
import 'package:compostos/core/services/websocket_service.dart';
import 'package:dio/dio.dart';
import 'package:compostos/providers/user_provider.dart';

// Estado das estatísticas do dashboard
class DashboardStats {
  final double totalBalance;
  final double dailyEarnings;
  final double totalEarnings;
  final int activeRobots;
  final int totalRobots;
  final int pendingTasks;
  final int completedTasks;
  final int totalReferrals;
  final double referralEarnings;
  final bool isLoading;
  final String? error;

  DashboardStats({
    required this.totalBalance,
    required this.dailyEarnings,
    required this.totalEarnings,
    required this.activeRobots,
    required this.totalRobots,
    required this.pendingTasks,
    required this.completedTasks,
    required this.totalReferrals,
    required this.referralEarnings,
    this.isLoading = false,
    this.error,
  });

  DashboardStats loading() {
    return DashboardStats(
      totalBalance: totalBalance,
      dailyEarnings: dailyEarnings,
      totalEarnings: totalEarnings,
      activeRobots: activeRobots,
      totalRobots: totalRobots,
      pendingTasks: pendingTasks,
      completedTasks: completedTasks,
      totalReferrals: totalReferrals,
      referralEarnings: referralEarnings,
      isLoading: true,
      error: error,
    );
  }

  DashboardStats copyWith({
    double? totalBalance,
    double? dailyEarnings,
    double? totalEarnings,
    int? activeRobots,
    int? totalRobots,
    int? pendingTasks,
    int? completedTasks,
    int? totalReferrals,
    double? referralEarnings,
    bool? isLoading,
    String? error,
  }) {
    return DashboardStats(
      totalBalance: totalBalance ?? this.totalBalance,
      dailyEarnings: dailyEarnings ?? this.dailyEarnings,
      totalEarnings: totalEarnings ?? this.totalEarnings,
      activeRobots: activeRobots ?? this.activeRobots,
      totalRobots: totalRobots ?? this.totalRobots,
      pendingTasks: pendingTasks ?? this.pendingTasks,
      completedTasks: completedTasks ?? this.completedTasks,
      totalReferrals: totalReferrals ?? this.totalReferrals,
      referralEarnings: referralEarnings ?? this.referralEarnings,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }

  // Estado inicial
  static DashboardStats initial() {
    return DashboardStats(
      totalBalance: 0.0,
      dailyEarnings: 0.0,
      totalEarnings: 0.0,
      activeRobots: 0,
      totalRobots: 0,
      pendingTasks: 0,
      completedTasks: 0,
      totalReferrals: 0,
      referralEarnings: 0.0,
    );
  }
}

// Notifier para gerenciar as estatísticas do dashboard
class DashboardStatsNotifier extends Notifier<DashboardStats> {
  @override
  DashboardStats build() {
    return DashboardStats.initial();
  }

  // Carregar estatísticas do dashboard
  Future<void> loadDashboardStats() async {
    try {
      // Verifica autenticação antes de carregar
      final isLogged = await ref.read(authServiceProvider).isLoggedIn();
      if (!isLogged) {
        // Não tenta carregar quando não autenticado
        state = state.copyWith(isLoading: false, error: 'Não autenticado');
        return;
      }

      state = state.copyWith(isLoading: true, error: null);
      
      final dashboardService = ref.read(dashboardServiceProvider);
      final stats = await dashboardService.getDashboardStats();
      
      // Converter os dados da API para os tipos corretos
      state = DashboardStats(
        totalBalance: _convertToDouble(stats['totalBalance']),
        dailyEarnings: _convertToDouble(stats['dailyEarnings']),
        totalEarnings: _convertToDouble(stats['totalEarnings']),
        activeRobots: _convertToInt(stats['activeRobots']),
        totalRobots: _convertToInt(stats['totalRobots']),
        pendingTasks: _convertToInt(stats['pendingTasks']),
        completedTasks: _convertToInt(stats['completedTasks']),
        totalReferrals: _convertToInt(stats['totalReferrals']),
        referralEarnings: _convertToDouble(stats['referralEarnings']),
        isLoading: false,
      );
    } catch (e, stackTrace) {
      if (e is DioException && (e.response?.statusCode == 401 || e.response?.statusCode == 403)) {
        await ref.read(userProvider.notifier).logout();
        state = state.copyWith(isLoading: false, error: 'Sessão expirada');
        return;
      }
      print('Erro ao carregar estatísticas do dashboard: $e');
      print('Tipo de exceção: ${e.runtimeType}');
      print(stackTrace);
      state = state.copyWith(isLoading: false, error: 'Falha ao carregar dados: $e');
    }
  }

  // Atualizar estatísticas específicas
  void updateBalance(double newBalance) {
    state = state.copyWith(totalBalance: newBalance);
  }

  void addDailyEarnings(double earnings) {
    state = state.copyWith(
      dailyEarnings: state.dailyEarnings + earnings,
      totalEarnings: state.totalEarnings + earnings,
    );
  }

  void incrementActiveRobots() {
    state = state.copyWith(
      activeRobots: state.activeRobots + 1,
      totalRobots: state.totalRobots + 1,
    );
  }

  void incrementCompletedTasks() {
    state = state.copyWith(
      completedTasks: state.completedTasks + 1,
      pendingTasks: state.pendingTasks > 0 ? state.pendingTasks - 1 : 0,
    );
  }

  // Métodos auxiliares para conversão de tipos
  double _convertToDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  int _convertToInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is double) return value.toInt();
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }

  // Atualizar dashboard completo via WebSocket
  void updateFromWebSocket(Map<String, dynamic> data) {
    state = DashboardStats(
      totalBalance: _convertToDouble(data['user']?['balance']),
      dailyEarnings: _convertToDouble(data['investments']?['totalProfit']),
      totalEarnings: _convertToDouble(data['user']?['totalEarnings']),
      activeRobots: _convertToInt(data['investments']?['activeCount']),
      totalRobots: _convertToInt(data['investments']?['activeCount']), // Ajustar conforme necessário
      pendingTasks: _convertToInt(data['tasks']?['pending']),
      completedTasks: _convertToInt(data['tasks']?['completed']),
      totalReferrals: _convertToInt(data['user']?['referralCount']),
      referralEarnings: 0.0, // Ajustar conforme necessário
      isLoading: false,
    );
  }

  // Atualizar apenas o saldo via WebSocket
  void updateBalanceFromWebSocket(double newBalance) {
    state = state.copyWith(totalBalance: newBalance);
  }

  // Atualizar tarefas via WebSocket
  void updateTasksFromWebSocket(Map<String, dynamic> stats) {
    state = state.copyWith(
      pendingTasks: _convertToInt(stats['pending']),
      completedTasks: _convertToInt(stats['completed']),
    );
  }
}

// Provider para as estatísticas do dashboard
final dashboardStatsProvider = NotifierProvider<DashboardStatsNotifier, DashboardStats>(() {
  return DashboardStatsNotifier();
});

// Provider para carregar estatísticas automaticamente
final dashboardStatsLoaderProvider = FutureProvider<void>((ref) async {
  final isLogged = await ref.read(authServiceProvider).isLoggedIn();
  if (isLogged) {
    final notifier = ref.read(dashboardStatsProvider.notifier);
    await notifier.loadDashboardStats();
  }
  return;
});