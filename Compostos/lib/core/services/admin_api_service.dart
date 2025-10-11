import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:compostos/core/services/auth_service.dart';
import 'package:compostos/models/user_model.dart';

class AdminApiService {
  final Dio _dio;
  final AuthService _authService;

  AdminApiService({required Dio dio, required AuthService authService})
      : _dio = dio,
        _authService = authService;

  // Método para adicionar token de autenticação
  Future<void> _addAuthHeader() async {
    final token = await _authService.getToken();
    if (token != null) {
      _dio.options.headers['Authorization'] = 'Bearer $token';
    }
  }

  // Obter estatísticas do dashboard administrativo
  Future<Map<String, dynamic>> getDashboardStats() async {
    try {
      await _addAuthHeader();
      final response = await _dio.get('/api/admin/dashboard/stats');
      return response.data['data'];
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) {
        throw Exception('Acesso negado. Apenas administradores podem acessar esta funcionalidade.');
      }
      throw Exception('Erro ao buscar estatísticas: ${e.response?.data?['message'] ?? e.message}');
    }
  }

  // Listar usuários com paginação e busca
  Future<Map<String, dynamic>> getUsers({
    int page = 1,
    int limit = 10,
    String search = '',
    String role = '',
    String status = '',
  }) async {
    try {
      await _addAuthHeader();
      final response = await _dio.get('/api/admin/users', queryParameters: {
        'page': page,
        'limit': limit,
        'search': search,
        'role': role,
        'status': status,
      });
      return response.data['data'];
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) {
        throw Exception('Acesso negado. Apenas administradores podem acessar esta funcionalidade.');
      }
      throw Exception('Erro ao buscar usuários: ${e.response?.data?['message'] ?? e.message}');
    }
  }

  // Obter detalhes de um usuário específico
  Future<UserModel> getUserDetails(String userId) async {
    try {
      await _addAuthHeader();
      final response = await _dio.get('/api/admin/users/$userId');
      return UserModel.fromJson(response.data['data']);
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) {
        throw Exception('Acesso negado. Apenas administradores podem acessar esta funcionalidade.');
      }
      throw Exception('Erro ao buscar detalhes do usuário: ${e.response?.data?['message'] ?? e.message}');
    }
  }

  // Obter estatísticas de crescimento
  Future<Map<String, dynamic>> getGrowthStats() async {
    try {
      await _addAuthHeader();
      final response = await _dio.get('/api/admin/growth/stats');
      return response.data['data'];
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) {
        throw Exception('Acesso negado. Apenas administradores podem acessar esta funcionalidade.');
      }
      throw Exception('Erro ao buscar estatísticas de crescimento: ${e.response?.data?['message'] ?? e.message}');
    }
  }

  // Atualizar status de um usuário
  Future<void> updateUserStatus(String userId, bool isActive) async {
    try {
      await _addAuthHeader();
      await _dio.put('/api/admin/users/$userId/status', data: {
        'isActive': isActive,
      });
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) {
        throw Exception('Acesso negado. Apenas administradores podem acessar esta funcionalidade.');
      }
      throw Exception('Erro ao atualizar status do usuário: ${e.response?.data?['message'] ?? e.message}');
    }
  }

  // Atualizar role de um usuário
  Future<void> updateUserRole(String userId, String role) async {
    try {
      await _addAuthHeader();
      await _dio.put('/api/admin/users/$userId/role', data: {
        'role': role,
      });
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) {
        throw Exception('Acesso negado. Apenas administradores podem acessar esta funcionalidade.');
      }
      throw Exception('Erro ao atualizar role do usuário: ${e.response?.data?['message'] ?? e.message}');
    }
  }
}