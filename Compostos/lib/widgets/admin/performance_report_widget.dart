import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/providers/report_provider.dart';
import 'package:compostos/widgets/admin/stats_card.dart';

class PerformanceReportWidget extends ConsumerWidget {
  const PerformanceReportWidget({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportState = ref.watch(reportNotifierProvider);
    final performanceReport = reportState.performanceReport;

    if (reportState.isLoading && performanceReport == null) {
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
              onPressed: () => ref.read(reportNotifierProvider.notifier).loadPerformanceReport(),
              child: const Text('Tentar Novamente'),
            ),
          ],
        ),
      );
    }

    if (performanceReport == null) {
      return const Center(
        child: Text(
          'Nenhum dado de performance disponível',
          style: TextStyle(fontSize: 16, color: Colors.grey),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Período do relatório
          Text(
            'Período: ${_formatPeriod(performanceReport.period)}',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 24),

          // Estatísticas de Usuários
          const Text(
            'Estatísticas de Usuários',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: [
              StatsCard(
                title: 'Total de Usuários',
                value: '${performanceReport.userStats['totalUsers'] ?? 0}',
                icon: Icons.people,
                color: Colors.blue,
              ),
              StatsCard(
                title: 'Usuários Ativos',
                value: '${performanceReport.userStats['activeUsers'] ?? 0}',
                icon: Icons.person,
                color: Colors.green,
              ),
              StatsCard(
                title: 'Total Investido',
                value: '€${(performanceReport.userStats['totalInvestment'] ?? 0).toStringAsFixed(2)}',
                icon: Icons.euro,
                color: Colors.orange,
              ),
              StatsCard(
                title: 'Lucro Total',
                value: '€${(performanceReport.userStats['totalProfit'] ?? 0).toStringAsFixed(2)}',
                icon: Icons.trending_up,
                color: Colors.purple,
              ),
            ],
          ),
          const SizedBox(height: 32),

          // Estatísticas de Investimentos
          const Text(
            'Estatísticas de Investimentos',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: [
              StatsCard(
                title: 'Total de Investimentos',
                value: '${performanceReport.investmentStats['totalInvestments'] ?? 0}',
                icon: Icons.business_center,
                color: Colors.indigo,
              ),
              StatsCard(
                title: 'Valor Total',
                value: '€${(performanceReport.investmentStats['totalAmount'] ?? 0).toStringAsFixed(2)}',
                icon: Icons.account_balance_wallet,
                color: Colors.teal,
              ),
              StatsCard(
                title: 'Investimentos Ativos',
                value: '${performanceReport.investmentStats['activeInvestments'] ?? 0}',
                icon: Icons.play_arrow,
                color: Colors.green,
              ),
              StatsCard(
                title: 'Investimentos Concluídos',
                value: '${performanceReport.investmentStats['completedInvestments'] ?? 0}',
                icon: Icons.check_circle,
                color: Colors.blueGrey,
              ),
            ],
          ),
          const SizedBox(height: 32),

          // Estatísticas de Transações
          const Text(
            'Estatísticas de Transações',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: [
              StatsCard(
                title: 'Total de Transações',
                value: '${performanceReport.transactionStats['totalTransactions'] ?? 0}',
                icon: Icons.swap_horiz,
                color: Colors.deepPurple,
              ),
              StatsCard(
                title: 'Depósitos',
                value: '${performanceReport.transactionStats['totalDeposits'] ?? 0}',
                icon: Icons.arrow_downward,
                color: Colors.green,
              ),
              StatsCard(
                title: 'Saques',
                value: '${performanceReport.transactionStats['totalWithdrawals'] ?? 0}',
                icon: Icons.arrow_upward,
                color: Colors.red,
              ),
              StatsCard(
                title: 'Lucros',
                value: '${performanceReport.transactionStats['totalProfitTransactions'] ?? 0}',
                icon: Icons.attach_money,
                color: Colors.amber,
              ),
              StatsCard(
                title: 'Valor Total',
                value: '€${(performanceReport.transactionStats['totalAmount'] ?? 0).toStringAsFixed(2)}',
                icon: Icons.account_balance,
                color: Colors.blue,
              ),
            ],
          ),
          const SizedBox(height: 32),

          // Estatísticas de Tarefas
          const Text(
            'Estatísticas de Tarefas',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: [
              StatsCard(
                title: 'Total de Tarefas',
                value: '${performanceReport.taskStats['totalTasks'] ?? 0}',
                icon: Icons.assignment,
                color: Colors.brown,
              ),
              StatsCard(
                title: 'Tarefas Concluídas',
                value: '${performanceReport.taskStats['completedTasks'] ?? 0}',
                icon: Icons.check_circle_outline,
                color: Colors.green,
              ),
              StatsCard(
                title: 'Tarefas Pendentes',
                value: '${performanceReport.taskStats['pendingTasks'] ?? 0}',
                icon: Icons.access_time,
                color: Colors.orange,
              ),
              StatsCard(
                title: 'Recompensa Total',
                value: '€${(performanceReport.taskStats['totalReward'] ?? 0).toStringAsFixed(2)}',
                icon: Icons.redeem,
                color: Colors.purple,
              ),
            ],
          ),
          const SizedBox(height: 32),

          // Estatísticas de Indicações
          const Text(
            'Estatísticas de Indicações',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: [
              StatsCard(
                title: 'Total de Indicações',
                value: '${performanceReport.referralStats['totalReferrals'] ?? 0}',
                icon: Icons.group_add,
                color: Colors.cyan,
              ),
              StatsCard(
                title: 'Indicações Ativas',
                value: '${performanceReport.referralStats['activeReferrals'] ?? 0}',
                icon: Icons.group,
                color: Colors.green,
              ),
              StatsCard(
                title: 'Indicações Concluídas',
                value: '${performanceReport.referralStats['completedReferrals'] ?? 0}',
                icon: Icons.group_work,
                color: Colors.blue,
              ),
              StatsCard(
                title: 'Comissão Total',
                value: '€${(performanceReport.referralStats['totalCommission'] ?? 0).toStringAsFixed(2)}',
                icon: Icons.money,
                color: Colors.green,
              ),
            ],
          ),
          const SizedBox(height: 32),

          // Crescimento ao longo do tempo
          if (performanceReport.growthStats.isNotEmpty)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Crescimento ao Longo do Tempo',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                ...performanceReport.growthStats.map((stat) {
                  return ListTile(
                    title: Text(stat['_id'] ?? ''),
                    trailing: Text('${stat['newUsers'] ?? 0} novos usuários'),
                    subtitle: Text('${stat['activeUsers'] ?? 0} ativos'),
                  );
                }).toList(),
              ],
            ),
        ],
      ),
    );
  }

  String _formatPeriod(Map<String, dynamic> period) {
    final start = period['startDate'] != null ? DateTime.parse(period['startDate']) : null;
    final end = period['endDate'] != null ? DateTime.parse(period['endDate']) : null;
    
    if (start != null && end != null) {
      return '${start.day}/${start.month}/${start.year} - ${end.day}/${end.month}/${end.year}';
    }
    return 'Período não especificado';
  }
}