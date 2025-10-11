import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:clipboard/clipboard.dart';
import 'package:compostos/core/services/api_service.dart';
import 'package:compostos/core/utils/app_colors.dart';
import 'package:compostos/core/utils/app_constants.dart';
import 'package:compostos/widgets/custom_button.dart';
import 'package:compostos/widgets/loading_widget.dart';
import 'package:compostos/models/token_model.dart';

class DepositScreen extends ConsumerStatefulWidget {
  const DepositScreen({super.key});

  @override
  ConsumerState<DepositScreen> createState() => _DepositScreenState();
}

class _DepositScreenState extends ConsumerState<DepositScreen> {
  TokenModel? selectedToken;
  String? depositAddress;
  String? memo;
  bool isLoading = false;
  bool addressGenerated = false;

  @override
  void initState() {
    super.initState();
    _loadTokens();
  }

  Future<void> _loadTokens() async {
    setState(() {
      isLoading = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final response = await apiService.get('/api/bep20/tokens');
      
      if (response['success'] == true) {
        final tokensData = response['data']['tokens'] as List;
        final tokens = tokensData.map((token) => TokenModel.fromJson(token)).toList();
        
        if (tokens.isNotEmpty) {
          setState(() {
            selectedToken = tokens.first; // Seleciona USDT por padrão
          });
          await _generateDepositAddress();
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro ao carregar tokens: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }

  Future<void> _generateDepositAddress() async {
    if (selectedToken == null) return;

    setState(() {
      isLoading = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final response = await apiService.post(
        '/api/bep20/deposit/address',
        data: {'currency': selectedToken!.symbol},
      );
      
      if (response['success'] == true) {
        final depositData = response['data'];
        setState(() {
          depositAddress = depositData['address'];
          memo = depositData['memo'];
          addressGenerated = true;
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro ao gerar endereço: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }

  void _copyAddressToClipboard() {
    if (depositAddress != null) {
      FlutterClipboard.copy(depositAddress!).then((_) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Endereço copiado para a área de transferência'),
            backgroundColor: Colors.green,
          ),
        );
      });
    }
  }

  void _copyMemoToClipboard() {
    if (memo != null) {
      FlutterClipboard.copy(memo!).then((_) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Memo copiado para a área de transferência'),
            backgroundColor: Colors.green,
          ),
        );
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Adicionar Fundos'),
        backgroundColor: AppColors.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: isLoading
          ? const LoadingWidget()
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Seletor de Token
                  _buildTokenSelector(),
                  const SizedBox(height: 24),
                  
                  // Informações de Depósito
                  if (addressGenerated) ...[
                    _buildDepositInfo(),
                    const SizedBox(height: 24),
                    
                    // QR Code
                    _buildQRCode(),
                    const SizedBox(height: 24),
                    
                    // Instruções
                    _buildInstructions(),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildTokenSelector() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Selecione a Moeda',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            if (selectedToken != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: AppColors.primaryColor,
                      child: Text(
                        selectedToken!.symbol.substring(0, 2),
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            selectedToken!.symbol,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            'Taxa de saque: ${selectedToken!.withdrawalFee} ${selectedToken!.symbol}',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildDepositInfo() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Endereço de Depósito',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      depositAddress ?? '',
                      style: const TextStyle(
                        fontSize: 14,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.copy),
                    onPressed: _copyAddressToClipboard,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            
            // Memo (se existir)
            if (memo != null && memo!.isNotEmpty) ...[
              const Text(
                'Memo (Obrigatório)',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.amber[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        memo!,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.copy),
                      onPressed: _copyMemoToClipboard,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'IMPORTANTE: Inclua o memo acima para que seu depósito seja identificado corretamente.',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.red[700],
                ),
              ),
            ],
            
            const SizedBox(height: 16),
            Text(
              'Rede: BEP20 (Binance Smart Chain)',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQRCode() {
    if (depositAddress == null) return const SizedBox.shrink();
    
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            const Text(
              'QR Code para Depósito',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
              child: QrImageView(
                data: depositAddress!,
                version: QrVersions.auto,
                size: 200.0,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInstructions() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Instruções de Depósito',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            _buildInstructionItem(
              '1',
              'Envie apenas ${selectedToken?.symbol} para este endereço.',
            ),
            _buildInstructionItem(
              '2',
              'Use a rede BEP20 (Binance Smart Chain). Outras redes podem resultar em perda de fundos.',
            ),
            if (memo != null && memo!.isNotEmpty)
              _buildInstructionItem(
                '3',
                'Inclua o memo obrigatório para identificação do depósito.',
              ),
            _buildInstructionItem(
              memo != null && memo!.isNotEmpty ? '4' : '3',
              'O depósito será creditado após confirmação na rede (5-30 minutos).',
            ),
            _buildInstructionItem(
              memo != null && memo!.isNotEmpty ? '5' : '4',
              'O valor mínimo de depósito é de 10 ${selectedToken?.symbol}.',
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red[200]!),
              ),
              child: Row(
                children: [
                  Icon(Icons.warning, color: Colors.red[700]),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Atenção: Envios para outras redes ou sem o memo podem resultar em perda permanente dos fundos.',
                      style: TextStyle(
                        color: Colors.red[700],
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInstructionItem(String number, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 24,
            height: 24,
            decoration: BoxDecoration(
              color: AppColors.primaryColor,
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                number,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 14),
            ),
          ),
        ],
      ),
    );
  }
}

