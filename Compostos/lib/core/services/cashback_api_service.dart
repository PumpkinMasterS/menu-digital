import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:compostos/core/services/auth_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class CashbackApiService {
  final Ref ref;
  CashbackApiService(this.ref);

  AuthService get _authService => ref.read(authServiceProvider);
  static const String _baseUrl = 'http://localhost:5000/api';

  Future<Map<String, dynamic>> calculateCashback(double amount, String robotType) async {
    try {
      final token = await _authService.getToken();
      if (token == null) {
        throw Exception('Usuário não autenticado');
      }

      final response = await http.post(
        Uri.parse('$_baseUrl/cashback/calculate'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({'amount': amount, 'robotType': robotType}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'success': true,
          'data': data['data'],
        };
      } else if (response.statusCode == 403) {
        throw Exception('Acesso negado. Apenas administradores podem acessar esta funcionalidade.');
      } else {
        final error = json.decode(response.body);
        throw Exception(error['message'] ?? 'Erro ao calcular cashback');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> applyCashback(String investmentId) async {
    try {
      final token = await _authService.getToken();
      if (token == null) {
        throw Exception('Usuário não autenticado');
      }

      final response = await http.post(
        Uri.parse('$_baseUrl/cashback/apply/$investmentId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'success': true,
          'message': data['message'],
          'data': data['data'],
        };
      } else if (response.statusCode == 403) {
        throw Exception('Acesso negado. Apenas administradores podem acessar esta funcionalidade.');
      } else {
        final error = json.decode(response.body);
        throw Exception(error['message'] ?? 'Erro ao aplicar cashback');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getCashbackHistory({
    int page = 1,
    int limit = 10,
  }) async {
    try {
      final token = await _authService.getToken();
      if (token == null) {
        throw Exception('Usuário não autenticado');
      }

      final response = await http.get(
        Uri.parse('$_baseUrl/cashback/history?page=$page&limit=$limit'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'success': true,
          'data': data['data'],
        };
      } else if (response.statusCode == 403) {
        throw Exception('Acesso negado. Apenas administradores podem acessar esta funcionalidade.');
      } else {
        final error = json.decode(response.body);
        throw Exception(error['message'] ?? 'Erro ao buscar histórico de cashback');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getCashbackStats() async {
    try {
      final token = await _authService.getToken();
      if (token == null) {
        throw Exception('Usuário não autenticado');
      }

      final response = await http.get(
        Uri.parse('$_baseUrl/cashback/stats'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'success': true,
          'data': data['data'],
        };
      } else if (response.statusCode == 403) {
        throw Exception('Acesso negado. Apenas administradores podem acessar esta funcionalidade.');
      } else {
        final error = json.decode(response.body);
        throw Exception(error['message'] ?? 'Erro ao buscar estatísticas de cashback');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> updateCashbackRules(List<Map<String, dynamic>> rules) async {
    try {
      final token = await _authService.getToken();
      if (token == null) {
        throw Exception('Usuário não autenticado');
      }

      final response = await http.put(
        Uri.parse('$_baseUrl/cashback/rules'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({'rules': rules}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'success': true,
          'message': data['message'],
        };
      } else if (response.statusCode == 403) {
        throw Exception('Acesso negado. Apenas administradores podem acessar esta funcionalidade.');
      } else {
        final error = json.decode(response.body);
        throw Exception(error['message'] ?? 'Erro ao atualizar regras de cashback');
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> addSpecialPromotion(Map<String, dynamic> promotion) async {
    try {
      final token = await _authService.getToken();
      if (token == null) {
        throw Exception('Usuário não autenticado');
      }

      final response = await http.post(
        Uri.parse('$_baseUrl/cashback/promotions'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode({'promotion': promotion}),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return {
          'success': true,
          'message': data['message'],
        };
      } else if (response.statusCode == 403) {
        throw Exception('Acesso negado. Apenas administradores podem acessar esta funcionalidade.');
      } else {
        final error = json.decode(response.body);
        throw Exception(error['message'] ?? 'Erro ao adicionar promoção');
      }
    } catch (e) {
      rethrow;
    }
  }
}