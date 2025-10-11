import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/widgets/custom_app_bar.dart';
import 'package:compostos/providers/transaction_provider.dart';
import 'package:compostos/widgets/loading_indicator.dart';
import 'package:compostos/widgets/error_message.dart';
import 'package:compostos/models/transaction_model.dart';

class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    // Carrega as transações ao iniciar
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(transactionProvider.notifier).loadTransactions();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final transactionState = ref.watch(transactionProvider);
    final transactionNotifier = ref.read(transactionProvider.notifier);

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Relatórios e Extrato',
        showBackButton: true,
      ),
      body: Column(
        children: [
          // Barra de pesquisa
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Pesquisar transações...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _searchController.clear();
                    transactionNotifier.loadTransactions();
                  },
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onChanged: (value) {
                transactionNotifier.filterTransactions(value);
              },
            ),
          ),

          // Abas
          TabBar(
            controller: _tabController,
            isScrollable: true,
            labelColor: Theme.of(context).primaryColor,
            unselectedLabelColor: Colors.grey,
            indicatorSize: TabBarIndicatorSize.tab,
            tabs: const [
              Tab(text: 'Todos'),
              Tab(text: 'Entradas'),
              Tab(text: 'Saídas'),
              Tab(text: 'Estatísticas'),
            ],
          ),

          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                // Tab: Todos
                _buildTransactionsList(transactionState.transactions),
                
                // Tab: Entradas
                _buildTransactionsList(transactionState.creditTransactions),
                
                // Tab: Saídas
                _buildTransactionsList(transactionState.debitTransactions),
                
                // Tab: Estatísticas
                _buildStatisticsTab(transactionState),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionsList(List<TransactionModel> transactions) {
    final transactionState = ref.watch(transactionProvider);

    if (transactionState.isLoading) {
      return const Center(child: LoadingIndicator());
    }

    if (transactionState.error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Erro: ${transactionState.error!}',
              style: const TextStyle(color: Colors.red, fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.read(transactionProvider.notifier).loadTransactions(),
              child: const Text('Tentar Novamente'),
            ),
          ],
        ),
      );
    }

    if (transactions.isEmpty) {
      return const Center(
        child: Text(
          'Nenhuma transação encontrada',
          style: TextStyle(fontSize: 16, color: Colors.grey),
        ),
      );
    }

    // Ordena por data (mais recente primeiro)
    final sortedTransactions = List.of(transactions)
      ..sort((a, b) => b.date.compareTo(a.date));

    return RefreshIndicator(
      onRefresh: () => ref.read(transactionProvider.notifier).loadTransactions(),
      child: ListView.builder(
        itemCount: sortedTransactions.length,
        itemBuilder: (context, index) {
          final transaction = sortedTransactions[index];
          return _buildTransactionCard(transaction);
        },
      ),
    );
  }

  Widget _buildTransactionCard(TransactionModel transaction) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ListTile(
        leading: Text(
          transaction.icon,
          style: const TextStyle(fontSize: 24),
        ),
        title: Text(
          transaction.description,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${transaction.date.day}/${transaction.date.month}/${transaction.date.year} ${transaction.date.hour.toString().padLeft(2, '0')}:${transaction.date.minute.toString().padLeft(2, '0')}',
              style: const TextStyle(fontSize: 12),
            ),
            if (transaction.referenceId != null)
              Text(
                'Ref: ${transaction.referenceId}',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '€${transaction.amount.toStringAsFixed(2)}',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: transaction.isCredit ? Colors.green : Colors.red,
              ),
            ),
            Text(
              _getStatusText(transaction.status),
              style: TextStyle(
                fontSize: 12,
                color: _getStatusColor(transaction.status),
              ),
            ),
          ],
        ),
        onTap: () {
          // TODO: Navegar para detalhes da transação
          _showTransactionDetails(transaction);
        },
      ),
    );
  }

  Widget _buildStatisticsTab(TransactionState state) {
    final stats = ref.watch(transactionStatsProvider);
    
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Cartões de resumo
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  'Saldo Total',
                  '€${state.netBalance.toStringAsFixed(2)}',
                  state.netBalance >= 0 ? Colors.green : Colors.red,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  'Total Entradas',
                  '€${state.totalCredits.toStringAsFixed(2)}',
                  Colors.green,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  'Total Saídas',
                  '€${state.totalDebits.toStringAsFixed(2)}',
                  Colors.red,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  'Transações',
                  stats['totalTransactions'].toString(),
                  Colors.blue,
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),
          
          // Gráfico de distribuição por tipo
          const Text(
            'Distribuição por Tipo',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          _buildTypeDistributionChart(state),

          const SizedBox(height: 24),
          
          // Resumo mensal
          const Text(
            'Resumo Mensal',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          _buildMonthlySummary(state),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, Color color) {
    return Card(
      color: color.withOpacity(0.1),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeDistributionChart(TransactionState state) {
    final typeCounts = <TransactionType, int>{};
    for (final transaction in state.completedTransactions) {
      typeCounts.update(transaction.type, (count) => count + 1, ifAbsent: () => 1);
    }

    if (typeCounts.isEmpty) {
      return const Text('Nenhuma transação para exibir');
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: typeCounts.entries.map((entry) {
            final percentage = (entry.value / state.completedTransactions.length * 100).toStringAsFixed(1);
            return ListTile(
              leading: Text(_getTypeIcon(entry.key)),
              title: Text(_getTypeName(entry.key)),
              trailing: Text('$entry.value ($percentage%)'),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildMonthlySummary(TransactionState state) {
    final monthlySummary = state.getMonthlySummary();
    
    if (monthlySummary.isEmpty) {
      return const Text('Nenhum dado mensal disponível');
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: monthlySummary.entries.map((entry) {
            return ListTile(
              title: Text(_formatMonthKey(entry.key)),
              trailing: Text(
                '€${entry.value.toStringAsFixed(2)}',
                style: TextStyle(
                  color: entry.value >= 0 ? Colors.green : Colors.red,
                  fontWeight: FontWeight.bold,
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  void _showTransactionDetails(TransactionModel transaction) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Detalhes da Transação'),
        content: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Descrição: ${transaction.description}'),
            Text('Valor: €${transaction.amount.toStringAsFixed(2)}'),
            Text('Data: ${transaction.date.toString()}'),
            Text('Tipo: ${_getTypeName(transaction.type)}'),
            Text('Status: ${_getStatusText(transaction.status)}'),
            if (transaction.referenceId != null)
              Text('Referência: ${transaction.referenceId}'),
            if (transaction.details != null)
              Text('Detalhes: ${transaction.details}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Fechar'),
          ),
        ],
      ),
    );
  }

  // Métodos auxiliares
  String _getStatusText(TransactionStatus status) {
    switch (status) {
      case TransactionStatus.pending: return 'Pendente';
      case TransactionStatus.completed: return 'Concluída';
      case TransactionStatus.failed: return 'Falhou';
      case TransactionStatus.cancelled: return 'Cancelada';
    }
  }

  Color _getStatusColor(TransactionStatus status) {
    switch (status) {
      case TransactionStatus.pending: return Colors.orange;
      case TransactionStatus.completed: return Colors.green;
      case TransactionStatus.failed: return Colors.red;
      case TransactionStatus.cancelled: return Colors.grey;
    }
  }

  String _getTypeName(TransactionType type) {
    switch (type) {
      case TransactionType.deposit: return 'Depósito';
      case TransactionType.withdrawal: return 'Saque';
      case TransactionType.investment: return 'Investimento';
      case TransactionType.earning: return 'Ganhos';
      case TransactionType.referral: return 'Indicação';
      case TransactionType.task: return 'Tarefa';
      case TransactionType.bonus: return 'Bônus';
      case TransactionType.maintenance: return 'Manutenção';
      case TransactionType.fee: return 'Taxa';
    }
  }

  String _getTypeIcon(TransactionType type) {
    switch (type) {
      case TransactionType.deposit: return '💰';
      case TransactionType.withdrawal: return '💸';
      case TransactionType.investment: return '🤖';
      case TransactionType.earning: return '📈';
      case TransactionType.referral: return '👥';
      case TransactionType.task: return '✅';
      case TransactionType.bonus: return '🎁';
      case TransactionType.maintenance: return '🔧';
      case TransactionType.fee: return '💳';
    }
  }

  String _formatMonthKey(String key) {
    final parts = key.split('-');
    final year = parts[0];
    final month = parts[1];
    final monthNames = [
      '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return '${monthNames[int.parse(month)]} $year';
  }
}