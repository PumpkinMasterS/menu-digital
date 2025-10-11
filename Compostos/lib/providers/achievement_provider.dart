import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:compostos/core/services/achievement_api_service.dart';
import 'package:compostos/models/achievement_model.dart';

class AchievementProvider with ChangeNotifier {
  final AchievementApiService _achievementService;

  AchievementProvider(this._achievementService);

  List<AchievementModel> _allAchievements = [];
  List<UserAchievementModel> _userAchievements = [];
  List<UserAchievementModel> _unreadAchievements = [];
  bool _isLoading = false;
  String? _error;

  List<AchievementModel> get allAchievements => _allAchievements;
  List<UserAchievementModel> get userAchievements => _userAchievements;
  List<UserAchievementModel> get unreadAchievements => _unreadAchievements;
  bool get isLoading => _isLoading;
  String? get error => _error;

  int get unlockedCount => _userAchievements.length;
  int get totalPoints => _userAchievements.fold(0, (sum, achievement) => sum + achievement.achievement.points);

  List<UserAchievementModel> get unlockedAchievements =>
      _userAchievements.where((ua) => ua.isUnlocked).toList();

  List<AchievementModel> get lockedAchievements {
    final unlockedIds = _userAchievements.map((ua) => ua.achievement.id).toSet();
    return _allAchievements.where((a) => !unlockedIds.contains(a.id)).toList();
  }

  Future<void> loadAllAchievements() async {
    _setLoading(true);
    try {
      _allAchievements = await _achievementService.getAchievements();
      _error = null;
    } catch (e) {
      _error = 'Erro ao carregar conquistas: \$e';
    } finally {
      _setLoading(false);
    }
  }

  Future<void> loadUserAchievements() async {
    _setLoading(true);
    try {
      _userAchievements = await _achievementService.getUserAchievements();
      _error = null;
    } catch (e) {
      _error = 'Erro ao carregar conquistas do usuário: \$e';
    } finally {
      _setLoading(false);
    }
  }

  Future<void> loadUnreadAchievements() async {
    try {
      _unreadAchievements = await _achievementService.getUnreadAchievements();
    } catch (e) {
      _error = 'Erro ao carregar conquistas não lidas: \$e';
    }
  }

  Future<void> markAsRead(String achievementId) async {
    try {
      await _achievementService.markAsRead(achievementId);
      _unreadAchievements.removeWhere((ua) => ua.id == achievementId);
      notifyListeners();
    } catch (e) {
      _error = 'Erro ao marcar conquista como lida: \$e';
    }
  }

  Future<void> markAllAsRead() async {
    try {
      for (final achievement in _unreadAchievements) {
        await _achievementService.markAsRead(achievement.id);
      }
      _unreadAchievements.clear();
      notifyListeners();
    } catch (e) {
      _error = 'Erro ao marcar todas como lidas: \$e';
    }
  }

  Future<Map<String, dynamic>> claimReward(String achievementId) async {
    try {
      final result = await _achievementService.claimReward(achievementId);
      
      // Atualizar a conquista localmente
      final index = _userAchievements.indexWhere((ua) => ua.id == achievementId);
      if (index != -1) {
        _userAchievements[index] = UserAchievementModel(
          id: _userAchievements[index].id,
          userId: _userAchievements[index].userId,
          achievement: _userAchievements[index].achievement,
          unlockedAt: _userAchievements[index].unlockedAt,
          isNew: _userAchievements[index].isNew,
          rewardClaimed: true,
          progress: _userAchievements[index].progress,
        );
        notifyListeners();
      }
      
      return result;
    } catch (e) {
      _error = 'Erro ao resgatar recompensa: \$e';
      rethrow;
    }
  }

  Future<List<UserAchievementModel>> checkForNewAchievements() async {
    try {
      final newAchievements = await _achievementService.checkUserAchievements();
      
      if (newAchievements.isNotEmpty) {
        _userAchievements.addAll(newAchievements);
        _unreadAchievements.addAll(newAchievements);
        notifyListeners();
      }
      
      return newAchievements;
    } catch (e) {
      _error = 'Erro ao verificar novas conquistas: \$e';
      return [];
    }
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}