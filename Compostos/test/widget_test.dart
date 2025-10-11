import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:compostos/main.dart';

void main() {
  setUpAll(() async {
    // Garante que SharedPreferences funciona em testes de unidade
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('Shows login screen when not authenticated', (WidgetTester tester) async {
    // Constrói o app com ProviderScope e aguarda redirects do GoRouter
    await tester.pumpWidget(const ProviderScope(child: MyApp()));
    await tester.pumpAndSettle();

    // Deve exibir a tela de Login com botões "Entrar" e "Criar Conta"
    expect(find.text('Entrar'), findsOneWidget);
    expect(find.text('Criar Conta'), findsOneWidget);
  });
}
