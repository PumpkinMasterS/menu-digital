import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/providers/report_provider.dart';

class FinancialReportWidget extends ConsumerWidget {
  const FinancialReportWidget({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportState = ref.watch(reportNotifierProvider);
    final financialReport = reportState.financialReport;

    if (reportState.isLoading && financialReport == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (reportState.error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Erro: ${reportState.error!}',
              style: const TextStyle(color: Colors.red, fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.read(reportNotifierProvider.notifier).loadFinancialReport(),
              child: const Text('Tentar Novamente'),
            ),
          ],
        ),
      );
    }

    if (financialReport == null) {
      return const Center(
        child: Text(
          'Nenhum dado financeiro disponível',
          style: TextStyle(fontSize: 16, color: Colors.grey),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Resumo Financeiro
          _buildSummaryCard(financialReport),
          const SizedBox(height: 20),

          // Detalhes de Depósitos e Saques
          _buildTransactionDetails(financialReport),
          const SizedBox(height: 20),

          // Comissões de Referência
          _buildReferralCommissions(financialReport),
          const SizedBox(height: 20),

          // Botão de Exportar
          ElevatedButton.icon(
            onPressed: () => ref.read(reportNotifierProvider.notifier).exportFinancialReport(),
            icon: const Icon(Icons.download),
            label: const Text('Exportar Relatório CSV'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(Map<String, dynamic> report) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            const Text(
              'Resumo Financeiro',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatCard(
                  'Total Depositado',
                  '€${(report['totalDeposits'] ?? 0).toStringAsFixed(2)}',
                  Colors.blue,
                  Icons.account_balance_wallet,
                ),
                _buildStatCard(
                  'Total Sacado',
                  '€${(report['totalWithdrawals'] ?? 0).toStringAsFixed(2)}',
                  Colors.orange,
                  Icons.money_off,
                ),
                _buildStatCard(
                  'Lucro Total',
                  '€${(report['totalProfit'] ?? 0).toStringAsFixed(2)}',
                  Colors.green,
                  Icons.trending_up,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String title, String value, Color color, IconData icon) {
    return Column(
      children: [
        Icon(icon, size: 32, color: color),
        const SizedBox(height: 8),
        Text(
          title,
          style: const TextStyle(fontSize: 12, color: Colors.grey),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildTransactionDetails(Map<String, dynamic> report) {
    return Card(
      elevation: 3,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Detalhes de Transações',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildDetailItem(
                  'Depósitos Pendentes',
                  '€${(report['pendingDeposits'] ?? 0).toStringAsFixed(2)}',
                  Colors.blue,
                ),
                _buildDetailItem(
                  'Saques Pendentes',
                  '€${(report['pendingWithdrawals'] ?? 0).toStringAsFixed(2)}',
                  Colors.orange,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildDetailItem(
                  'Depósitos Concluídos',
                  '€${(report['completedDeposits'] ?? 0).toStringAsFixed(2)}',
                  Colors.green,
                ),
                _buildDetailItem(
                  'Saques Concluídos',
                  '€${(report['completedWithdrawals'] ?? 0).toStringAsFixed(2)}',
                  Colors.red,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailItem(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Colors.grey),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildReferralCommissions(Map<String, dynamic> report) {
    return Card(
      elevation: 3,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Comissões de Referência',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildCommissionItem(
                  'Total Pago',
                  '€${(report['totalReferralCommissions'] ?? 0).toStringAsFixed(2)}',
                  Colors.green,
                ),
                _buildCommissionItem(
                  'Pendente',
                  '€${(report['pendingReferralCommissions'] ?? 0).toStringAsFixed(2)}',
                  Colors.orange,
                ),
                _buildCommissionItem(
                  'Usuários com Referral',
                  '${report['usersWithReferrals'] ?? 0}',
                  Colors.blue,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCommissionItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Colors.grey),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }
}