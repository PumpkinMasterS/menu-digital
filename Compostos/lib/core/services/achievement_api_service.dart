import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:compostos/core/services/api_service.dart';
import 'package:compostos/models/achievement_model.dart';

class AchievementApiService {
  final ApiService _apiService;

  AchievementApiService(this._apiService);

  Future<List<AchievementModel>> getAchievements() async {
    try {
      final response = await _apiService.get('/achievements');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.data);
        final List<dynamic> achievementsJson = data['data'];
        
        return achievementsJson
            .map((json) => AchievementModel.fromJson(json))
            .toList();
      } else {
        throw Exception('Falha ao carregar conquistas');
      }
    } catch (e) {
      throw Exception('Erro ao buscar conquistas: \$e');
    }
  }

  Future<List<UserAchievementModel>> getUserAchievements() async {
    try {
      final response = await _apiService.get('/achievements/user');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.data);
        final List<dynamic> userAchievementsJson = data['data'];
        
        return userAchievementsJson
            .map((json) => UserAchievementModel.fromJson(json))
            .toList();
      } else {
        throw Exception('Falha ao carregar conquistas do usuário');
      }
    } catch (e) {
      throw Exception('Erro ao buscar conquistas do usuário: \$e');
    }
  }

  Future<List<UserAchievementModel>> getUnreadAchievements() async {
    try {
      final response = await _apiService.get('/achievements/user/unread');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.data);
        final List<dynamic> unreadAchievementsJson = data['data'];
        
        return unreadAchievementsJson
            .map((json) => UserAchievementModel.fromJson(json))
            .toList();
      } else {
        throw Exception('Falha ao carregar conquistas não lidas');
      }
    } catch (e) {
      throw Exception('Erro ao buscar conquistas não lidas: \$e');
    }
  }

  Future<void> markAsRead(String achievementId) async {
    try {
      final response = await _apiService.put('/achievements/\$achievementId/read');
      
      if (response.statusCode != 200) {
        throw Exception('Falha ao marcar conquista como lida');
      }
    } catch (e) {
      throw Exception('Erro ao marcar conquista como lida: \$e');
    }
  }

  Future<Map<String, dynamic>> claimReward(String achievementId) async {
    try {
      final response = await _apiService.put('/achievements/\$achievementId/claim');
      
      if (response.statusCode == 200) {
        return json.decode(response.data);
      } else {
        throw Exception('Falha ao resgatar recompensa');
      }
    } catch (e) {
      throw Exception('Erro ao resgatar recompensa: \$e');
    }
  }

  Future<List<UserAchievementModel>> checkUserAchievements() async {
    try {
      final response = await _apiService.post('/achievements/check');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.data);
        final List<dynamic> newAchievementsJson = data['data'];
        
        return newAchievementsJson
            .map((json) => UserAchievementModel.fromJson(json))
            .toList();
      } else {
        throw Exception('Falha ao verificar conquistas');
      }
    } catch (e) {
      throw Exception('Erro ao verificar conquistas: \$e');
    }
  }
}