import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/core/services/commission_service.dart';
import 'package:compostos/models/commission_model.dart';

final commissionProvider = StateNotifierProvider<CommissionNotifier, CommissionState>((ref) {
  final commissionService = ref.watch(commissionServiceProvider);
  return CommissionNotifier(commissionService);
});

class CommissionState {
  final List<Commission> commissions;
  final Map<String, dynamic> stats;
  final bool isLoading;
  final String? error;
  final Map<int, List<Commission>> commissionsByLevel;

  CommissionState({
    List<Commission>? commissions,
    Map<String, dynamic>? stats,
    this.isLoading = false,
    this.error,
    Map<int, List<Commission>>? commissionsByLevel,
  }) : 
    commissions = commissions ?? [],
    stats = stats ?? {},
    commissionsByLevel = commissionsByLevel ?? {};

  CommissionState copyWith({
    List<Commission>? commissions,
    Map<String, dynamic>? stats,
    bool? isLoading,
    String? error,
    Map<int, List<Commission>>? commissionsByLevel,
  }) {
    return CommissionState(
      commissions: commissions ?? this.commissions,
      stats: stats ?? this.stats,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      commissionsByLevel: commissionsByLevel ?? this.commissionsByLevel,
    );
  }

  double get totalCommissions {
    return commissions.fold(0.0, (sum, commission) => sum + commission.amount);
  }

  double get pendingCommissions {
    return commissions
        .where((c) => c.isPending)
        .fold(0.0, (sum, commission) => sum + commission.amount);
  }

  double get paidCommissions {
    return commissions
        .where((c) => c.isPaid)
        .fold(0.0, (sum, commission) => sum + commission.amount);
  }

  int get totalCount => commissions.length;
  int get pendingCount => commissions.where((c) => c.isPending).length;
  int get paidCount => commissions.where((c) => c.isPaid).length;

  Map<CommissionLevel, double> get commissionsByLevelAmount {
    final result = <CommissionLevel, double>{};
    for (final commission in commissions) {
      result.update(
        commission.level,
        (value) => value + commission.amount,
        ifAbsent: () => commission.amount,
      );
    }
    return result;
  }

  Map<CommissionSourceType, double> get commissionsBySourceAmount {
    final result = <CommissionSourceType, double>{};
    for (final commission in commissions) {
      result.update(
        commission.sourceType,
        (value) => value + commission.amount,
        ifAbsent: () => commission.amount,
      );
    }
    return result;
  }
}

class CommissionNotifier extends StateNotifier<CommissionState> {
  final CommissionService _commissionService;

  CommissionNotifier(this._commissionService) : super(CommissionState());

  /// Carrega todas as comissões do usuário
  Future<void> loadUserCommissions({
    String? status,
    String? level,
    String? sourceType,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      state = state.copyWith(isLoading: true, error: null);

      final response = await _commissionService.getUserCommissions(
        status: status,
        level: level,
        sourceType: sourceType,
        startDate: startDate,
        endDate: endDate,
      );

      final commissions = (response['commissions'] as List)
          .map((json) => Commission.fromJson(json))
          .toList();

      state = state.copyWith(
        commissions: commissions,
        isLoading: false,
      );
    } catch (error) {
      state = state.copyWith(
        isLoading: false,
        error: error.toString(),
      );
    }
  }

  /// Carrega estatísticas de comissões
  Future<void> loadCommissionStats() async {
    try {
      final stats = await _commissionService.getCommissionStats();
      state = state.copyWith(stats: stats);
    } catch (error) {
      state = state.copyWith(error: error.toString());
    }
  }

  /// Carrega comissões por nível específico
  Future<void> loadCommissionsByLevel(int level) async {
    try {
      final response = await _commissionService.getCommissionsByLevel(level);
      final commissions = (response['commissions'] as List)
          .map((json) => Commission.fromJson(json))
          .toList();

      state = state.copyWith(
        commissionsByLevel: {
          ...state.commissionsByLevel,
          level: commissions,
        },
      );
    } catch (error) {
      state = state.copyWith(error: error.toString());
    }
  }

  /// Aprova uma comissão (apenas admin)
  Future<void> approveCommission(String commissionId) async {
    try {
      await _commissionService.approveCommission(commissionId);
      
      // Atualiza o estado local
      final updatedCommissions = state.commissions.map((commission) {
        if (commission.id == commissionId) {
          return Commission.fromJson({
            ...commission.toJson(),
            'status': 'approved',
            'approvedAt': DateTime.now().toIso8601String(),
          });
        }
        return commission;
      }).toList();

      state = state.copyWith(commissions: updatedCommissions);
    } catch (error) {
      state = state.copyWith(error: error.toString());
      rethrow;
    }
  }

  /// Paga uma comissão (apenas admin)
  Future<void> payCommission(String commissionId) async {
    try {
      await _commissionService.payCommission(commissionId);
      
      // Atualiza o estado local
      final updatedCommissions = state.commissions.map((commission) {
        if (commission.id == commissionId) {
          return Commission.fromJson({
            ...commission.toJson(),
            'status': 'paid',
            'paidAt': DateTime.now().toIso8601String(),
          });
        }
        return commission;
      }).toList();

      state = state.copyWith(commissions: updatedCommissions);
    } catch (error) {
      state = state.copyWith(error: error.toString());
      rethrow;
    }
  }

  /// Cancela uma comissão (apenas admin)
  Future<void> cancelCommission(String commissionId) async {
    try {
      await _commissionService.cancelCommission(commissionId);
      
      // Atualiza o estado local
      final updatedCommissions = state.commissions.map((commission) {
        if (commission.id == commissionId) {
          return Commission.fromJson({
            ...commission.toJson(),
            'status': 'cancelled',
            'cancelledAt': DateTime.now().toIso8601String(),
          });
        }
        return commission;
      }).toList();

      state = state.copyWith(commissions: updatedCommissions);
    } catch (error) {
      state = state.copyWith(error: error.toString());
      rethrow;
    }
  }

  /// Limpa o estado de erro
  void clearError() {
    state = state.copyWith(error: null);
  }

  /// Limpa todas as comissões
  void clearCommissions() {
    state = state.copyWith(commissions: []);
  }
}