import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:compostos/core/services/api_service.dart';
import 'package:compostos/core/utils/app_colors.dart';
import 'package:compostos/widgets/loading_widget.dart';
import 'package:compostos/models/transaction_model.dart';

class TransactionsScreen extends ConsumerStatefulWidget {
  const TransactionsScreen({super.key});

  @override
  ConsumerState<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends ConsumerState<TransactionsScreen> {
  List<TransactionModel> transactions = [];
  bool isLoading = false;
  bool isLoadingMore = false;
  int currentPage = 1;
  int totalPages = 1;
  String selectedType = 'all';
  String selectedStatus = 'all';

  @override
  void initState() {
    super.initState();
    _loadTransactions();
  }

  Future<void> _loadTransactions({bool refresh = false}) async {
    if (refresh) {
      setState(() {
        currentPage = 1;
        transactions.clear();
      });
    }

    setState(() {
      isLoading = refresh ? true : isLoadingMore;
    });

    try {
      final apiService = ref.read(apiServiceProvider);
      
      // Construir query parameters
      Map<String, String> queryParams = {
        'page': currentPage.toString(),
        'limit': '20',
      };
      
      if (selectedType != 'all') {
        queryParams['type'] = selectedType;
      }
      
      if (selectedStatus != 'all') {
        queryParams['status'] = selectedStatus;
      }
      
      final response = await apiService.get(
        '/api/bep20/transactions',
        queryParameters: queryParams,
      );
      
      if (response['success'] == true) {
        final data = response['data'];
        final transactionsData = data['transactions'] as List;
        final pagination = data['pagination'];
        
        final newTransactions = transactionsData
            .map((tx) => TransactionModel.fromJson(tx))
            .toList();
        
        setState(() {
          if (refresh) {
            transactions = newTransactions;
          } else {
            transactions.addAll(newTransactions);
          }
          totalPages = pagination['pages'];
          currentPage = pagination['page'];
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro ao carregar transações: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() {
        isLoading = false;
        isLoadingMore = false;
      });
    }
  }

  Future<void> _loadMoreTransactions() async {
    if (currentPage < totalPages && !isLoadingMore) {
      setState(() {
        currentPage++;
      });
      await _loadTransactions();
    }
  }

  Future<void> _refreshTransactions() async {
    await _loadTransactions(refresh: true);
  }

  void _openTransactionDetails(TransactionModel transaction) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => TransactionDetailScreen(transaction: transaction),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Histórico de Transações'),
        backgroundColor: AppColors.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshTransactions,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filtros
          _buildFilters(),
          const Divider(height: 1),
          
          // Lista de transações
          Expanded(
            child: isLoading && transactions.isEmpty
                ? const LoadingWidget()
                : transactions.isEmpty
                    ? _buildEmptyState()
                    : NotificationListener<ScrollNotification>(
                        onNotification: (scrollInfo) {
                          if (scrollInfo.metrics.pixels == scrollInfo.metrics.maxScrollExtent) {
                            _loadMoreTransactions();
                          }
                          return false;
                        },
                        child: RefreshIndicator(
                          onRefresh: _refreshTransactions,
                          child: ListView.builder(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            itemCount: transactions.length + (isLoadingMore ? 1 : 0),
                            itemBuilder: (context, index) {
                              if (index == transactions.length) {
                                return const Center(
                                  child: Padding(
                                    padding: EdgeInsets.all(16.0),
                                    child: CircularProgressIndicator(),
                                  ),
                                );
                              }
                              
                              final transaction = transactions[index];
                              return _buildTransactionItem(transaction);
                            },
                          ),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilters() {
    return Container(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          // Filtro de tipo
          Row(
            children: [
              const Text(
                'Tipo: ',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('all', 'Todos'),
                      _buildFilterChip('deposit', 'Depósito'),
                      _buildFilterChip('withdrawal', 'Saque'),
                      _buildFilterChip('investment', 'Investimento'),
                      _buildFilterChip('profit', 'Lucro'),
                      _buildFilterChip('commission', 'Comissão'),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          
          // Filtro de status
          Row(
            children: [
              const Text(
                'Status: ',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildStatusFilterChip('all', 'Todos'),
                      _buildStatusFilterChip('pending', 'Pendente'),
                      _buildStatusFilterChip('processing', 'Processando'),
                      _buildStatusFilterChip('completed', 'Concluído'),
                      _buildStatusFilterChip('failed', 'Falhou'),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String value, String label) {
    final isSelected = selectedType == value;
    
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            selectedType = value;
          });
          _loadTransactions(refresh: true);
        },
        backgroundColor: Colors.grey[200],
        selectedColor: AppColors.primaryColor.withOpacity(0.2),
        checkmarkColor: AppColors.primaryColor,
      ),
    );
  }

  Widget _buildStatusFilterChip(String value, String label) {
    final isSelected = selectedStatus == value;
    
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            selectedStatus = value;
          });
          _loadTransactions(refresh: true);
        },
        backgroundColor: Colors.grey[200],
        selectedColor: AppColors.primaryColor.withOpacity(0.2),
        checkmarkColor: AppColors.primaryColor,
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.receipt_long,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            'Nenhuma transação encontrada',
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Suas transações aparecerão aqui',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionItem(TransactionModel transaction) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: InkWell(
        onTap: () => _openTransactionDetails(transaction),
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              // Ícone
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: _getTransactionColor(transaction.type).withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  _getTransactionIcon(transaction.type),
                  color: _getTransactionColor(transaction.type),
                ),
              ),
              const SizedBox(width: 16),
              
              // Informações
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _getTransactionTitle(transaction),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      DateFormat('dd/MM/yyyy HH:mm').format(transaction.createdAt),
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ),
              
              // Valor e Status
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${transaction.amount > 0 ? '+' : ''}${transaction.amount.toStringAsFixed(2)} ${transaction.currency}',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                      color: transaction.amount > 0 ? Colors.green : Colors.red,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: _getStatusColor(transaction.status).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _getStatusText(transaction.status),
                      style: TextStyle(
                        fontSize: 10,
                        color: _getStatusColor(transaction.status),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getTransactionColor(String type) {
    switch (type) {
      case 'deposit':
        return Colors.green;
      case 'withdrawal':
        return Colors.red;
      case 'investment':
        return Colors.blue;
      case 'profit':
        return Colors.purple;
      case 'commission':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  IconData _getTransactionIcon(String type) {
    switch (type) {
      case 'deposit':
        return Icons.arrow_downward;
      case 'withdrawal':
        return Icons.arrow_upward;
      case 'investment':
        return Icons.trending_up;
      case 'profit':
        return Icons.attach_money;
      case 'commission':
        return Icons.people;
      default:
        return Icons.receipt;
    }
  }

  String _getTransactionTitle(TransactionModel transaction) {
    switch (transaction.type) {
      case 'deposit':
        return 'Depósito';
      case 'withdrawal':
        return 'Saque';
      case 'investment':
        return 'Investimento em Robô';
      case 'profit':
        return 'Lucro de Robô';
      case 'commission':
        return 'Comissão de Referral';
      default:
        return transaction.description;
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return Colors.orange;
      case 'processing':
        return Colors.blue;
      case 'completed':
        return Colors.green;
      case 'failed':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'processing':
        return 'Processando';
      case 'completed':
        return 'Concluído';
      case 'failed':
        return 'Falhou';
      default:
        return status;
    }
  }
}

class TransactionDetailScreen extends StatelessWidget {
  final TransactionModel transaction;

  const TransactionDetailScreen({
    super.key,
    required this.transaction,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_getTransactionTitle(transaction)),
        backgroundColor: AppColors.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Card principal
            Card(
              elevation: 4,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 50,
                          height: 50,
                          decoration: BoxDecoration(
                            color: _getTransactionColor(transaction.type).withOpacity(0.2),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            _getTransactionIcon(transaction.type),
                            color: _getTransactionColor(transaction.type),
                            size: 30,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _getTransactionTitle(transaction),
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                DateFormat('dd/MM/yyyy HH:mm:ss').format(transaction.createdAt),
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
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Valor:',
                          style: TextStyle(fontSize: 16),
                        ),
                        Text(
                          '${transaction.amount > 0 ? '+' : ''}${transaction.amount.toStringAsFixed(2)} ${transaction.currency}',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: transaction.amount > 0 ? Colors.green : Colors.red,
                          ),
                        ),
                      ],
                    ),
                    if (transaction.fee > 0) ...[
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Taxa:',
                            style: TextStyle(fontSize: 16),
                          ),
                          Text(
                            '${transaction.fee.toStringAsFixed(2)} ${transaction.currency}',
                            style: const TextStyle(fontSize: 16),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 8),
                    const Divider(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Total:',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          '${transaction.totalAmount > 0 ? '+' : ''}${transaction.totalAmount.toStringAsFixed(2)} ${transaction.currency}',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: transaction.totalAmount > 0 ? Colors.green : Colors.red,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            
            // Status
            _buildInfoCard(
              'Status',
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _getStatusColor(transaction.status).withOpacity(0.2),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  _getStatusText(transaction.status),
                  style: TextStyle(
                    color: _getStatusColor(transaction.status),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            
            // Detalhes da transação
            _buildInfoCard(
              'Descrição',
              Text(transaction.description),
            ),
            const SizedBox(height: 16),
            
            // Informações da blockchain (se aplicável)
            if (transaction.txHash != null) ...[
              _buildInfoCard(
                'Hash da Transação',
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SelectableText(
                      transaction.txHash!,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 8),
                    if (transaction.metadata?['explorerUrl'] != null)
                      ElevatedButton.icon(
                        onPressed: () => _launchUrl(transaction.metadata!['explorerUrl']),
                        icon: const Icon(Icons.open_in_browser),
                        label: const Text('Ver na Blockchain'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primaryColor,
                          foregroundColor: Colors.white,
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],
            
            // Endereços (se aplicável)
            if (transaction.fromAddress != null || transaction.toAddress != null) ...[
              _buildInfoCard(
                'Endereços',
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (transaction.fromAddress != null) ...[
                      const Text(
                        'De:',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      SelectableText(
                        transaction.fromAddress!,
                        style: const TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 12,
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                    if (transaction.toAddress != null) ...[
                      const Text(
                        'Para:',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      SelectableText(
                        transaction.toAddress!,
                        style: const TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],
            
            // Informações da rede
            if (transaction.network != null && transaction.network != 'INTERNAL') ...[
              _buildInfoCard(
                'Rede',
                Text(transaction.network!),
              ),
              const SizedBox(height: 16),
            ],
            
            // Data de conclusão (se aplicável)
            if (transaction.completedAt != null) ...[
              _buildInfoCard(
                'Concluído em',
                Text(DateFormat('dd/MM/yyyy HH:mm:ss').format(transaction.completedAt!)),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard(String title, Widget content) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            content,
          ],
        ),
      ),
    );
  }

  Future<void> _launchUrl(String? url) async {
    if (url != null && await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url));
    }
  }

  Color _getTransactionColor(String type) {
    switch (type) {
      case 'deposit':
        return Colors.green;
      case 'withdrawal':
        return Colors.red;
      case 'investment':
        return Colors.blue;
      case 'profit':
        return Colors.purple;
      case 'commission':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  IconData _getTransactionIcon(String type) {
    switch (type) {
      case 'deposit':
        return Icons.arrow_downward;
      case 'withdrawal':
        return Icons.arrow_upward;
      case 'investment':
        return Icons.trending_up;
      case 'profit':
        return Icons.attach_money;
      case 'commission':
        return Icons.people;
      default:
        return Icons.receipt;
    }
  }

  String _getTransactionTitle(TransactionModel transaction) {
    switch (transaction.type) {
      case 'deposit':
        return 'Depósito';
      case 'withdrawal':
        return 'Saque';
      case 'investment':
        return 'Investimento em Robô';
      case 'profit':
        return 'Lucro de Robô';
      case 'commission':
        return 'Comissão de Referral';
      default:
        return transaction.description;
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return Colors.orange;
      case 'processing':
        return Colors.blue;
      case 'completed':
        return Colors.green;
      case 'failed':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'processing':
        return 'Processando';
      case 'completed':
        return 'Concluído';
      case 'failed':
        return 'Falhou';
      default:
        return status;
    }
  }
}

