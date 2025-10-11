import 'package:shared_preferences/shared_preferences.dart';

void main() async {
  print('🔍 Verificando token armazenado...');
  
  final prefs = await SharedPreferences.getInstance();
  final token = prefs.getString('auth_token');
  
  if (token == null) {
    print('❌ NENHUM TOKEN ENCONTRADO');
    print('Chave: auth_token');
    print('Status: vazia/nula');
    print('\n💡 SOLUÇÃO:');
    print('1. Faça logout e login novamente');
    print('2. Verifique se o login está funcionando corretamente');
    print('3. O backend pode ter expirado o token');
  } else {
    print('✅ TOKEN ENCONTRADO:');
    print('Comprimento: ${token.length} caracteres');
    print('Primeiros 30 chars: ${token.substring(0, token.length > 30 ? 30 : token.length)}');
    if (token.length > 30) {
      print('Últimos 30 chars: ${token.substring(token.length - 30)}');
    }
    print('\n📋 PRÓXIMOS PASSOS:');
    print('1. Testar se o token é válido no backend');
    print('2. Verificar expiração do token');
    print('3. Testar manualmente o endpoint de notificações');
  }
  
  // Verificar também se há dados do usuário
  final userData = prefs.getString('user_data');
  print('\n👤 Dados do usuário: ${userData != null ? "PRESENTES" : "AUSENTES"}');
}