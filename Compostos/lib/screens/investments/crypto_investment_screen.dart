import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:clipboard/clipboard.dart';
import 'package:compostos/core/services/api_service.dart';
import 'package:compostos/core/utils/app_colors.dart';
import 'package:compostos/widgets/custom_button.dart';
import 'package:compostos/widgets/loading_widget.dart';
import 'package:compostos/models/robot_model.dart';
import 'package:compostos/models/investment_model.dart';

class CryptoInvestmentScreen extends ConsumerStatefulWidget {
  final RobotModel robot;

  const CryptoInvestmentScreen({
    super.key,
    required this.robot,
  });

  @override
  ConsumerState<CryptoInvestmentScreen> createState() => _CryptoInvestmentScreenState();
}

class _CryptoInvestmentScreenState extends ConsumerState<CryptoInvestmentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _txHashController = TextEditingController();
  
  String selectedCurrency = 'USDT';
  Map<String, dynamic>? networkInfo;
  Map<String, dynamic>? investmentInfo;
  bool isLoading = false;
  bool isInvesting = false;
  bool hasActiveInvestment = false;

  @override
  void initState() {
    super.initState();
    _loadInvestmentInfo();
  }

  @override
  void dispose() {
    _amountController.dispose();
    _txHashController.dispose();
    super.dispose();
  }

  Future<void> _loadInvestmentInfo() async {
    setState(() {
      isLoading = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      
      // Obter informações da rede
      final networkResponse = await apiService.get('/api/crypto-transfers/network-info');
      if (networkResponse['success'] == true) {
        setState(() {
          networkInfo = networkResponse['data'];
        });
      }
      
      // Obter informações de investimento para o robô
      final investmentResponse = await apiService.get('/api/crypto-transfers/robot/${widget.robot.id}/investment-info');
      if (investmentResponse['success'] == true) {
        setState(() {
          investmentInfo = investmentResponse['data'];
          hasActiveInvestment = investmentResponse['data']['hasActiveInvestment'];
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro ao carregar informações: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        isLoading = false;
      });
    }
  }

  Future<void> _invest() async {
    if (!_formKey.currentState!.validate()) return;
    
    final amount = double.tryParse(_amountController.text) ?? 0.0;
    final txHash = _txHashController.text.trim();
    
    if (amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: 'Valor deve ser maior que zero',
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    
    if (txHash.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: 'Hash da transação é obrigatório',
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    
    setState(() {
      isInvesting = true;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      final response = await apiService.post('/api/crypto-transfers/invest', data: {
        'robotId': widget.robot.id,
        'amount': amount,
        'currency': selectedCurrency,
        'txHash': txHash,
      });
      
      if (response['success'] == true) {
        // Limpar formulário
        _amountController.clear();
        _txHashController.clear();
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response['message'] ?? 'Investimento criado com sucesso'),
            backgroundColor: Colors.green,
          ),
        );
        
        // Atualizar informações
        await _loadInvestmentInfo();
        
        // Mostrar diálogo de sucesso
        _showSuccessDialog(response['data']);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response['message'] ?? 'Erro ao criar investimento'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro ao criar investimento: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        isInvesting = false;
      });
    }
  }

  void _showSuccessDialog(Map<String, dynamic>? investmentData) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Investimento Criado'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Valor: ${investmentData?['amount']} ${investmentData?['currency']}'),
            Text('Robô: ${widget.robot.name}'),
            Text('Status: ${investmentData?['status']}'),
            const SizedBox(height: 8),
            if (investmentData?['txHash'] != null)
              GestureDetector(
                onTap: () => _openExplorer(investmentData!['txHash']),
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

  void _openExplorer(String txHash) async {
    final url = '${networkInfo!['explorerUrl']}/tx/$txHash';
    if (await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Scaffold(
        body: LoadingWidget(),
      );
    }

    if (hasActiveInvestment) {
      return _buildActiveInvestmentView();
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Investir em ${widget.robot.name}'),
        backgroundColor: AppColors.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Informações do Robô
              _buildRobotInfo(),
              const SizedBox(height: 24),
              
              // Informações da Rede
              _buildNetworkInfo(),
              const SizedBox(height: 24),
              
              // Formulário de Investimento
              _buildInvestmentForm(),
              const SizedBox(height: 24),
              
              // Instruções
              _buildInstructions(),
              const SizedBox(height: 24),
              
              // Botão de Investimento
              CustomButton(
                text: 'Investir Agora',
                onPressed: isInvesting ? null : _invest,
                isLoading: isInvesting,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActiveInvestmentView() {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.robot.name),
        backgroundColor: AppColors.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.check_circle,
                size: 64,
                color: Colors.green,
              ),
              const SizedBox(height: 16),
              const Text(
                'Você já tem um investimento ativo',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Aguarde o término do investimento atual para criar um novo.',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey[600],
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              CustomButton(
                text: 'Ver Meus Investimentos',
                onPressed: () {
                  // Navegar para a tela de investimentos
                  Navigator.of(context).pop();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRobotInfo() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    widget.robot.imageUrl,
                    width: 60,
                    height: 60,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        width: 60,
                        height: 60,
                        color: Colors.grey[300],
                        child: const Icon(Icons.robot),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.robot.name,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        widget.robot.description,
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
            const SizedBox(height: 16),
            _buildInfoRow('Retorno Diário', '${widget.robot.dailyProfit}%'),
            _buildInfoRow('Duração', '${widget.robot.duration} dias'),
            _buildInfoRow('Investimento Mínimo', '${widget.robot.minInvestment} ${selectedCurrency}'),
            _buildInfoRow('Investimento Máximo', '${widget.robot.maxInvestment} ${selectedCurrency}'),
            _buildInfoRow('Nível de Risco', widget.robot.riskLevel),
          ],
        ),
      ),
    );
  }

  Widget _buildNetworkInfo() {
    if (networkInfo == null) return const SizedBox.shrink();
    
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
                  'Informações da Rede',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildInfoRow('Rede', networkInfo!['name']),
            _buildInfoRow('Endereço', networkInfo!['companyAddress']),
            const SizedBox(height: 8),
            GestureDetector(
              onTap: () => _openExplorer(''),
              child: Text(
                'Ver no Explorador',
                style: TextStyle(
                  color: AppColors.primaryColor,
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInvestmentForm() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Dados do Investimento',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            
            // Seletor de Moeda
            if (investmentInfo != null && investmentInfo!['supportedTokens'] != null)
              DropdownButtonFormField<String>(
                value: selectedCurrency,
                decoration: const InputDecoration(
                  labelText: 'Moeda',
                  border: OutlineInputBorder(),
                ),
                items: (investmentInfo!['supportedTokens'] as List)
                    .map<DropdownMenuItem<String>>((token) {
                  return DropdownMenuItem<String>(
                    value: token['symbol'],
                    child: Row(
                      children: [
                        Text(token['symbol']),
                        const SizedBox(width: 8),
                        Text('(${token['name']})'),
                      ],
                    ),
                  );
                }).toList(),
                onChanged: (value) {
                  setState(() {
                    selectedCurrency = value!;
                  });
                },
              ),
            const SizedBox(height: 16),
            
            // Valor do Investimento
            TextFormField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                labelText: 'Valor do Investimento',
                hintText: '0.00',
                border: const OutlineInputBorder(),
                prefixIcon: const Icon(Icons.money),
                suffixText: selectedCurrency,
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Valor é obrigatório';
                }
                final amount = double.tryParse(value);
                if (amount == null || amount <= 0) {
                  return 'Valor inválido';
                }
                if (amount < widget.robot.minInvestment) {
                  return 'Valor mínimo é ${widget.robot.minInvestment}';
                }
                if (amount > widget.robot.maxInvestment) {
                  return 'Valor máximo é ${widget.robot.maxInvestment}';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            
            // Hash da Transação
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
                if (value == null || value.isEmpty) {
                  return 'Hash da transação é obrigatório';
                }
                if (!value.startsWith('0x') || value.length < 10) {
                  return 'Hash da transação inválido';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            
            // Resumo
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
                        const Text('Valor:'),
                        Text('${_amountController.text} $selectedCurrency'),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Retorno Diário:'),
                        Text('${widget.robot.dailyProfit}%'),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Retorno Total:'),
                        Text(
                          '${(double.tryParse(_amountController.text) ?? 0.0 * widget.robot.dailyProfit * widget.robot.duration / 100).toStringAsFixed(2)} $selectedCurrency',
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

  Widget _buildInstructions() {
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
                  'Como Investir',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildInstructionItem('1', 'Transfira $selectedCurrency para o endereço da empresa'),
            _buildInstructionItem('2', 'Copie o hash da transação'),
            _buildInstructionItem('3', 'Preencha o formulário com os dados'),
            _buildInstructionItem('4', 'Clique em "Investir Agora"'),
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
                      'IMPORTANTE: Use apenas a rede ${networkInfo!['name']}. Outras redes podem resultar em perda de fundos.',
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

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          Text(value),
        ],
      ),
    );
  }

  Widget _buildInstructionItem(String number, String text) {
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
}

