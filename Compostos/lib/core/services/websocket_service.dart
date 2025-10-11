import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/status.dart' as status;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/core/services/auth_service.dart';
import 'package:compostos/providers/dashboard_provider.dart';

class WebSocketService {
  WebSocketChannel? _channel;
  final AuthService _authService;
  final Ref _ref;
  
  WebSocketService({required AuthService authService, required Ref ref}) 
    : _authService = authService, _ref = ref;

  // Conectar ao servidor WebSocket
  Future<void> connect() async {
    try {
      // Obter token JWT
      final token = await _authService.getToken();
      if (token == null) {
        throw Exception('Usuário não autenticado');
      }

      // Construir URL do WebSocket
      const baseUrl = 'ws://localhost:5000'; // Ajustar conforme necessário
      final wsUrl = '$baseUrl/ws?token=$token';

      // Estabelecer conexão
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));
      
      print('🔌 Conectado ao WebSocket Server');
      
      // Configurar listener para mensagens
      _channel!.stream.listen(
        _handleMessage,
        onError: _handleError,
        onDone: _handleDone,
      );

    } catch (e) {
      print('❌ Erro ao conectar ao WebSocket: $e');
      rethrow;
    }
  }

  // Desconectar do servidor WebSocket
  void disconnect() {
    _channel?.sink.close(status.goingAway);
    _channel = null;
    print('🔌 Desconectado do WebSocket Server');
  }

  // Enviar mensagem
  void sendMessage(Map<String, dynamic> message) {
    if (_channel != null && _channel!.closeCode == null) {
      _channel!.sink.add(json.encode(message));
    }
  }

  // Enviar ping (manter conexão ativa)
  void sendPing() {
    sendMessage({'type': 'ping'});
  }

  // Inscrever-se em um canal
  void subscribe(String channel) {
    sendMessage({
      'type': 'subscribe',
      'channel': channel
    });
  }

  // Handler para mensagens recebidas
  void _handleMessage(dynamic data) {
    try {
      final message = json.decode(data);
      final type = message['type'];
      
      switch (type) {
        case 'connection_established':
          print('✅ Conexão WebSocket estabelecida');
          break;
          
        case 'dashboard_update':
          _handleDashboardUpdate(message['data']);
          break;
          
        case 'balance_update':
          _handleBalanceUpdate(message['balance']);
          break;
          
        case 'investment_update':
          _handleInvestmentUpdate(message['investment']);
          break;
          
        case 'task_update':
          _handleTaskUpdate(message['stats']);
          break;
          
        case 'pong':
          // Resposta do ping - conexão ativa
          break;
          
        case 'subscription_confirmed':
          print('✅ Inscrito no canal: ${message['channel']}');
          break;
          
        default:
          print('📨 Mensagem WebSocket recebida: $message');
      }
    } catch (e) {
      print('❌ Erro ao processar mensagem WebSocket: $e');
    }
  }

  // Handler para atualização do dashboard
  void _handleDashboardUpdate(Map<String, dynamic> data) {
    print('📊 Dashboard atualizado em tempo real: $data');
    // Notificar providers ou atualizar estado
    _notifyDashboardUpdate(data);
  }

  // Handler para atualização de saldo
  void _handleBalanceUpdate(double newBalance) {
    print('💰 Saldo atualizado: $newBalance');
    // Notificar providers ou atualizar estado
    _notifyBalanceUpdate(newBalance);
  }

  // Handler para atualização de investimento
  void _handleInvestmentUpdate(Map<String, dynamic> investment) {
    print('📈 Investimento atualizado: $investment');
    // Notificar providers ou atualizar estado
    _notifyInvestmentUpdate(investment);
  }

  // Handler para atualização de tarefas
  void _handleTaskUpdate(Map<String, dynamic> stats) {
    print('✅ Tarefas atualizadas: $stats');
    // Notificar providers ou atualizar estado
    _notifyTaskUpdate(stats);
  }

  // Handler para erros
  void _handleError(dynamic error) {
    print('❌ Erro na conexão WebSocket: $error');
    // Tentar reconectar após um delay
    Future.delayed(const Duration(seconds: 5), () => connect());
  }

  // Handler para conexão fechada
  void _handleDone() {
    print('🔌 Conexão WebSocket fechada');
    // Tentar reconectar após um delay
    Future.delayed(const Duration(seconds: 5), () => connect());
  }

  // Métodos para notificar providers
  void _notifyDashboardUpdate(Map<String, dynamic> data) {
    _ref.read(dashboardStatsProvider.notifier).updateFromWebSocket(data);
  }

  void _notifyBalanceUpdate(double newBalance) {
    _ref.read(dashboardStatsProvider.notifier).updateBalanceFromWebSocket(newBalance);
  }

  void _notifyInvestmentUpdate(Map<String, dynamic> investment) {
    // Implementar se necessário para investimentos específicos
  }

  void _notifyTaskUpdate(Map<String, dynamic> stats) {
    _ref.read(dashboardStatsProvider.notifier).updateTasksFromWebSocket(stats);
  }

  // Verificar status da conexão
  bool get isConnected => _channel != null && _channel!.closeCode == null;
}

// Provider para o WebSocketService
final webSocketServiceProvider = Provider<WebSocketService>((ref) {
  final authService = ref.watch(authServiceProvider);
  return WebSocketService(authService: authService, ref: ref);
});