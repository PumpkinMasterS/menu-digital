import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/core/services/api_service.dart';
import 'package:compostos/core/utils/app_colors.dart';
import 'package:compostos/core/utils/app_constants.dart';
import 'package:compostos/widgets/custom_button.dart';
import 'package:compostos/widgets/loading_widget.dart';
import 'package:compostos/models/token_model.dart';
import 'package:compostos/providers/user_provider.dart';

class WithdrawalScreen extends ConsumerStatefulWidget {
  const WithdrawalScreen({super.key});

  @override
  ConsumerState<WithdrawalScreen> createState() => _WithdrawalScreenState();
}

class _WithdrawalScreenState extends ConsumerState<WithdrawalScreen> {
  final _formKey = GlobalKey<FormState>();
  final _addressController = TextEditingController();
  final _amountController = TextEditingController();
  
  TokenModel? selectedToken;
  List<TokenModel> tokens = [];
  bool isLoading = false;
  bool isProcessing = false;
  double userBalance = 0.0;
  double withdrawalFee = 0.0;

  @override
  void initState() {
    super.initState();
    _loadUserData();
    _loadTokens();
  }

  @override
  void dispose() {
    _addressController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _loadUserData() async {
    final userState = ref.read(userProvider);
    if (userState.user != null) {
      setState(() {
        userBalance = userState.user!.balance;
      });
    }
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
        final fees = response['data']['fees'] as Map<String, dynamic>;
        
        setState(() {
          tokens = tokensData.map((token) {
            final tokenModel = TokenModel.fromJson(token);
            // Adiciona a taxa de saque ao modelo
            final fee = fees[tokenModel.symbol] ?? 0.0;
            return TokenModel(
              symbol: tokenModel.symbol,
              address: tokenModel.address,
              decimals: tokenModel.decimals,
              withdrawalFee: fee.toDouble(),
            );
          }).toList();
          
          if (tokens.isNotEmpty) {
            selectedToken = tokens.first; // Seleciona USDT por padrão
            withdrawalFee = selectedToken!.withdrawalFee;
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

  Future<void> _processWithdrawal() async {
    if (!_formKey.currentState!.validate()) return;
    
    final amount = double.tryParse(_amountController.text) ?? 0.0;
    final address = _addressController.text.trim();
    
    if (selectedToken == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Selecione uma moeda'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    
    final totalAmount = amount + withdrawalFee;
    
    if (totalAmount > userBalance) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Saldo insuficiente. Saldo: $userBalance ${selectedToken!.symbol}, Necessário: $totalAmount ${selectedToken!.symbol}'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    
    setState(() {
      isProcessing = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final response = await apiService.post(
        '/api/bep20/withdrawal',
        data: {
          'amount': amount,
          'toAddress': address,
          'currency': selectedToken!.symbol,
        },
      );
      
      if (response['success'] == true) {
        // Limpa o formulário
        _addressController.clear();
        _amountController.clear();
        
        // Atualiza o saldo do usuário
        ref.read(userProvider.notifier).updateBalance(userBalance - totalAmount);
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response['message'] ?? 'Saque solicitado com sucesso'),
            backgroundColor: Colors.green,
          ),
        );
        
        // Mostra diálogo de sucesso
        _showSuccessDialog(response['data']);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response['message'] ?? 'Erro ao processar saque'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro ao processar saque: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        isProcessing = false;
      });
    }
  }

  void _showSuccessDialog(Map<String, dynamic>? withdrawalData) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Saque Solicitado'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Valor: ${withdrawalData?['amount']} ${withdrawalData?['currency']}'),
            Text('Taxa: ${withdrawalData?['fee']} ${withdrawalData?['currency']}'),
            Text('Total: ${withdrawalData?['totalAmount']} ${withdrawalData?['currency']}'),
            const SizedBox(height: 8),
            Text('Status: ${withdrawalData?['status']}'),
            const SizedBox(height: 8),
            if (withdrawalData?['explorerUrl'] != null)
              GestureDetector(
                onTap: () {
                  // Aqui você poderia abrir o URL no navegador
                },
                child: Text(
                  'Ver na Blockchain',
                  style: TextStyle(
                    color: AppColors.primaryColor,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Retirar Fundos'),
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
                    // Saldo disponível
                    _buildBalanceCard(),
                    const SizedBox(height: 24),
                    
                    // Seletor de Token
                    _buildTokenSelector(),
                    const SizedBox(height: 24),
                    
                    // Formulário de saque
                    _buildWithdrawalForm(),
                    const SizedBox(height: 24),
                    
                    // Informações importantes
                    _buildImportantInfo(),
                    const SizedBox(height: 24),
                    
                    // Botão de saque
                    CustomButton(
                      text: 'Solicitar Saque',
                      onPressed: isProcessing ? null : _processWithdrawal,
                      isLoading: isProcessing,
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildBalanceCard() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            Icon(
              Icons.account_balance_wallet,
              color: AppColors.primaryColor,
              size: 32,
            ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Saldo Disponível',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey,
                  ),
                ),
                Text(
                  '$userBalance ${selectedToken?.symbol ?? ''}',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
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
                        const SizedBox(width: 8),
                        Text(
                          '(Taxa: ${token.withdrawalFee})',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (TokenModel? token) {
                  setState(() {
                    selectedToken = token;
                    withdrawalFee = token?.withdrawalFee ?? 0.0;
                  });
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildWithdrawalForm() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Informações de Saque',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            
            // Endereço da carteira
            TextFormField(
              controller: _addressController,
              decoration: const InputDecoration(
                labelText: 'Endereço da Carteira',
                hintText: '0x...',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.account_balance_wallet_outlined),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Endereço é obrigatório';
                }
                if (!value.startsWith('0x') || value.length != 42) {
                  return 'Endereço BEP20 inválido';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            
            // Valor do saque
            TextFormField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                labelText: 'Valor do Saque',
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
                if (amount + withdrawalFee > userBalance) {
                  return 'Saldo insuficiente';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            
            // Resumo do saque
            if (_amountController.text.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Valor do saque:'),
                        Text('${_amountController.text} ${selectedToken?.symbol ?? ''}'),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Taxa de saque:'),
                        Text('$withdrawalFee ${selectedToken?.symbol ?? ''}'),
                      ],
                    ),
                    const Divider(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Total:',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        Text(
                          '${(double.tryParse(_amountController.text) ?? 0.0) + withdrawalFee} ${selectedToken?.symbol ?? ''}',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildImportantInfo() {
    return Card(
      elevation: 4,
      color: Colors.amber[50],
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.info, color: Colors.amber[700]),
                const SizedBox(width: 8),
                const Text(
                  'Informações Importantes',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildInfoItem('Apenas endereços BEP20 (BSC) são suportados.'),
            _buildInfoItem('Taxa de saque: $withdrawalFee ${selectedToken?.symbol ?? ''}'),
            _buildInfoItem('O saque será processado em até 24 horas.'),
            _buildInfoItem('Você receberá uma notificação quando for processado.'),
            const SizedBox(height: 12),
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
                      'Atenção: Envios para outras redes podem resultar em perda permanente dos fundos.',
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

  Widget _buildInfoItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('• '),
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

