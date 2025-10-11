import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dio_provider.dart';
import 'package:compostos/core/services/auth_service.dart';
import 'package:compostos/models/user_model.dart';

class ReportApiService {
  final Dio _dio;
  final AuthService _authService;

  ReportApiService({required Dio dio, required AuthService authService})
      : _dio = dio,
        _authService = authService;

  Future<Map<String, dynamic>> getPerformanceReport({
    DateTime? startDate,
    DateTime? endDate,
    String groupBy = 'day',
  }) async {
    try {
      final token = await _authService.getToken();
      
      final params = {
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
        'groupBy': groupBy,
      };

      final response = await _dio.get(
        '/reports/performance',
        queryParameters: params,
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
          },
        ),
      );

      return response.data['data'];
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) {
        throw Exception('Acesso negado. Você não tem permissão para acessar relatórios.');
      }
      throw Exception('Erro ao buscar relatório de performance: ${e.message}');
    } catch (e) {
      throw Exception('Erro inesperado: $e');
    }
  }

  Future<Map<String, dynamic>> getUsersReport({
    int page = 1,
    int limit = 10,
    String sortBy = 'createdAt',
    String sortOrder = 'desc',
  }) async {
    try {
      final token = await _authService.getToken();
      
      final params = {
        'page': page,
        'limit': limit,
        'sortBy': sortBy,
        'sortOrder': sortOrder,
      };

      final response = await _dio.get(
        '/reports/users',
        queryParameters: params,
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
          },
        ),
      );

      return response.data['data'];
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) {
        throw Exception('Acesso negado. Você não tem permissão para acessar relatórios.');
      }
      throw Exception('Erro ao buscar relatório de usuários: ${e.message}');
    } catch (e) {
      throw Exception('Erro inesperado: $e');
    }
  }

  Future<Map<String, dynamic>> getFinancialReport({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final token = await _authService.getToken();
      
      final params = {
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
      };

      final response = await _dio.get(
        '/reports/financial',
        queryParameters: params,
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
          },
        ),
      );

      return response.data['data'];
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) {
        throw Exception('Acesso negado. Você não tem permissão para acessar relatórios.');
      }
      throw Exception('Erro ao buscar relatório financeiro: ${e.message}');
    } catch (e) {
      throw Exception('Erro inesperado: $e');
    }
  }

  // Método para exportar relatório em CSV
  Future<String> exportReportToCsv({
    required String reportType,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final token = await _authService.getToken();
      
      final params = {
        if (startDate != null) 'startDate': startDate.toIso8601String(),
        if (endDate != null) 'endDate': endDate.toIso8601String(),
        'format': 'csv',
      };

      final response = await _dio.get(
        '/reports/$reportType/export',
        queryParameters: params,
        options: Options(
          headers: {
            'Authorization': 'Bearer $token',
            'Accept': 'text/csv',
          },
          responseType: ResponseType.plain,
        ),
      );

      return response.data.toString();
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) {
        throw Exception('Acesso negado. Você não tem permissão para exportar relatórios.');
      }
      throw Exception('Erro ao exportar relatório: ${e.message}');
    } catch (e) {
      throw Exception('Erro inesperado: $e');
    }
  }
}

// Provider para o serviço de relatórios
final reportApiServiceProvider = Provider<ReportApiService>((ref) {
  final dio = ref.watch(dioProvider);
  final authService = ref.watch(authServiceProvider);
  return ReportApiService(dio: dio, authService: authService);
});