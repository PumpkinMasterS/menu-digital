import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/core/services/api_service.dart';

final profitServiceProvider = Provider<ProfitService>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return ProfitService(dio: apiService.dio);
});

class ProfitService {
  final Dio _dio;

  ProfitService({required Dio dio}) : _dio = dio;

  // Coletar lucros manualmente (rota admin)
  Future<Map<String, dynamic>> collectProfits() async {
    try {
      final response = await _dio.post('/api/profits/force-collection');
      // Backend retorna { message, timestamp }
      return Map<String, dynamic>.from(response.data ?? {});
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401) {
        throw Exception('Não autorizado - token inválido (401)');
      }
      if (status == 403) {
        throw Exception('Acesso negado: apenas administradores podem forçar coleta (403)');
      }
      throw Exception('Erro ao coletar lucros: ${status ?? e.message}');
    }
  }

  // Obter "pendências" de lucros — backend expõe apenas o status do coletor
  // Normalizamos para sempre retornar ao menos { pendingProfit: 0.0 }
  Future<Map<String, dynamic>> getPendingProfits() async {
    try {
      final response = await _dio.get('/api/profits/status');
      final data = Map<String, dynamic>.from(response.data ?? {});
      return {
        'pendingProfit': 0.0, // Backend atual não provê valor pendente por usuário
        'status': data,       // Inclui payload de status para possíveis usos futuros
      };
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401) {
        throw Exception('Não autorizado - token inválido (401)');
      }
      // Em 404 ou indisponibilidade, retornar 0.0 para não exibir botão de coleta
      return {
        'pendingProfit': 0.0,
      };
    }
  }

  // Obter histórico de lucros (rota ainda não implementada no backend)
  Future<List<dynamic>> getProfitHistory() async {
    try {
      final response = await _dio.get('/api/profits/history');
      final data = response.data;
      if (data is Map<String, dynamic>) {
        return List<dynamic>.from(data['history'] ?? []);
      }
      if (data is List) {
        return List<dynamic>.from(data);
      }
      return [];
    } on DioException catch (e) {
      final status = e.response?.statusCode;
      if (status == 401) {
        throw Exception('Não autorizado - token inválido (401)');
      }
      // Fallback seguro para 404/indisponibilidade
      return [];
    }
  }
}