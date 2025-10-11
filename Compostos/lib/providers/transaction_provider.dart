import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';
import 'package:compostos/models/transaction_model.dart';
import 'package:compostos/core/services/user_service.dart';
import 'package:compostos/core/storage/hive_storage.dart';

// Estado das transações
class TransactionState {
  final List<TransactionModel> transactions;
  final bool isLoading;
  final String? error;
  final DateTime? lastUpdate;

  TransactionState({
    this.transactions = const [],
    this.isLoading = false,
    this.error,
    this.lastUpdate,
  });

  TransactionState copyWith({
    List<TransactionModel>? transactions,
    bool? isLoading,
    String? error,
    DateTime? lastUpdate,
  }) {
    return TransactionState(
      transactions: transactions ?? this.transactions,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
      lastUpdate: lastUpdate ?? this.lastUpdate,
    );
  }

  // Filtros úteis
  List<TransactionModel> get completedTransactions =>
      transactions.where((t) => t.status == TransactionStatus.completed).toList();

  List<TransactionModel> get pendingTransactions =>
      transactions.where((t) => t.status == TransactionStatus.pending).toList();

  List<TransactionModel> get creditTransactions =>
      transactions.where((t) => t.isCredit).toList();

  List<TransactionModel> get debitTransactions =>
      transactions.where((t) => t.isDebit).toList();

  double get totalCredits =>
      creditTransactions.fold(0.0, (sum, t) => sum + t.amount);

  double get totalDebits =>
      debitTransactions.fold(0.0, (sum, t) => sum + t.amount);

  double get netBalance => totalCredits + totalDebits;

  // Filtrar por tipo
  List<TransactionModel> filterByType(TransactionType type) =>
      transactions.where((t) => t.type == type).toList();

  // Filtrar por período
  List<TransactionModel> filterByDateRange(DateTime start, DateTime end) =>
      transactions.where((t) => t.date.isAfter(start) && t.date.isBefore(end)).toList();

  // Estatísticas mensais
  Map<String, double> getMonthlySummary() {
    final monthly = <String, double>{};
    for (final transaction in completedTransactions) {
      final monthKey = '${transaction.date.year}-${transaction.date.month.toString().padLeft(2, '0')}';
      monthly.update(monthKey, (value) => value + transaction.amount, ifAbsent: () => transaction.amount);
    }
    return monthly;
  }
}

// Notifier para gerenciar transações
class TransactionNotifier extends Notifier<TransactionState> {
  late UserService _userService;

  @override
  TransactionState build() {
    _userService = ref.watch(userServiceProvider);
    return TransactionState();
  }

  // Carregar transações
  Future<void> loadTransactions() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      // Primeiro tenta carregar da API
      final apiTransactions = await _loadFromApi();
      
