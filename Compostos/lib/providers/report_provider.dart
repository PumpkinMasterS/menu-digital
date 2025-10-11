import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/core/services/report_api_service.dart';

// Modelos para os relatórios
class PerformanceReportData {
  final Map<String, dynamic> userStats;
  final Map<String, dynamic> investmentStats;
  final Map<String, dynamic> transactionStats;
  final Map<String, dynamic> taskStats;
  final Map<String, dynamic> referralStats;
  final List<dynamic> growthStats;
  final Map<String, dynamic> period;

  PerformanceReportData({
    required this.userStats,
    required this.investmentStats,
    required this.transactionStats,
    required this.taskStats,
    required this.referralStats,
    required this.growthStats,
    required this.period,
  });

  factory PerformanceReportData.fromMap(Map<String, dynamic> data) {
    return PerformanceReportData(
      userStats: data['userStats'] ?? {},
      investmentStats: data['investmentStats'] ?? {},
      transactionStats: data['transactionStats'] ?? {},
      taskStats: data['taskStats'] ?? {},
      referralStats: data['referralStats'] ?? {},
      growthStats: data['growthStats'] ?? [],
      period: data['period'] ?? {},
    );
  }
}

class UsersReportData {
  final List<dynamic> users;
  final int currentPage;
  final int totalPages;
  final int totalUsers;

  UsersReportData({
    required this.users,
    required this.currentPage,
    required this.totalPages,
    required this.totalUsers,
  });

  factory UsersReportData.fromMap(Map<String, dynamic> data) {
    return UsersReportData(
      users: data['users'] ?? [],
      currentPage: data['currentPage'] ?? 1,
      totalPages: data['totalPages'] ?? 1,
      totalUsers: data['totalUsers'] ?? 0,
    );
  }
}

class FinancialReportData {
  final Map<String, dynamic> deposits;
  final Map<String, dynamic> withdrawals;
  final Map<String, dynamic> profits;
  final Map<String, dynamic> referralCommissions;
  final Map<String, dynamic> period;

  FinancialReportData({
    required this.deposits,
    required this.withdrawals,
    required this.profits,
    required this.referralCommissions,
    required this.period,
  });

  factory FinancialReportData.fromMap(Map<String, dynamic> data) {
    return FinancialReportData(
      deposits: data['deposits'] ?? {},
      withdrawals: data['withdrawals'] ?? {},
      profits: data['profits'] ?? {},
      referralCommissions: data['referralCommissions'] ?? {},
      period: data['period'] ?? {},
    );
  }
}

// Estado dos relatórios
class ReportState {
  final PerformanceReportData? performanceReport;
  final UsersReportData? usersReport;
  final FinancialReportData? financialReport;
  final bool isLoading;
  final String? error;
  final Map<String, dynamic> filters;

  ReportState({
    this.performanceReport,
    this.usersReport,
    this.financialReport,
    this.isLoading = false,
    this.error,
    Map<String, dynamic>? filters,
  }) : filters = filters ?? {};

  ReportState copyWith({
    PerformanceReportData? performanceReport,
    UsersReportData? usersReport,
    FinancialReportData? financialReport,
    bool? isLoading,
    String? error,
    Map<String, dynamic>? filters,
  }) {
    return ReportState(
      performanceReport: performanceReport ?? this.performanceReport,
      usersReport: usersReport ?? this.usersReport,
      financialReport: financialReport ?? this.financialReport,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      filters: filters ?? this.filters,
    );
  }
}

// Notifier para gerenciar o estado dos relatórios
class ReportNotifier extends Notifier<ReportState> {
  late final ReportApiService _reportApiService;

  @override
  ReportState build() {
    _reportApiService = ref.watch(reportApiServiceProvider);
    return ReportState();
  }

  // Carregar relatório de performance
  Future<void> loadPerformanceReport({
    DateTime? startDate,
    DateTime? endDate,
    String groupBy = 'day',
  }) async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      
      final data = await _reportApiService.getPerformanceReport(
        startDate: startDate,
        endDate: endDate,
        groupBy: groupBy,
      );
      
      final reportData = PerformanceReportData.fromMap(data);
      
      state = state.copyWith(
        performanceReport: reportData,
        isLoading: false,
        filters: {
          ...state.filters,
          'startDate': startDate,
          'endDate': endDate,
          'groupBy': groupBy,
        },
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  // Carregar relatório de usuários
  Future<void> loadUsersReport({
    int page = 1,
    int limit = 10,
    String sortBy = 'createdAt',
    String sortOrder = 'desc',
  }) async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      
      final data = await _reportApiService.getUsersReport(
        page: page,
        limit: limit,
        sortBy: sortBy,
        sortOrder: sortOrder,
      );
      
      final reportData = UsersReportData.fromMap(data);
      
      state = state.copyWith(
        usersReport: reportData,
        isLoading: false,
        filters: {
          ...state.filters,
          'page': page,
          'limit': limit,
          'sortBy': sortBy,
          'sortOrder': sortOrder,
        },
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  // Carregar relatório financeiro
  Future<void> loadFinancialReport({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      
      final data = await _reportApiService.getFinancialReport(
        startDate: startDate,
        endDate: endDate,
      );
      
      final reportData = FinancialReportData.fromMap(data);
      
      state = state.copyWith(
        financialReport: reportData,
        isLoading: false,
        filters: {
          ...state.filters,
          'startDate': startDate,
          'endDate': endDate,
        },
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  // Limpar erro
  void clearError() {
    state = state.copyWith(error: null);
  }

  // Limpar todos os relatórios
  void clearAllReports() {
    state = ReportState();
  }
}

// Providers
final reportNotifierProvider = NotifierProvider<ReportNotifier, ReportState>(() {
  return ReportNotifier();
});