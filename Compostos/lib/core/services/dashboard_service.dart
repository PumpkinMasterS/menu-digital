import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/core/services/api_service.dart';

class DashboardService {
  final Dio _dio;

  DashboardService({required Dio dio}) : _dio = dio;

  // Buscar estatísticas do dashboard
  Future<Map<String, dynamic>> getDashboardStats() async {
    try {
      final response = await _dio.get('/api/dashboard');
      print('API Response for /api/dashboard: ${response.data}');
      return response.data;
    } on DioException catch (e) {
      print('Error in getDashboardStats: $e');
      if (e.response?.statusCode == 404 || e.response?.statusCode == 500) {
        // Endpoint não implementado ou erro no servidor, lançar exceção
        throw Exception('Endpoint /api/dashboard não disponível: ${e.message}');
      }
      rethrow;
    }
  }

  // Buscar estatísticas de robôs
  Future<Map<String, dynamic>> getRobotStats() async {
    try {
      final response = await _dio.get('/api/robots/stats/overview');
      return response.data['data'];
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw Exception('Endpoint /api/robots/stats/overview não disponível: ${e.message}');
      }
      throw Exception('Erro ao buscar estatísticas de robôs: ${e.message}');
    }
  }

  // Buscar estatísticas de tarefas
  Future<Map<String, dynamic>> getTaskStats() async {
    try {
      final response = await _dio.get('/api/tasks/stats/overview');
      return response.data['data'];
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        // Endpoint não implementado ainda, lançar exceção
        throw Exception('Endpoint /api/tasks/stats/overview não disponível: ${e.message}');
      }
      rethrow;
    }
  }

  // Parar monitoramento em tempo real
  Future<void> stopRealtimeMonitoring() async {
    try {
      await _dio.post('/api/dashboard/stop-realtime');
    } on DioException catch (e) {
      print('Erro ao parar monitoramento em tempo real: ${e.message}');
    }
  }

  // Buscar dados históricos para gráficos
  Future<Map<String, dynamic>> getHistoricalData({String period = '7d'}) async {
    try {
      final response = await _dio.get('/api/dashboard/history', queryParameters: {
        'period': period,
      });
      return response.data;
    } on DioException catch (e) {
      print('Error in getHistoricalData: $e');
      if (e.response?.statusCode == 404 || e.response?.statusCode == 500) {
        // Endpoint não implementado ou erro no servidor, lançar exceção
        throw Exception('Endpoint /api/dashboard/history não disponível: ${e.message}');
      }
      rethrow;
    }
  }


}

// Provider para o DashboardService
final dashboardServiceProvider = Provider<DashboardService>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return DashboardService(dio: apiService.dio);
});