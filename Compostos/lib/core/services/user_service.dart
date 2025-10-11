import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/core/services/api_service.dart';
import 'package:compostos/core/mappers/user_mapper.dart';

final userServiceProvider = Provider<UserService>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return UserService(apiService);
});

class UserService {
  final ApiService _apiService;
  
  UserService(this._apiService);
  
  Dio get _dio => _apiService.dio;

  Future<Map<String, dynamic>> getUserProfile() async {
    try {
      final response = await _dio.get('/api/users/profile');
      if (response.data['success'] == true) {
        final userData = response.data['data'];
        return {
          'success': true,
          'data': UserMapper.fromApiData(userData).toMap(),
        };
      }
      throw Exception('Erro ao buscar perfil: ${response.data['message']}');
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Não autenticado');
      }
      throw Exception('Erro ao buscar perfil: ${e.message}');
    }
  }

  Future<Map<String, dynamic>> updateUserProfile(Map<String, dynamic> data) async {
    try {
      final response = await _dio.put('/api/users/profile', data: data);
      if (response.data['success'] == true) {
        return response.data;
      }
      return {'success': false, 'message': 'Erro ao atualizar perfil'};
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Não autenticado');
      }
      return {'success': false, 'message': 'Erro ao atualizar perfil'};
    }
  }

  Future<Map<String, dynamic>> getUserStats() async {
    try {
      final response = await _dio.get('/api/users/stats');
      if (response.data['success'] == true) {
        final statsData = response.data['data'];
        return {
          'success': true,
          'data': UserMapper.statsFromApiData(statsData),
        };
      }
      throw Exception('Erro ao buscar estatísticas: ${response.data['message']}');
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Não autenticado');
      }
      throw Exception('Erro ao buscar estatísticas: ${e.message}');
    }
  }

  Future<Map<String, dynamic>> getTransactionHistory({int page = 1, int limit = 20}) async {
    try {
      final response = await _dio.get('/api/users/transactions', queryParameters: {
        'page': page,
        'limit': limit,
      });
      if (response.data['success'] == true) {
        final transactionsData = response.data['data'];
        return {
          'success': true,
          'data': UserMapper.transactionsFromApiData(transactionsData),
          'pagination': response.data['pagination'],
        };
      }
      throw Exception('Erro ao buscar histórico: ${response.data['message']}');
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Não autenticado');
      }
      throw Exception('Erro ao buscar histórico: ${e.message}');
    }
  }

  Future<Map<String, dynamic>> uploadProfilePicture(String imagePath) async {
    try {
      final formData = FormData.fromMap({
        'image': await MultipartFile.fromFile(imagePath),
      });
      
      final response = await _dio.post('/api/users/upload-profile', data: formData);
      if (response.data['success'] == true) {
        return response.data;
      }
      return {'success': false, 'message': 'Erro ao fazer upload da imagem'};
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Não autenticado');
      }
      return {'success': false, 'message': 'Erro ao fazer upload da imagem'};
    }
  }

  /// Buscar referrals do usuário
  Future<Map<String, dynamic>> getUserReferrals() async {
    try {
      final response = await _dio.get('/api/users/referrals');
      if (response.data['success'] == true) {
        final referralsData = response.data['data'];
        return {
          'success': true,
          'data': UserMapper.referralsFromApiData(referralsData),
        };
      }
      throw Exception('Erro ao buscar referrals: ${response.data['message']}');
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Não autenticado');
      }
      throw Exception('Erro ao buscar referrals: ${e.message}');
    }
  }

  /// Buscar investimentos do usuário
  Future<Map<String, dynamic>> getUserInvestments() async {
    try {
      final response = await _dio.get('/api/users/investments');
      if (response.data['success'] == true) {
        return response.data;
      }
      throw Exception('Erro ao buscar investimentos: ${response.data['message']}');
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        throw Exception('Não autenticado');
      }
      throw Exception('Erro ao buscar investimentos: ${e.message}');
    }
  }
}