import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/core/services/api_service.dart';
import 'package:compostos/models/robot_model.dart';
import 'package:compostos/core/mappers/robot_mapper.dart';

final robotServiceProvider = Provider<RobotService>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return RobotService(dio: apiService.dio);
});

class RobotService {
  final Dio _dio;

  RobotService({required Dio dio}) : _dio = dio;

  // Buscar todos os robôs disponíveis para investimento
  Future<List<RobotModel>> getAvailableRobots() async {
    final response = await _dio.get('/api/robots');
    final data = response.data as Map<String, dynamic>;
    if (data['success'] == true && data['data'] is List) {
      return RobotMapper.listFromApiData(data['data'] as List);
    }
    throw Exception('Formato de resposta inválido para robôs disponíveis: ${data['message']}');
  }

  // Buscar robôs do usuário
  Future<List<RobotModel>> getUserRobots() async {
    final response = await _dio.get('/api/robots/user');
    final data = response.data as Map<String, dynamic>;
    if (data['success'] == true && data['data'] is List) {
      return RobotMapper.listFromUserInvestments(data['data'] as List);
    }
    throw Exception('Formato de resposta inválido para robôs do usuário: ${data['message']}');
  }

  // Buscar robô por ID
  Future<RobotModel> getRobotById(String robotId) async {
    final response = await _dio.get('/api/robots/$robotId');
    final data = response.data as Map<String, dynamic>;
    if (data['success'] == true) {
      return RobotMapper.fromApiData(data['data'] as Map<String, dynamic>);
    }
    throw Exception('Falha ao buscar robô: ${data['message']}');
  }

  // Comprar novo robô
  Future<RobotModel> purchaseRobot(String robotId, double amount) async {
    try {
      final response = await _dio.post(
        '/api/robots',
        data: {
          'robotId': robotId,
          'amount': amount,
        },
      );
      final data = response.data as Map<String, dynamic>;
      if (data['success'] == true) {
        return RobotMapper.fromUserInvestmentData(data['data'] as Map<String, dynamic>);
      }
      throw Exception('Falha ao comprar robô: ${data['message']}');
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401 || status == 403) {
        rethrow;
      }
      throw Exception('Erro na compra do robô: ${e.message}');
    }
  }

  // Ativar/desativar robô
  Future<void> toggleRobot(String robotId, bool isActive) async {
    try {
      // Não há rota PATCH no backend atual. Tentar PATCH e tratar 404 como no-op.
      await _dio.patch(
        '/api/robots/$robotId',
        data: {'isActive': isActive},
      );
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401 || status == 403) {
        rethrow;
      }
      if (status == 404) {
        // Endpoint ainda não implementado, tratar como no-op para não quebrar UX
        return;
      }
      throw Exception('Erro ao alternar estado do robô: ${e.message}');
    }
  }

  // Buscar estatísticas de robôs
  Future<Map<String, dynamic>> getRobotStats() async {
    final response = await _dio.get('/api/robots/stats/overview');
    final data = response.data as Map<String, dynamic>;
    if (data['success'] == true) {
      return data['data'] as Map<String, dynamic>;
    }
    throw Exception('Falha ao buscar estatísticas: ${data['message']}');
  }


}