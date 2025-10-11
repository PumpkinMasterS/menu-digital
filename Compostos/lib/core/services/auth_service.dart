import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';

final authServiceProvider = Provider<AuthService>((ref) => AuthService(ref));

class AuthService {
  final Ref? _ref;
  
  AuthService([this._ref]);
  
  ApiService _api() {
    final ref = _ref;
    if (ref == null) {
      throw Exception('AuthService requires a Provider Ref for network operations');
    }
    return ref.read(apiServiceProvider);
  }
  
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'user_data';
  
  Future<String?> login(String email, String password) async {
    try {
      final response = await _api().post(
        '/api/auth/login',
        data: {
          'email': email,
          'password': password,
        },
      );
      
      if (response.statusCode == 200) {
        final body = response.data;
        final data = body is Map<String, dynamic> ? body['data'] as Map<String, dynamic>? : null;
        final token = data != null ? data['token'] as String? : null;
        final userData = data != null ? data['user'] as Map<String, dynamic>? : null;
        
        print('Login response received - token: $token, user data: $userData');
        
        if (token == null || token.isEmpty) {
          throw Exception('Resposta de login inválida: token ausente.');
        }
        
        // Salvar token e dados do usuário
        await _saveToken(token);
        if (userData != null) {
          await _saveUserData(userData);
        }
        
        // Verificar se o token foi salvo corretamente
        final savedToken = await getCurrentToken();
        print('Token saved successfully: $savedToken');
        
        print('Login successful in AuthService');
        return token;
      }
      
      throw Exception('Login falhou: ${response.data["message"]}');
    } on DioException catch (e) {
      throw Exception('Erro no login: ${e.response?.data ?? e.message}');
    } catch (e) {
      throw Exception('Erro no login: $e');
    }
  }
  
  Future<String?> register(String name, String email, String password, {String? referralCode}) async {
    try {
      final response = await _api().post(
        '/api/auth/register',
        data: {
          'name': name,
          'email': email,
          'password': password,
          'referralCode': referralCode,
        },
      );
      
      if (response.statusCode == 201) {
        final body = response.data;
        final data = body is Map<String, dynamic> ? body['data'] as Map<String, dynamic>? : null;
        final token = data != null ? data['token'] as String? : null;
        final userData = data != null ? data['user'] as Map<String, dynamic>? : null;
        
        if (token == null || token.isEmpty) {
          throw Exception('Resposta de registro inválida: token ausente.');
        }
        
        // Salvar token e dados do usuário
        await _saveToken(token);
        if (userData != null) {
          await _saveUserData(userData);
        }
        
        return token;
      }
      
      throw Exception('Registro falhou: ${response.data["message"]}');
    } on DioException catch (e) {
      throw Exception('Erro no registro: ${e.response?.data ?? e.message}');
    } catch (e) {
      throw Exception('Erro no registro: $e');
    }
  }
  
  Future<void> logout() async {
    try {
      await _api().post('/api/auth/logout');
    } catch (e) {
      // Ignorar erros no logout
    } finally {
      await _clearAuthData();
    }
  }

  Future<void> forgotPassword(String email) async {
    try {
      final response = await _api().post(
        '/auth/forgot-password',
        data: {'email': email},
      );

      if (response.statusCode != 200) {
        throw Exception('Erro ao solicitar recuperação de senha');
      }
    } catch (e) {
      throw Exception('Erro ao solicitar recuperação de senha: $e');
    }
  }

  Future<void> resetPassword(String resetToken, String newPassword) async {
    try {
      final response = await _api().post(
        '/auth/reset-password/$resetToken',
        data: {'password': newPassword},
      );

      if (response.statusCode != 200) {
        throw Exception('Erro ao redefinir senha');
      }
    } catch (e) {
      throw Exception('Erro ao redefinir senha: $e');
    }
  }
  
  Future<String?> getCurrentToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }
  
  // Compat: muitos serviços chamam getToken(); delega para getCurrentToken()
  Future<String?> getToken() async {
    return getCurrentToken();
  }
  
  Future<Map<String, dynamic>?> getCurrentUser() async {
    final prefs = await SharedPreferences.getInstance();
    final userJson = prefs.getString(_userKey);
    return userJson != null ? Map<String, dynamic>.from(json.decode(userJson)) : null;
  }
  
  Future<bool> isLoggedIn() async {
    final token = await getCurrentToken();
    return token != null;
  }
  
  Future<void> _saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }
  
  Future<void> _saveUserData(Map<String, dynamic> userData) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, json.encode(userData));
  }
  
  Future<void> _clearAuthData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }
}