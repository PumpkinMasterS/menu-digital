import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() async {
  print('🔍 Teste de Debug - Token e Configuração Dio');
  print('=' * 50);
  
  // 1. Verificar token armazenado
  print('1. Verificando token armazenado no SharedPreferences...');
  final prefs = await SharedPreferences.getInstance();
  final storedToken = prefs.getString('auth_token');
  
  if (storedToken == null) {
    print('❌ NENHUM TOKEN ENCONTRADO no SharedPreferences');
    print('   Chave: auth_token');
    print('   Isso explica o erro 401 - Token inválido ou expirado');
  } else {
    print('✅ TOKEN ENCONTRADO:');
    print('   Comprimento: ${storedToken.length} caracteres');
    print('   Primeiros 20 chars: ${storedToken.substring(0, min(20, storedToken.length))}...');
    print('   Últimos 20 chars: ...${storedToken.substring(max(0, storedToken.length - 20))}');
  }
  
  print('\n2. Testando configuração do Dio...');
  
  // 2. Testar configuração do Dio (simulando o interceptor)
  final dio = Dio(BaseOptions(
    baseUrl: 'http://localhost:5000',
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
    validateStatus: (status) => true,
  ));
  
  // Adicionar interceptor similar ao original
  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      print('   📤 Interceptor onRequest: ${options.method} ${options.path}');
      
      // Simular obtenção do token (igual ao código original)
      final token = await _getTokenSimulated();
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
        print('   ✅ Authorization header adicionado');
      } else {
        print('   ⚠️  Nenhum token disponível para adicionar');
      }
      
      print('   📤 Headers finais: ${options.headers}');
      return handler.next(options);
    },
    onResponse: (response, handler) {
      print('   📥 Interceptor onResponse: ${response.statusCode}');
      return handler.next(response);
    },
    onError: (error, handler) {
      print('   ❌ Interceptor onError: ${error.response?.statusCode}');
      print('   ❌ Tipo: ${error.type}');
      return handler.next(error);
    },
  ));
  
  print('\n3. Testando requisição de health check...');
  
  try {
    final response = await dio.get('/api/health');
    print('   ✅ Health check bem-sucedido:');
    print('      Status: ${response.statusCode}');
    print('      Data: ${response.data}');
  } catch (e) {
    print('   ❌ Erro no health check:');
    print('      $e');
  }
  
  print('\n4. Testando requisição de notificações...');
  
  try {
    final response = await dio.get('/api/notifications');
    print('   ✅ Notificações - Status: ${response.statusCode}');
    if (response.statusCode == 200 || response.statusCode == 201) {
      print('      ✅ Sucesso! Resposta recebida');
    } else if (response.statusCode == 401) {
      print('      ❌ 401 Unauthorized - Token inválido ou expirado');
      print('      Data: ${response.data}');
    } else {
      print('      ⚠️  Status inesperado: ${response.statusCode}');
      print('      Data: ${response.data}');
    }
  } catch (e) {
    print('   ❌ Erro ao buscar notificações:');
    print('      $e');
  }
  
  print('\n📋 RESUMO DO DIAGNÓSTICO:');
  print('=' * 50);
  if (storedToken == null) {
    print('❌ PROBLEMA ENCONTRADO: Nenhum token armazenado');
    print('   Solução: Fazer login novamente para gerar novo token');
  } else {
    print('✅ Token encontrado no armazenamento');
    print('   Próximo passo: Verificar se o token é válido no backend');
  }
}

Future<String?> _getTokenSimulated() async {
  // Simular exatamente o que o código original faz
  try {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  } catch (e) {
    return null;
  }
}

int min(int a, int b) => a < b ? a : b;
int max(int a, int b) => a > b ? a : b;