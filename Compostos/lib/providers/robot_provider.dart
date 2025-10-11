import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/models/robot_model.dart';
import 'package:compostos/core/services/robot_service.dart';
import 'package:compostos/core/services/auth_service.dart';
import 'package:dio/dio.dart';
import 'package:compostos/providers/user_provider.dart';

final robotProvider = NotifierProvider<RobotNotifier, List<RobotModel>>(() {
  return RobotNotifier();
});



class RobotNotifier extends Notifier<List<RobotModel>> {
  late RobotService _robotService;
  
  @override
  List<RobotModel> build() {
    _robotService = ref.watch(robotServiceProvider);
    _init();
    return [];
  }

  Future<void> _init() async {
    try {
      final isLogged = await ref.read(authServiceProvider).isLoggedIn();
      if (isLogged) {
        await loadRobots();
      } else {
        // Não carregar robôs quando não autenticado
      }
    } catch (_) {
      // Ignorar erros de verificação
    }
  }

  // Carregar robôs da API
  Future<void> loadRobots() async {
    try {
      final robots = await _robotService.getUserRobots();
      state = robots;
    } catch (e) {
      if (e is DioException && (e.response?.statusCode == 401 || e.response?.statusCode == 403)) {
        await ref.read(userProvider.notifier).logout();
        return;
      }
      print('Erro ao carregar robôs: $e');
      // Mantém o estado atual em caso de erro
    }
  }

  // Carregar robôs disponíveis para investimento
  Future<List<RobotModel>> loadAvailableRobots() async {
    try {
      return await _robotService.getAvailableRobots();
    } catch (e) {
      if (e is DioException && (e.response?.statusCode == 401 || e.response?.statusCode == 403)) {
        await ref.read(userProvider.notifier).logout();
        return [];
      }
      print('Erro ao carregar robôs disponíveis: $e');
      return [];
    }
  }

  // Método para adicionar robô (investir em robô)
  Future<void> addRobot(String robotId, double amount) async {
    try {
      // Primeiro busca o robô completo
      final robot = await _robotService.getRobotById(robotId);
      
      // Adiciona localmente para feedback imediato
      state = [...state, robot];
      
      // Sincroniza com a API
      await _robotService.purchaseRobot(robotId, amount);
      
      // Recarrega os robôs para garantir sincronização
      await loadRobots();
    } catch (e) {
      if (e is DioException && (e.response?.statusCode == 401 || e.response?.statusCode == 403)) {
        await ref.read(userProvider.notifier).logout();
        // Reverte a adição local em caso de sessão expirada
        state = state.where((r) => r.id != robotId).toList();
        throw Exception('Sessão expirada, faça login novamente');
      }
      // Reverte a adição local em caso de erro
      state = state.where((r) => r.id != robotId).toList();
      throw Exception('Erro ao adicionar robô: $e');
    }
  }

  // Método para remover robô
  Future<void> removeRobot(String robotId) async {
    final robot = getRobotById(robotId);
    if (robot != null) {
      // Primeiro remove localmente para feedback imediato
      state = state.where((robot) => robot.id != robotId).toList();
      
      try {
        // TODO: Implementar endpoint de remoção na API
        // await _robotService.removeRobot(robotId);
        
        // Recarrega os robôs para garantir sincronização
        await loadRobots();
      } catch (e) {
        if (e is DioException && (e.response?.statusCode == 401 || e.response?.statusCode == 403)) {
          await ref.read(userProvider.notifier).logout();
          // Reverte a remoção local em caso de sessão expirada
          state = [...state, robot];
          throw Exception('Sessão expirada, faça login novamente');
        }
        // Reverte a remoção local em caso de erro
        state = [...state, robot];
        throw Exception('Erro ao remover robô: $e');
      }
    }
  }

  // Método para atualizar robô
  Future<void> updateRobot(String robotId, RobotModel updatedRobot) async {
    final oldState = state;
    
    try {
      // Atualiza localmente primeiro
      state = state.map((robot) => robot.id == robotId ? updatedRobot : robot).toList();
      
      // Sincroniza com a API
      await _robotService.toggleRobot(robotId, updatedRobot.isActive);
      
      // Recarrega para garantir sincronização
      await loadRobots();
    } catch (e) {
      if (e is DioException && (e.response?.statusCode == 401 || e.response?.statusCode == 403)) {
        await ref.read(userProvider.notifier).logout();
        // Reverte em caso de sessão expirada
        state = oldState;
        throw Exception('Sessão expirada, faça login novamente');
      }
      // Reverte em caso de erro
      state = oldState;
      throw Exception('Erro ao atualizar robô: $e');
    }
  }

  // Método para ativar/desativar robô
  Future<void> toggleRobot(String robotId) async {
    final robot = getRobotById(robotId);
    if (robot != null) {
      final newActiveState = !robot.isActive;
      
      try {
        // Atualiza na API primeiro
        await _robotService.toggleRobot(robotId, newActiveState);
        
        // Depois atualiza localmente
        state = state.map((r) {
          if (r.id == robotId) {
            return r.copyWith(isActive: newActiveState);
          }
          return r;
        }).toList();
      } catch (e) {
        if (e is DioException && (e.response?.statusCode == 401 || e.response?.statusCode == 403)) {
          await ref.read(userProvider.notifier).logout();
          throw Exception('Sessão expirada, faça login novamente');
        }
        throw Exception('Erro ao alternar robô: $e');
      }
    }
  }

  // Método para obter robô por ID
  RobotModel? getRobotById(String robotId) {
    try {
      return state.firstWhere((robot) => robot.id == robotId);
    } catch (e) {
      return null;
    }
  }

  // Método para obter robôs ativos
  List<RobotModel> get activeRobots {
    return state.where((robot) => robot.isActive).toList();
  }

  // Método para obter robôs inativos
  List<RobotModel> get inactiveRobots {
    return state.where((robot) => !robot.isActive).toList();
  }

  // Método para calcular ganhos diários totais
  double get totalDailyEarnings {
    return state.fold(0.0, (sum, robot) => sum + robot.dailyEarnings);
  }
}