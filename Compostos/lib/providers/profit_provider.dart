import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/core/services/profit_service.dart';

// Estado dos lucros do usuário
class ProfitState {
  final double pendingProfit;
  final double totalCollected;
  final bool isLoading;
  final String? error;
  final DateTime? lastCollection;

  ProfitState({
    this.pendingProfit = 0.0,
    this.totalCollected = 0.0,
    this.isLoading = false,
    this.error,
    this.lastCollection,
  });

  ProfitState copyWith({
    double? pendingProfit,
    double? totalCollected,
    bool? isLoading,
    String? error,
    DateTime? lastCollection,
  }) {
    return ProfitState(
      pendingProfit: pendingProfit ?? this.pendingProfit,
      totalCollected: totalCollected ?? this.totalCollected,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
      lastCollection: lastCollection ?? this.lastCollection,
    );
  }
}

// Notifier para gerenciar o estado dos lucros
class ProfitNotifier extends Notifier<ProfitState> {
  late ProfitService _profitService;

  @override
  ProfitState build() {
    _profitService = ref.watch(profitServiceProvider);
    return ProfitState();
  }

  // Coletar lucros manualmente
  Future<void> collectProfits() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final result = await _profitService.collectProfits();
      
      state = state.copyWith(
        isLoading: false,
        pendingProfit: 0.0,
        totalCollected: (state.totalCollected + (result['amount'] ?? 0.0)).toDouble(),
        lastCollection: DateTime.now(),
      );

    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      rethrow;
    }
  }

  // Atualizar lucros pendentes
  Future<void> updatePendingProfit() async {
    try {
      final result = await _profitService.getPendingProfits();
      
      state = state.copyWith(
        pendingProfit: (result['pendingProfit'] ?? 0.0).toDouble(),
      );

    } catch (e) {
      // Não altera o estado em caso de erro, apenas log
      print('Erro ao atualizar lucros pendentes: \$e');
    }
  }

  // Limpar erro
  void clearError() {
    state = state.copyWith(error: null);
  }
}

// Provider principal
final profitProvider = NotifierProvider<ProfitNotifier, ProfitState>(() {
  return ProfitNotifier();
});