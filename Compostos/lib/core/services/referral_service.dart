import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/models/referral_model.dart';
import 'package:compostos/core/storage/hive_storage.dart';

class ReferralService {
  final Ref _ref;

  ReferralService(this._ref);

  Future<List<ReferralReward>> getReferralRewards() async {
    try {
      final rewards = await HiveStorage.getReferralRewards();
      return rewards;
    } catch (e) {
      throw Exception('Failed to load referral rewards: $e');
    }
  }

  Future<void> saveReferralReward(ReferralReward reward) async {
    try {
      await HiveStorage.saveReferralReward(reward);
    } catch (e) {
      throw Exception('Failed to save referral reward: $e');
    }
  }

  Future<void> saveReferralRewards(List<ReferralReward> rewards) async {
    try {
      await HiveStorage.saveReferralRewards(rewards);
    } catch (e) {
      throw Exception('Failed to save referral rewards: $e');
    }
  }

  Future<void> updateReferralReward(ReferralReward reward) async {
    try {
      await HiveStorage.saveReferralReward(reward);
    } catch (e) {
      throw Exception('Failed to update referral reward: $e');
    }
  }

  Future<void> deleteReferralReward(String rewardId) async {
    try {
      await HiveStorage.deleteReferralReward(rewardId);
    } catch (e) {
      throw Exception('Failed to delete referral reward: $e');
    }
  }

  Future<List<ReferralReward>> getPendingPayments() async {
    try {
      final rewards = await HiveStorage.getReferralRewards();
      return rewards.where((reward) => !reward.isPaid).toList();
    } catch (e) {
      throw Exception('Failed to get pending payments: $e');
    }
  }

  Future<double> getPendingPaymentsAmount() async {
    try {
      final pendingRewards = await getPendingPayments();
      double total = 0.0;
      for (final reward in pendingRewards) {
        total += reward.amount ?? 0.0;
      }
      return total;
    } catch (e) {
      throw Exception('Failed to calculate pending payments amount: \$e');
    }
  }
}