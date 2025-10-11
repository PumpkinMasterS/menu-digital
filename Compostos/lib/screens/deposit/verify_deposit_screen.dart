import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:compostos/core/services/api_service.dart';
import 'package:compostos/core/utils/app_colors.dart';
import 'package:compostos/widgets/custom_button.dart';
import 'package:compostos/widgets/loading_widget.dart';
import 'package:compostos/models/token_model.dart';

class VerifyDepositScreen extends ConsumerStatefulWidget {
  const VerifyDepositScreen({super.key});

  @override
  ConsumerState<VerifyDepositScreen> createState() => _VerifyDepositScreenState();
}

class _VerifyDepositScreenState extends ConsumerState<VerifyDepositScreen> {
  final _formKey = GlobalKey<FormState>();
  final _txHashController = TextEditingController();
  final _amountController = TextEditingController();
  
  TokenModel? selectedToken;
  List<TokenModel> tokens = [];
  bool isLoading = false;
  bool isVerifying = false;
  Map<String, dynamic>? verificationResult;

  @override
  void initState() {
    super.initState();
    _loadTokens();
  }

  @override
  void dispose() {
    _txHashController.dispose();
    _amountController.dispose();
    super.dispose();
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
        
        setState(() {
          tokens = tokensData.map((token) => TokenModel.fromJson(token)).toList();
          
          if (tokens.isNotEmpty) {
            selectedToken = tokens.first; // Seleciona USDT por padrão
          }
        });
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

  Future<void> _verifyDeposit() async {
    if (!_formKey.currentState!.validate()) return;
    
    final txHash = _txHashController.text.trim();
    final amount = double.tryParse(_amountController.text) ?? 0.0;
    
    if (selectedToken == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Selecione uma moeda'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    
    setState(() {
      isVerifying = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final response = await apiService.post(
        '/api/bep20/deposit/verify',
        data: {
          'txHash': txHash,
          'amount': amount,
          'currency': selectedToken!.symbol,
        },
      );
      
      setState(() {
        verificationResult = response;
      });
      
      if (response['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response['message'] ?? 'Depósito verificado com sucesso'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response['message'] ?? 'Erro ao verificar depósito'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro ao verificar depósito: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        isVerifying = false;
      });
    }
  }

  void _openBscScan(String txHash) async {
    final url = 'https://bscscan.com/tx/$txHash';
    if (await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Verificar Depósito'),
        backgroundColor: AppColors.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: isLoading
          ? const LoadingWidget()
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Informações
                    _buildInfoCard(),
                    const SizedBox(height: 24),
                    
                    // Seletor de Token
                    _buildTokenSelector(),
                    const SizedBox(height: 24),
                    
                    // Formulário de verificação
                    _buildVerificationForm(),
                    const SizedBox(height: 24),
                    
                    // Botão de verificação
                    CustomButton(
                      text: 'Verificar Depósito',
                      onPressed: isVerifying ? null : _verifyDeposit,
                      isLoading: isVerifying,
                    ),
                    const SizedBox(height: 24),
                    
                    // Resultado da verificação
                    if (verificationResult != null)
                      _buildVerificationResult(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildInfoCard() {
    return Card(
      elevation: 4,
      color: Colors.blue[50],
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.info, color: Colors.blue[700]),
                const SizedBox(width: 8),
                const Text(
                  'Como Verificar seu Depósito',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildInfoItem('1', 'Após fazer o depósito, copie o hash da transação.'),
            _buildInfoItem('2', 'Cole o hash no campo abaixo.'),
            _buildInfoItem('3', 'Informe o valor exato depositado.'),
            _buildInfoItem('4', 'Selecione a moeda utilizada.'),
            _buildInfoItem('5', 'Clique em "Verificar Depósito".'),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.amber[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.amber[200]!),
              ),
              child: Row(
                children: [
                  Icon(Icons.lightbulb, color: Colors.amber[700]),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Dica: O hash da transação pode ser encontrado no histórico da sua carteira ou no explorador da blockchain.',
                      style: TextStyle(
                        color: Colors.amber[700],
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

  Widget _buildInfoItem(String number, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4.0),
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
            if (tokens.isNotEmpty)
              DropdownButtonFormField<TokenModel>(
                value: selectedToken,
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                items: tokens.map((token) {
                  return DropdownMenuItem<TokenModel>(
                    value: token,
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: AppColors.primaryColor,
                          radius: 12,
                          child: Text(
                            token.symbol.substring(0, 2),
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 10,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(token.symbol),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (TokenModel? token) {
                  setState(() {
                    selectedToken = token;
                  });
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildVerificationForm() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Dados da Transação',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            
            // Hash da transação
            TextFormField(
              controller: _txHashController,
              decoration: InputDecoration(
                labelText: 'Hash da Transação',
                hintText: '0x...',
                border: const OutlineInputBorder(),
                prefixIcon: const Icon(Icons.fingerprint),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.paste),
                  onPressed: () async {
                    final clipboardData = await Clipboard.getData(Clipboard.kTextPlain);
                    if (clipboardData?.text != null) {
                      _txHashController.text = clipboardData!.text!;
                    }
                  },
                  tooltip: 'Colar da área de transferência',
                ),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Hash da transação é obrigatório';
                }
                if (!value.startsWith('0x') || value.length < 10) {
                  return 'Hash da transação inválido';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            
            // Valor do depósito
            TextFormField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                labelText: 'Valor Depositado',
                hintText: '0.00',
                border: const OutlineInputBorder(),
                prefixIcon: const Icon(Icons.money_outlined),
                suffixText: selectedToken?.symbol ?? '',
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Valor é obrigatório';
                }
                final amount = double.tryParse(value);
                if (amount == null || amount <= 0) {
                  return 'Valor inválido';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            
            // Botão para verificar no BscScan
            if (_txHashController.text.isNotEmpty)
              OutlinedButton.icon(
                onPressed: () => _openBscScan(_txHashController.text.trim()),
                icon: const Icon(Icons.open_in_browser),
                label: const Text('Ver no BscScan'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primaryColor,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildVerificationResult() {
    final success = verificationResult!['success'] as bool;
    final data = verificationResult!['data'] as Map<String, dynamic>?;
    
    return Card(
      elevation: 4,
      color: success ? Colors.green[50] : Colors.red[50],
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  success ? Icons.check_circle : Icons.error,
                  color: success ? Colors.green[700] : Colors.red[700],
                ),
                const SizedBox(width: 8),
                Text(
                  success ? 'Depósito Verificado' : 'Falha na Verificação',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: success ? Colors.green[700] : Colors.red[700],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            
            // Mensagem
            Text(
              verificationResult!['message'] ?? '',
              style: const TextStyle(fontSize: 14),
            ),
            
            // Detalhes da transação (se sucesso)
            if (success && data != null) ...[
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 8),
              
              _buildDetailRow('ID da Transação', data['transactionId']?.toString() ?? ''),
              _buildDetailRow('Valor', '${data['amount']?.toString() ?? ''} ${data['currency'] ?? ''}'),
              _buildDetailRow('Status', data['status']?.toString() ?? ''),
              
              if (data['explorerUrl'] != null) ...[
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: () => _openBscScan(data['txHash']?.toString() ?? ''),
                  icon: const Icon(Icons.open_in_browser),
                  label: const Text('Ver na Blockchain'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryColor,
                    foregroundColor: Colors.white,
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }
}

