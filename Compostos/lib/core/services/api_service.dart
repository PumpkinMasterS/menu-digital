import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final apiServiceProvider = Provider<ApiService>((ref) => ApiService());

class ApiService {
  static const String baseUrl = 'http://localhost:5000';
  
  late final Dio _dio;
  
  // Getter público para a instância do Dio
  Dio get dio => _dio;
  

  
  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      // Aceitar todas as respostas e decidir no interceptor
      validateStatus: (status) => true,
    ));
    
    // Interceptor para adicionar token de autenticação e tratar respostas
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Adicionar token JWT se disponível
        final token = await _getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onResponse: (response, handler) async {
        final status = response.statusCode ?? 0;
        if (status >= 200 && status < 300) {
          return handler.next(response);
        }
        if (status == 401 || status == 403) {
          await _clearAuthData();
          return handler.reject(
            DioException(
              requestOptions: response.requestOptions,
              response: response,
              type: DioExceptionType.badResponse,
              message: 'Sessão expirada (${status})',
            ),
          );
        }
        return handler.reject(
          DioException(
            requestOptions: response.requestOptions,
            response: response,
            type: DioExceptionType.badResponse,
            message: 'Erro HTTP ${status}',
          ),
        );
      },
      onError: (error, handler) async {
        // Tratar erros de autenticação
        if (error.response?.statusCode == 401) {
          await _clearAuthData();
          // Deixar o erro seguir para que camadas superiores possam acionar logout/redirecionamento
        }
        return handler.next(error);
      },
    ));
  }
  
  Future<String?> _getToken() async {
    // Obter token do SharedPreferences
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString('auth_token');
    } catch (e) {
      return null;
    }
  }
  
  Future<void> _clearAuthData() async {
    // Remover token e dados de usuário do SharedPreferences
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('auth_token');
      await prefs.remove('user_data');
    } catch (e) {
      // Ignorar erro na remoção
    }
  }
  
  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) async {
    try {
      return await _dio.get(path, queryParameters: queryParameters);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  Future<Response> post(String path, {dynamic data}) async {
    try {
      final response = await _dio.post(path, data: data);
      
      // Verificar se a resposta é bem-sucedida
      if (response.statusCode != null && response.statusCode! >= 200 && response.statusCode! < 300) {
        return response;
      } else {
        // Apenas lançar exceção se realmente for um erro (não 200)
        throw DioException(
          requestOptions: response.requestOptions,
          response: response,
          type: DioExceptionType.badResponse,
        );
      }
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  Future<Response> put(String path, {dynamic data}) async {
    try {
      return await _dio.put(path, data: data);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  Future<Response> delete(String path) async {
    try {
      return await _dio.delete(path);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  Exception _handleError(DioException e) {
    if (e.response != null) {
      // Retornar a exceção original para que o chamador possa inspecionar a resposta
      return e;
    } else {
      // Para erros de conexão, você pode querer um tratamento diferente
      return Exception('Erro de conexão: ${e.message}');
    }
  }
}