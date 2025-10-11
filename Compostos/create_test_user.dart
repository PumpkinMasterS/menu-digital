import 'dart:convert';
import 'package:http/http.dart' as http;

void main() async {
  print('👤 Criando usuário de teste...');
  
  final registerUrl = Uri.parse('http://localhost:5000/api/auth/register');
  final loginUrl = Uri.parse('http://localhost:5000/api/auth/login');
  
  // Dados do usuário de teste
  final testUser = {
    'name': 'Usuário Teste',
    'email': 'teste@compostos.com',
    'password': 'teste123',
    'phone': '+5511999999999'
  };
  
  try {
    print('📝 Registrando novo usuário...');
    
    final registerResponse = await http.post(
      registerUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: json.encode(testUser),
    );
    
    print('📊 Status Code do Registro: ${registerResponse.statusCode}');
    
    if (registerResponse.statusCode == 201) {
      final data = json.decode(registerResponse.body);
      print('✅ USUÁRIO CRIADO COM SUCESSO!');
      print('👤 Email: ${data['data']['user']['email']}');
      print('📛 Nome: ${data['data']['user']['name']}');
      print('🔑 Token: ${data['data']['token']?.substring(0, 50)}...');
      
      // Testar login imediatamente
      print('\n🔐 Testando login com o novo usuário...');
      
      final loginResponse = await http.post(
        loginUrl,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: json.encode({
          'email': testUser['email'],
          'password': testUser['password'],
        }),
      );
      
      print('📊 Status Code do Login: ${loginResponse.statusCode}');
      
      if (loginResponse.statusCode == 200) {
        final loginData = json.decode(loginResponse.body);
        print('✅ LOGIN BEM-SUCEDIDO!');
        print('🔑 Token de Login: ${loginData['data']['token']?.substring(0, 50)}...');
        
        // Agora testar uma rota protegida
        print('\n🔒 Testando acesso à rota protegida...');
        
        final protectedUrl = Uri.parse('http://localhost:5000/api/dashboard');
        final protectedResponse = await http.get(
          protectedUrl,
          headers: {
            'Authorization': 'Bearer ${loginData['data']['token']}',
            'Accept': 'application/json',
          },
        );
        
        print('📊 Status Code da Rota Protegida: ${protectedResponse.statusCode}');
        
        if (protectedResponse.statusCode == 200) {
          print('✅ ACESSO À ROTA PROTEGIDA CONCEDIDO!');
          print('📈 Dados: ${protectedResponse.body}');
        } else {
          print('❌ Erro na rota protegida: ${protectedResponse.body}');
        }
        
      } else {
        print('❌ Erro no login: ${loginResponse.body}');
      }
      
    } else {
      print('❌ Erro no registro: ${registerResponse.body}');
      
      // Se o usuário já existe, tentar login
      if (registerResponse.statusCode == 400) {
        final error = json.decode(registerResponse.body);
        if (error['message']?.contains('já existe') == true) {
          print('⚠️  Usuário já existe. Tentando login...');
          
          final loginResponse = await http.post(
            loginUrl,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: json.encode({
              'email': testUser['email'],
              'password': testUser['password'],
            }),
          );
          
          print('📊 Status Code do Login: ${loginResponse.statusCode}');
          
          if (loginResponse.statusCode == 200) {
            final loginData = json.decode(loginResponse.body);
            print('✅ LOGIN BEM-SUCEDIDO!');
            print('🔑 Token: ${loginData['data']['token']?.substring(0, 50)}...');
          } else {
            print('❌ Erro no login: ${loginResponse.body}');
          }
        }
      }
    }
    
  } catch (e) {
    print('💥 Exception: $e');
  }
}