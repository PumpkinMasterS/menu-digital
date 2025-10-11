import 'dart:convert';
import 'package:http/http.dart' as http;

void main() async {
  print('🔐 Testando login no backend...');
  
  final url = Uri.parse('http://localhost:5000/api/auth/login');
  
  // Teste com credenciais padrão ou de desenvolvimento
  final testCredentials = [
    {'email': 'admin@example.com', 'password': 'admin123'},
    {'email': 'test@example.com', 'password': 'test123'},
    {'email': 'user@example.com', 'password': 'user123'},
    {'email': 'demo@example.com', 'password': 'demo123'},
  ];
  
  for (var creds in testCredentials) {
    print('\n🔍 Tentando login com: ${creds['email']}');
    
    try {
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: json.encode({
          'email': creds['email'],
          'password': creds['password'],
        }),
      );
      
      print('📊 Status Code: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        print('✅ LOGIN BEM-SUCEDIDO!');
        print('🔑 Token: ${data['data']['token']?.substring(0, 50)}...');
        print('👤 Usuário: ${data['data']['user']['email']}');
        print('📛 Nome: ${data['data']['user']['name']}');
        return;
      } else {
        final error = json.decode(response.body);
        print('❌ Erro: ${error['message']}');
      }
    } catch (e) {
      print('💥 Exception: $e');
    }
    
    // Pequena pausa entre tentativas
    await Future.delayed(Duration(milliseconds: 500));
  }
  
  print('\n🚨 Nenhum login funcionou. Verifique:');
  print('1. Backend está rodando em http://localhost:5000');
  print('2. Usuários de teste existem no banco de dados');
  print('3. MongoDB está conectado');
  print('4. Variáveis de ambiente estão configuradas');
}