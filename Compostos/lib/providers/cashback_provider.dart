import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/core/services/cashback_api_service.dart';

// Modelos para o estado do cashback
class CashbackCalculation {
  final double totalCashback;
  final double cashbackRate;
  final List<Map<String, dynamic>> appliedRules;

  CashbackCalculation({
    required this.totalCashback,
    required this.cashbackRate,
    required this.appliedRules,
  });

  // Getters para compatibilidade com o widget
  double get cashbackAmount => totalCashback;
  String get tier => appliedRules.isNotEmpty ? appliedRules.first['tier'] ?? 'Bronze' : 'Bronze';

  factory CashbackCalculation.fromMap(Map<String, dynamic> data) {
    return CashbackCalculation(
      totalCashback: (data['totalCashback'] as num).toDouble(),
      cashbackRate: (data['cashbackRate'] as num).toDouble(),
      appliedRules: List<Map<String, dynamic>>.from(data['appliedRules']),
    );
  }
}

class CashbackHistory {
  final List<Map<String, dynamic>> investments;
  final int total;
  final int page;
  final int totalPages;
  final double totalCashback;

  CashbackHistory({
    required this.investments,
    required this.total,
    required this.page,
    required this.totalPages,
    required this.totalCashback,
  });

  factory CashbackHistory.fromMap(Map<String, dynamic> data) {
    return CashbackHistory(
      investments: List<Map<String, dynamic>>.from(data['investments']),
      total: data['total'],
      page: data['page'],
      totalPages: data['totalPages'],
      totalCashback: (data['totalCashback'] as num).toDouble(),
    );
  }
}

class CashbackStats {
  final double totalCashbackGiven;
  final int totalInvestmentsWithCashback;
  final double averageCashback;
  final double maxCashback;

  CashbackStats({
    required this.totalCashbackGiven,
    required this.totalInvestmentsWithCashback,
    required this.averageCashback,
    required this.maxCashback,
  });

  factory CashbackStats.fromMap(Map<String, dynamic> data) {
    return CashbackStats(
      totalCashbackGiven: (data['totalCashbackGiven'] as num).toDouble(),
      totalInvestmentsWithCashback: data['totalInvestmentsWithCashback'],
      averageCashback: (data['averageCashback'] as num).toDouble(),
      maxCashback: (data['maxCashback'] as num).toDouble(),
    );
  }
}

// Estado do cashback
class CashbackState {
  final CashbackCalculation? calculation;
  final CashbackHistory? history;
  final CashbackStats? stats;
  final bool isLoading;
  final String? error;

  CashbackState({
    this.calculation,
    this.history,
    this.stats,
    this.isLoading = false,
    this.error,
  });

  CashbackState copyWith({
    CashbackCalculation? calculation,
    CashbackHistory? history,
    CashbackStats? stats,
    bool? isLoading,
    String? error,
  }) {
    return CashbackState(
      calculation: calculation ?? this.calculation,
      history: history ?? this.history,
      stats: stats ?? this.stats,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

// Notifier para gerenciar o estado do cashback
class CashbackNotifier extends Notifier<CashbackState> {
  late final CashbackApiService _cashbackApiService;

  @override
  CashbackState build() {
    _cashbackApiService = CashbackApiService(ref);
    return CashbackState();
  }

  // Calcular cashback
  Future<CashbackCalculation?> calculateCashback(double amount, String robotType) async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      
      final result = await _cashbackApiService.calculateCashback(amount, robotType);
      
      if (result['success'] == true) {
        final calculation = CashbackCalculation.fromMap(result['data']);
        state = state.copyWith(
          calculation: calculation,
          isLoading: false,
        );
        return calculation;
      } else {
        state = state.copyWith(
          isLoading: false,
          error: result['message'] ?? 'Erro ao calcular cashback',
        );
        return null;
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      return null;
    }
  }

  // Aplicar cashback a um investimento
  Future<void> applyCashback(String investmentId) async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      
      final result = await _cashbackApiService.applyCashback(investmentId);
      
      if (result['success'] == true) {
        state = state.copyWith(
          isLoading: false,
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          error: result['message'] ?? 'Erro ao aplicar cashback',
        );
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  // Buscar histórico de cashback
  Future<void> getCashbackHistory({int page = 1, int limit = 10}) async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      
      final result = await _cashbackApiService.getCashbackHistory(
        page: page,
        limit: limit,
      );
      
      if (result['success'] == true) {
        final history = CashbackHistory.fromMap(result['data']);
        state = state.copyWith(
          history: history,
          isLoading: false,
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          error: result['message'] ?? 'Erro ao buscar histórico',
        );
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  // Buscar estatísticas de cashback
  Future<void> getCashbackStats() async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      
      final result = await _cashbackApiService.getCashbackStats();
      
      if (result['success'] == true) {
        final stats = CashbackStats.fromMap(result['data']);
        state = state.copyWith(
          stats: stats,
          isLoading: false,
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          error: result['message'] ?? 'Erro ao buscar estatísticas',
        );
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  // Limpar estado
  void clearState() {
    state = CashbackState();
  }

  // Limpar erro
  void clearError() {
    state = state.copyWith(error: null);
  }
}

// Provider para o notifier
final cashbackNotifierProvider = NotifierProvider<CashbackNotifier, CashbackState>(() {
  return CashbackNotifier();
});