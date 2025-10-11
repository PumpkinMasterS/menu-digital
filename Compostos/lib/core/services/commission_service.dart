import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/core/services/api_service.dart';

final commissionServiceProvider = Provider<CommissionService>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return CommissionService(dio: apiService.dio);
});

class CommissionService {
  final Dio dio;

  CommissionService({required this.dio});

  /// Obtém todas as comissões do usuário com filtros opcionais
  Future<Map<String, dynamic>> getUserCommissions({
    String? status,
    String? level,
    String? sourceType,
    DateTime? startDate,
    DateTime? endDate,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final params = {
        if (status != null) 'status': status,
        if (level != null) 'level': level,
        if (sourceType != null) 'sourceType': sourceType,
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
        'page': page.toString(),
        'limit': limit.toString(),
      };

      final response = await dio.get('/api/commissions', queryParameters: params);
      return response.data;
    } catch (error) {
      throw Exception('Erro ao buscar comissões: \$error');
    }
  }

  /// Obtém estatísticas de comissões do usuário
  Future<Map<String, dynamic>> getCommissionStats() async {
    try {
      final response = await dio.get('/api/commissions/stats');
      return response.data;
    } catch (error) {
      throw Exception('Erro ao buscar estatísticas de comissões: \$error');
    }
  }

  /// Obtém comissões por nível específico
  Future<Map<String, dynamic>> getCommissionsByLevel(int level) async {
    try {
      final response = await dio.get('/api/commissions/level/\$level');
      return response.data;
    } catch (error) {
      throw Exception('Erro ao buscar comissões do nível \$level: \$error');
    }
  }

  /// Aprova uma comissão pendente (apenas admin)
  Future<void> approveCommission(String commissionId) async {
    try {
      await dio.post('/api/commissions/approve', data: {
        'commissionId': commissionId,
      });
    } catch (error) {
      throw Exception('Erro ao aprovar comissão: \$error');
    }
  }

  /// Paga uma comissão aprovada (apenas admin)
  Future<void> payCommission(String commissionId) async {
    try {
      await dio.post('/api/commissions/pay', data: {
        'commissionId': commissionId,
      });
    } catch (error) {
      throw Exception('Erro ao pagar comissão: \$error');
    }
  }

  /// Cancela uma comissão (apenas admin)
  Future<void> cancelCommission(String commissionId) async {
    try {
      await dio.post('/api/commissions/cancel', data: {
        'commissionId': commissionId,
      });
    } catch (error) {
      throw Exception('Erro ao cancelar comissão: \$error');
    }
  }

  /// Obtém todas as comissões (apenas admin)
  Future<Map<String, dynamic>> getAllCommissions({
    String? status,
    String? level,
    int page = 1,
    int limit = 50,
  }) async {
    try {
      final params = {
        if (status != null) 'status': status,
        if (level != null) 'level': level,
        'page': page.toString(),
        'limit': limit.toString(),
      };

      final response = await dio.get('/api/admin/commissions', queryParameters: params);
      return response.data;
    } catch (error) {
      throw Exception('Erro ao buscar todas as comissões: \$error');
    }
  }

  /// Obtém estatísticas gerais de comissões (apenas admin)
  Future<Map<String, dynamic>> getAdminCommissionStats() async {
    try {
      final response = await dio.get('/api/admin/commissions/stats');
      return response.data;
    } catch (error) {
      throw Exception('Erro ao buscar estatísticas administrativas: \$error');
    }
  }
}