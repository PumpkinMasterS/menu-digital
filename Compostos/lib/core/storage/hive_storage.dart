import 'package:hive/hive.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter/foundation.dart';
import 'package:compostos/models/task_model.dart';
import 'package:compostos/models/robot_model.dart';
import 'package:compostos/models/referral_model.dart';
import 'package:compostos/models/user_model.dart';
import 'package:compostos/core/storage/adapters/task_adapter.dart';
import 'package:compostos/core/storage/adapters/user_adapter.dart';
import 'package:compostos/core/storage/adapters/robot_adapter.dart';
import 'package:compostos/core/storage/adapters/referral_reward_adapter.dart';




class HiveStorage {
  static const String userBox = 'user_box';
  static const String robotsBox = 'robots_box';
  static const String transactionsBox = 'transactions_box';
  static const String tasksBox = 'tasks_box';
  static const String referralRewardsBox = 'referral_rewards';

  static Future<void> init() async {
    if (kIsWeb) {
      // No ambiente web, usar Hive sem path (usa IndexedDB)
      Hive.init(null);
    } else {
      // Em ambientes mobile/desktop, usar path normal
      final appDocumentDir = await getApplicationDocumentsDirectory();
      Hive.init(appDocumentDir.path);
    }

    // Registrar adapters
    Hive.registerAdapter(UserAdapter());
    Hive.registerAdapter(RobotAdapter());
    Hive.registerAdapter(TaskAdapter());
    Hive.registerAdapter(TaskDifficultyAdapter());
    Hive.registerAdapter(TaskStatusAdapter());
    Hive.registerAdapter(RobotLevelAdapter());
    Hive.registerAdapter(ReferralLevelAdapter());
    Hive.registerAdapter(ReferralRewardAdapter());

    try {
      // Abrir boxes
      await Hive.openBox<UserModel>(userBox);
      await Hive.openBox<RobotModel>(robotsBox);
      await Hive.openBox<Map>(transactionsBox);
      await Hive.openBox<TaskModel>(tasksBox);
      await Hive.openBox<ReferralReward>(referralRewardsBox);
    } catch (e) {
      // Em caso de erro no web, tentar abrir boxes com fallback
      if (kIsWeb) {
        await _openWebBoxesWithFallback();
      } else {
        rethrow;
      }
    }
  }

  static Future<void> _openWebBoxesWithFallback() async {
    // Tentar abrir boxes individualmente com fallback
    try {
      await Hive.openBox<UserModel>(userBox);
    } catch (e) {
      await Hive.openBox<UserModel>(userBox, crashRecovery: true);
    }
    
    try {
      await Hive.openBox<RobotModel>(robotsBox);
    } catch (e) {
      await Hive.openBox<RobotModel>(robotsBox, crashRecovery: true);
    }
    
    try {
      await Hive.openBox<Map>(transactionsBox);
    } catch (e) {
      await Hive.openBox<Map>(transactionsBox, crashRecovery: true);
    }
    
    try {
      await Hive.openBox<TaskModel>(tasksBox);
    } catch (e) {
      await Hive.openBox<TaskModel>(tasksBox, crashRecovery: true);
    }
    
    try {
      await Hive.openBox<ReferralReward>(referralRewardsBox);
    } catch (e) {
      await Hive.openBox<ReferralReward>(referralRewardsBox, crashRecovery: true);
    }
  }

  // Métodos para User
  static Future<void> saveUser(UserModel user) async {
    final box = Hive.box<UserModel>(userBox);
    await box.put('current_user', user);
  }

  static UserModel? getUser() {
    final box = Hive.box<UserModel>(userBox);
    return box.get('current_user');
  }

  static Future<void> deleteUser() async {
    final box = Hive.box<UserModel>(userBox);
    await box.delete('current_user');
  }

  // Métodos para Robots
  static Future<void> saveRobot(RobotModel robot) async {
    final box = Hive.box<RobotModel>(robotsBox);
    await box.put(robot.id, robot);
  }

  static List<RobotModel> getRobots() {
    final box = Hive.box<RobotModel>(robotsBox);
    return box.values.toList();
  }

  static Future<void> deleteRobot(String robotId) async {
    final box = Hive.box<RobotModel>(robotsBox);
    await box.delete(robotId);
  }

  // Métodos para Transactions
  static Future<void> saveTransaction(Map<String, dynamic> transaction) async {
    final box = Hive.box<Map>(transactionsBox);
    final id = DateTime.now().millisecondsSinceEpoch.toString();
    await box.put(id, {...transaction, 'id': id});
  }

  static List<Map<String, dynamic>> getTransactions() {
    final box = Hive.box<Map>(transactionsBox);
    return box.values.map((e) => Map<String, dynamic>.from(e)).toList();
  }

  // Métodos para gerenciar tarefas
  static Future<void> saveTasks(List<TaskModel> tasks) async {
    final box = Hive.box<TaskModel>(tasksBox);
    await box.clear();
    for (final task in tasks) {
      await box.put(task.id, task);
    }
  }

  static List<TaskModel> getTasks() {
    final box = Hive.box<TaskModel>(tasksBox);
    return box.values.toList();
  }

  static Future<void> saveTask(TaskModel task) async {
    final box = Hive.box<TaskModel>(tasksBox);
    await box.put(task.id, task);
  }

  static Future<void> deleteTask(String taskId) async {
    final box = Hive.box<TaskModel>(tasksBox);
    await box.delete(taskId);
  }

  // Métodos para gerenciar recompensas por convite
  static Future<void> saveReferralReward(ReferralReward reward) async {
    final box = Hive.box<ReferralReward>(referralRewardsBox);
    await box.put(reward.id, reward);
  }

  static Future<void> saveReferralRewards(List<ReferralReward> rewards) async {
    final box = Hive.box<ReferralReward>(referralRewardsBox);
    for (final reward in rewards) {
      await box.put(reward.id, reward);
    }
  }

  static List<ReferralReward> getReferralRewards() {
    final box = Hive.box<ReferralReward>(referralRewardsBox);
    return box.values.toList();
  }

  static List<ReferralReward> getReferralRewardsByUser(String userId) {
    final box = Hive.box<ReferralReward>(referralRewardsBox);
    return box.values
        .where((reward) => reward.referrerId == userId)
        .toList();
  }

  static Future<void> deleteReferralReward(String rewardId) async {
    final box = Hive.box<ReferralReward>(referralRewardsBox);
    await box.delete(rewardId);
  }

  static double getTotalReferralEarnings(String userId) {
    final rewards = getReferralRewardsByUser(userId);
    return rewards.fold(0.0, (sum, reward) => sum + reward.amount);
  }

  // Métodos utilitários
  static Future<void> clearAllData() async {
    await Hive.box<UserModel>(userBox).clear();
    await Hive.box<RobotModel>(robotsBox).clear();
    await Hive.box<Map>(transactionsBox).clear();
  }

  static Future<void> close() async {
    await Hive.close();
  }
}