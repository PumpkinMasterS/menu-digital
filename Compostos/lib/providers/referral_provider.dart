import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';
import 'package:compostos/core/storage/hive_storage.dart';
import 'package:compostos/models/referral_model.dart';
import 'package:compostos/models/transaction_model.dart';
import 'package:compostos/models/user_model.dart';
import 'package:compostos/providers/user_provider.dart';
import 'package:compostos/core/services/referral_service.dart';
import 'package:compostos/providers/transaction_provider.dart';

// Provider para o serviço de referências
final referralServiceProvider = Provider<ReferralService>((ref) {
  return ReferralService(ref);
});

// Provider para gerenciar o sistema de referências
final referralProvider = NotifierProvider<ReferralNotifier, List<ReferralReward>>(() {
  return ReferralNotifier();
});

// Provider para estatísticas de referências do usuário atual
final referralStatsProvider = Provider<ReferralStats>((ref) {
  final rewards = ref.watch(referralProvider);
  final user = ref.watch(userProvider);
  
  if (user == null) {
    return ReferralStats(
      totalEarnings: 0.0,
      firstLevelCount: 0,
      secondLevelCount: 0,
      firstLevelEarnings: 0.0,
      secondLevelEarnings: 0.0,
      totalReferrals: 0,
    );
  }
  
  final userRewards = rewards.where((reward) => reward.referrerId == user.id).toList();
  
  final firstLevelRewards = userRewards.where((reward) => reward.level == ReferralLevel.firstLevel);
  final secondLevelRewards = userRewards.where((reward) => reward.level == ReferralLevel.secondLevel);
  
  return ReferralStats(
    totalEarnings: userRewards.fold(0.0, (sum, reward) => sum + reward.amount),
    firstLevelCount: firstLevelRewards.length,
    secondLevelCount: secondLevelRewards.length,
    firstLevelEarnings: firstLevelRewards.fold(0.0, (sum, reward) => sum + reward.amount),
    secondLevelEarnings: secondLevelRewards.fold(0.0, (sum, reward) => sum + reward.amount),
    totalReferrals: userRewards.length,
  );
});

class ReferralStats {
  final double totalEarnings;
  final int firstLevelCount;
  final int secondLevelCount;
  final double firstLevelEarnings;
  final double secondLevelEarnings;
  final int totalReferrals;

  ReferralStats({
    required this.totalEarnings,
    required this.firstLevelCount,
    required this.secondLevelCount,
    required this.firstLevelEarnings,
    required this.secondLevelEarnings,
    required this.totalReferrals,
  });
}

class ReferralNotifier extends Notifier<List<ReferralReward>> {
  late final ReferralService _referralService;
  final List<ReferralReward> _pendingPayments = [];

  @override
  List<ReferralReward> build() {
    _referralService = ref.read(referralServiceProvider);
    loadReferralRewards();
    _processPendingPayments();
    return [];
  }

  // Carregar recompensas do storage
  Future<void> loadReferralRewards() async {
    try {
      final referralService = ref.read(referralServiceProvider);
      final rewards = await referralService.getReferralRewards();
      state = rewards;
    } catch (e) {
      // Fallback para storage local
      final rewards = HiveStorage.getReferralRewards();
      state = rewards;
    }
  }

  // Adicionar nova recompensa de referência
  Future<void> addReferralReward(ReferralReward reward) async {
    await HiveStorage.saveReferralReward(reward);
    state = [...state, reward];
  }

  // Processar uma nova referência (quando alguém se cadastra usando código de referência)
  Future<void> processReferral({
    required String referrerId,
    required String referredId,
    required String referredName,
    required double transactionAmount,
  }) async {
    // Obter código de referência do usuário atual (assumindo que é o referrer)
    final currentUser = HiveStorage.getUser();
    final referralCode = currentUser?.referralCode ?? 'unknown';
    
    // Criar recompensa para 1º nível (5%)
    final firstLevelReward = ReferralReward(
      id: 'ref_\${DateTime.now().millisecondsSinceEpoch}_1',
      referrerId: referrerId,
      referredId: referredId,
      level: ReferralLevel.firstLevel,
      amount: ReferralReward.calculateCommission(transactionAmount, ReferralLevel.firstLevel),
      description: 'Comissão de 1º nível de \$referredName',
      date: DateTime.now(),
      referralCode: referralCode,
    );

    await addReferralReward(firstLevelReward);

    // Verificar se o referrer tem um referrer (2º nível)
    final referrer = HiveStorage.getUser();
    if (referrer != null && referrer.referralCode != null) {
      final secondLevelReferrerId = referrer.referralCode!;
      
      // Usar o mesmo código de referência do usuário atual para 2º nível
    final secondLevelReferralCode = referralCode;
      
      // Criar recompensa para 2º nível (3%)
      final secondLevelReward = ReferralReward(
        id: 'ref_\${DateTime.now().millisecondsSinceEpoch}_2',
        referrerId: secondLevelReferrerId,
        referredId: referredId,
        level: ReferralLevel.secondLevel,
        amount: ReferralReward.calculateCommission(transactionAmount, ReferralLevel.secondLevel),
        description: 'Comissão de 2º nível de \$referredName',
        date: DateTime.now(),
        referralCode: secondLevelReferralCode,
      );

      await addReferralReward(secondLevelReward);
    }
  }