      if (apiTransactions.isNotEmpty) {
        state = state.copyWith(
          transactions: apiTransactions,
          isLoading: false,
          lastUpdate: DateTime.now(),
        );
        // Salva no storage local
        await _saveToStorage(apiTransactions);
      } else {
        // Fallback para storage local
        final localTransactions = await _loadFromStorage();
        state = state.copyWith(
          transactions: localTransactions,
          isLoading: false,
          lastUpdate: DateTime.now(),
        );
      }
    } catch (e) {
      // Fallback para storage local em caso de erro
      try {
        final localTransactions = await _loadFromStorage();
        state = state.copyWith(
          transactions: localTransactions,
          isLoading: false,
          error: 'Erro ao carregar da API: $e',
          lastUpdate: DateTime.now(),
        );
      } catch (storageError) {
        state = state.copyWith(
          isLoading: false,
          error: 'Erro ao carregar transações: $storageError',
        );
      }
    }
  }

  // Carregar da API
  Future<List<TransactionModel>> _loadFromApi() async {
    try {
      final response = await _userService.getTransactionHistory();
      final transactionsData = response['data'] as List<dynamic>? ?? [];
      return transactionsData.map((data) => TransactionModel.fromMap(data as Map<String, dynamic>)).toList();
    } catch (e) {
      print('Erro ao carregar transações da API: $e');
      return [];
    }
  }

  // Carregar do storage local
  Future<List<TransactionModel>> _loadFromStorage() async {
    try {
      final transactionsData = HiveStorage.getTransactions();
      return transactionsData.map((data) => TransactionModel.fromMap(data)).toList();
    } catch (e) {
      print('Erro ao carregar transações do storage: $e');
      return [];
    }
  }

  // Salvar no storage local
  Future<void> _saveToStorage(List<TransactionModel> transactions) async {
    try {
      for (final transaction in transactions) {
        await HiveStorage.saveTransaction(transaction.toMap());
      }
    } catch (e) {
      print('Erro ao salvar transações no storage: $e');
    }
  }

  // Adicionar nova transação
  Future<void> addTransaction(TransactionModel transaction) async {
    try {
      final newTransactions = [...state.transactions, transaction];
      state = state.copyWith(transactions: newTransactions);
      
      // Salva no storage local
      await HiveStorage.saveTransaction(transaction.toMap());
    } catch (e) {
      state = state.copyWith(error: 'Erro ao adicionar transação: $e');
      rethrow;
    }
  }

  // Atualizar status de transação
  Future<void> updateTransactionStatus(String transactionId, TransactionStatus newStatus) async {
    try {
      final updatedTransactions = state.transactions.map((transaction) {
        if (transaction.id == transactionId) {
          return TransactionModel(
            id: transaction.id,
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            date: transaction.date,
            status: newStatus,
            referenceId: transaction.referenceId,
            details: transaction.details,
          );
        }
        return transaction;
      }).toList();

      state = state.copyWith(transactions: updatedTransactions);
      
      // Atualiza no storage
      final transactionToUpdate = updatedTransactions.firstWhere((t) => t.id == transactionId);
      await HiveStorage.saveTransaction(transactionToUpdate.toMap());
    } catch (e) {
      state = state.copyWith(error: 'Erro ao atualizar transação: $e');
      rethrow;
    }
  }

  // Filtrar transações
  void filterTransactions(String query) {
    if (query.isEmpty) {
      // Recarrega todas as transações
      loadTransactions();
      return;
    }

    final filtered = state.transactions.where((transaction) {
      return transaction.description.toLowerCase().contains(query.toLowerCase()) ||
             transaction.type.toString().toLowerCase().contains(query.toLowerCase()) ||
             transaction.amount.toString().contains(query);
    }).toList();

    state = state.copyWith(transactions: filtered);
  }

  // Limpar erro
  void clearError() {
    state = state.copyWith(error: null);
  }

  // Limpar todas as transações (apenas para desenvolvimento)
  Future<void> clearAllTransactions() async {
    try {
      await Hive.box<Map>(HiveStorage.transactionsBox).clear();
      state = state.copyWith(transactions: []);
    } catch (e) {
      state = state.copyWith(error: 'Erro ao limpar transações: $e');
    }
  }
}

// Provider principal
final transactionProvider = NotifierProvider<TransactionNotifier, TransactionState>(() {
  return TransactionNotifier();
});

// Providers para estatísticas
final transactionStatsProvider = Provider<Map<String, dynamic>>((ref) {
  final state = ref.watch(transactionProvider);
  
  return {
    'totalTransactions': state.transactions.length,
    'totalCredits': state.totalCredits,
    'totalDebits': state.totalDebits,
    'netBalance': state.netBalance,
    'completedCount': state.completedTransactions.length,
    'pendingCount': state.pendingTransactions.length,
  };
});

// Provider para transações recentes (últimos 30 dias)
final recentTransactionsProvider = Provider<List<TransactionModel>>((ref) {
  final state = ref.watch(transactionProvider);
  final thirtyDaysAgo = DateTime.now().subtract(Duration(days: 30));
  
  return state.transactions
      .where((transaction) => transaction.date.isAfter(thirtyDaysAgo))
      .toList()
    ..sort((a, b) => b.date.compareTo(a.date));
});