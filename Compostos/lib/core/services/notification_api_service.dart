import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dio_provider.dart';
import 'package:compostos/config/api_config.dart';
import 'package:compostos/core/services/auth_service.dart';

class NotificationApiService {
  final Dio _dio;
  final AuthService _authService;

  NotificationApiService({required Dio dio, required AuthService authService})
      : _dio = dio,
        _authService = authService;

  // Buscar notificações do usuário
  Future<Map<String, dynamic>> getNotifications({
    int page = 1,
    int limit = 20,
    bool unreadOnly = false,
  }) async {
    try {
      final token = await _authService.getToken();
      
      final response = await _dio.get(
        '\${ApiConfig.baseUrl}/notifications',
        queryParameters: {
          'page': page,
          'limit': limit,
          'unread': unreadOnly,
        },
        options: Options(
          headers: {
            'Authorization': 'Bearer \$token',
          },
        ),
      );

      if (response.data['success'] == true) {
        return response.data['data'];
      } else {
        throw Exception('Falha ao buscar notificações');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        await _authService.logout();
      }
      throw Exception('Erro ao buscar notificações: \${e.message}');
    } catch (e) {
      throw Exception('Erro inesperado: \$e');
    }
  }

  // Obter contagem de notificações não lidas
  Future<int> getUnreadCount() async {
    try {
      final token = await _authService.getToken();
      
      final response = await _dio.get(
        '\${ApiConfig.baseUrl}/notifications/unread/count',
        options: Options(
          headers: {
            'Authorization': 'Bearer \$token',
          },
        ),
      );

      if (response.data['success'] == true) {
        return response.data['data']['count'];
      } else {
        throw Exception('Falha ao buscar contagem de não lidas');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        await _authService.logout();
      }
      // Retorna 0 em caso de erro para não quebrar a UI
      return 0;
    } catch (e) {
      return 0;
    }
  }

  // Marcar notificação como lida
  Future<void> markAsRead(String notificationId) async {
    try {
      final token = await _authService.getToken();
      
      await _dio.put(
        '\${ApiConfig.baseUrl}/notifications/\$notificationId/read',
        options: Options(
          headers: {
            'Authorization': 'Bearer \$token',
          },
        ),
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        await _authService.logout();
      }
      throw Exception('Erro ao marcar notificação como lida: \${e.message}');
    } catch (e) {
      throw Exception('Erro inesperado: \$e');
    }
  }

  // Marcar todas as notificações como lidas
  Future<void> markAllAsRead() async {
    try {
      final token = await _authService.getToken();
      
      await _dio.put(
        '\${ApiConfig.baseUrl}/notifications/read-all',
        options: Options(
          headers: {
            'Authorization': 'Bearer \$token',
          },
        ),
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        await _authService.logout();
      }
      throw Exception('Erro ao marcar todas como lidas: \${e.message}');
    } catch (e) {
      throw Exception('Erro inesperado: \$e');
    }
  }

  // Criar notificação de teste (apenas desenvolvimento)
  Future<void> createTestNotification({
    required String title,
    required String message,
    String type = 'info',
  }) async {
    try {
      final token = await _authService.getToken();
      
      await _dio.post(
        '\${ApiConfig.baseUrl}/notifications/test',
        data: {
          'title': title,
          'message': message,
          'type': type,
        },
        options: Options(
          headers: {
            'Authorization': 'Bearer \$token',
          },
        ),
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 401) {
        await _authService.logout();
      }
      throw Exception('Erro ao criar notificação de teste: \${e.message}');
    } catch (e) {
      throw Exception('Erro inesperado: \$e');
    }
  }
}

// Provider para o serviço de notificações
final notificationApiServiceProvider = Provider<NotificationApiService>((ref) {
  final dio = ref.watch(dioProvider);
  final authService = ref.watch(authServiceProvider);
  return NotificationApiService(dio: dio, authService: authService);
});