  // Obter recompensas de um usuário específico
  List<ReferralReward> getRewardsByUser(String userId) {
    return state.where((reward) => reward.referrerId == userId).toList();
  }

  // Obter total de ganhos por referência de um usuário
  double getTotalEarnings(String userId) {
    return getRewardsByUser(userId).fold(0.0, (sum, reward) => sum + (reward.amount ?? 0.0));
  }

  // Gerar código de referência único
  String generateReferralCode(String userId) {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    return 'REF\${userId.substring(0, 4).toUpperCase()}\${timestamp.toString().substring(8)}';
  }

  // Limpar todas as recompensas (apenas para desenvolvimento)
  Future<void> clearAllRewards() async {
    await Hive.box(HiveStorage.referralRewardsBox).clear();
    state = [];
  }

  // Processar pagamentos pendentes automaticamente
  Future<void> _processPendingPayments() async {
    try {
      // Verificar se há recompensas não pagas
      final unpaidRewards = state.where((reward) => !reward.isPaid).toList();
      
      for (final reward in unpaidRewards) {
        await _processSinglePayment(reward);
      }
    } catch (e) {
      print('Erro ao processar pagamentos pendentes: $e');
    }
  }

  // Processar pagamento individual
  Future<void> _processSinglePayment(ReferralReward reward) async {
    try {
      // Criar transação de pagamento
      final transaction = TransactionModel(
        id: 'ref_\${reward.id}_\${DateTime.now().millisecondsSinceEpoch}',
        type: TransactionType.referral,
        amount: reward.amount ?? 0.0,
        description: 'Comissão de indicação - \${reward.description}',
        date: DateTime.now(),
        status: TransactionStatus.completed,
        referenceId: reward.id,
        details: 'Nível \${reward.level.index + 1} - \${reward.referredUserName ?? "Usuário"}',
      );

      // Adicionar transação
      final transactionNotifier = ref.read(transactionProvider.notifier);
      await transactionNotifier.addTransaction(transaction);

      // Atualizar saldo do usuário
      final userNotifier = ref.read(userProvider.notifier);
      await userNotifier.addBalance(reward.amount ?? 0.0);

      // Marcar recompensa como paga
      final updatedRewards = state.map((r) {
        if (r.id == reward.id) {
          return ReferralReward(
            id: r.id,
            amount: r.amount,
            description: r.description,
            date: r.date,
            level: r.level,
            referralCode: r.referralCode,
            referrerId: r.referrerId,
            referredId: r.referredId,
            isPaid: true, // Marcar como pago
          );
        }
        return r;
      }).toList().cast<ReferralReward>();

      state = updatedRewards;
      await HiveStorage.saveReferralRewards(updatedRewards);

      print('Pagamento processado: €\${(reward.amount ?? 0.0).toStringAsFixed(2)} para \${reward.description}');

    } catch (e) {
      print('Erro ao processar pagamento para recompensa \${reward.id}: $e');
    }
  }

  // Processar pagamentos em lote
  Future<void> processBatchPayments(List<String> rewardIds) async {
    try {
      for (final rewardId in rewardIds) {
        try {
          final reward = state.firstWhere((r) => r.id == rewardId);
          if (!reward.isPaid) {
            await _processSinglePayment(reward);
          }
        } catch (e) {
          // Recompensa não encontrada, ignorar
          print('Recompensa não encontrada: \$rewardId');
        }
      }
    } catch (e) {
      print('Erro ao processar pagamentos em lote: $e');
      rethrow;
    }
  }

  // Verificar pagamentos pendentes
  int get pendingPaymentsCount {
    return state.where((reward) => !reward.isPaid).length;
  }

  // Obter total de comissões não pagas
  double get pendingPaymentsAmount {
    return state
        .where((reward) => !reward.isPaid)
        .fold(0.0, (sum, reward) => sum + (reward.amount ?? 0.0));
  }

  // Obter próximos pagamentos programados
  List<ReferralReward> getScheduledPayments({int limit = 10}) {
    return state
        .where((reward) => !reward.isPaid)
        .take(limit)
        .toList();
  }
}