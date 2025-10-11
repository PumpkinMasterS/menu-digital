import 'dart:convert';
import 'package:http/http.dart' as http;

void main() async {
  print('🔧 Testando configuração do Dio/HTTP...');
  
  // Testar conexão básica com o backend
  try {
    final response = await http.get(Uri.parse('http://localhost:5000/api/health'));
    print('✅ Health Check: ${response.statusCode} - ${response.body}');
  } catch (e) {
    print('❌ Erro no Health Check: $e');
  }
  
  // Testar se há problemas de CORS
  try {
    final response = await http.get(Uri.parse('http://localhost:5000/api/notifications'),
      headers: {'Origin': 'http://localhost:3000'});
    print('✅ Teste CORS: ${response.statusCode}');
    print('Headers: ${response.headers}');
  } catch (e) {
    print('❌ Erro no teste CORS: $e');
  }
  
  print('\n📋 PRÓXIMOS PASSOS:');
  print('1. Abrir o navegador em http://localhost:3000');
  print('2. Fazer login novamente para renovar o token');
  print('3. Verificar console do navegador para erros CORS');
  print('4. Testar manualmente http://localhost:5000/api/notifications no navegador');
}