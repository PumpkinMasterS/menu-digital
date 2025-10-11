import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/providers/task_provider.dart';
import 'package:compostos/providers/referral_provider.dart';
import 'package:compostos/providers/user_provider.dart';
import 'package:compostos/providers/dashboard_provider.dart';
import 'package:compostos/models/task_model.dart';
import 'package:compostos/models/user_model.dart';
import 'package:compostos/widgets/task_list_card.dart';
import 'package:compostos/widgets/referral_stats_card.dart';
import 'package:compostos/widgets/robot_status_card.dart';
import 'package:compostos/widgets/task_card.dart';
import 'package:compostos/widgets/payment_manager_card.dart';
import 'package:compostos/widgets/dashboard_charts.dart';
import 'package:compostos/widgets/animated_metric_cards.dart';
import 'package:go_router/go_router.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    // Using Future.microtask to ensure the provider is read after the initial build
    Future.microtask(() {
      ref.read(dashboardStatsProvider.notifier).loadDashboardStats();
    });
  }

  @override
  Widget build(BuildContext context) {
    final dashboardStats = ref.watch(dashboardStatsProvider);

    if (dashboardStats.isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (dashboardStats.error != null) {
      final isSessionExpired =
          dashboardStats.error!.toLowerCase().contains('sessão expirada');

      return Scaffold(
        appBar: AppBar(
          title: const Text('Dashboard Compostos'),
          backgroundColor: Colors.deepPurple,
          foregroundColor: Colors.white,
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Icon(
                  isSessionExpired ? Icons.lock_clock_outlined : Icons.error_outline,
                  size: 56,
                  color: isSessionExpired ? Colors.orange[700] : Colors.red,
                ),
                const SizedBox(height: 16),
                Text(
                  isSessionExpired ? 'Sua sessão expirou' : 'Não foi possível carregar o dashboard',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  isSessionExpired
                      ? 'Por segurança, você precisa fazer login novamente para continuar.'
                      : 'Erro: ${dashboardStats.error}',
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey[700],
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (isSessionExpired)
                      ElevatedButton.icon(
                        icon: const Icon(Icons.login),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.deepPurple,
                          foregroundColor: Colors.white,
                        ),
                        onPressed: () async {
                          // Garante estado limpo e navega para login
                          await ref.read(userProvider.notifier).logout();
                          if (!mounted) return;
                          context.go('/login');
                        },
                        label: const Text('Ir para Login'),
                      ),
                    if (isSessionExpired) const SizedBox(width: 12),
                    OutlinedButton.icon(
                      icon: const Icon(Icons.refresh),
                      onPressed: () {
                        ref.read(dashboardStatsProvider.notifier).loadDashboardStats();
                      },
                      label: const Text('Tentar novamente'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
    }

    final user = ref.watch(userProvider);
    final tasks = ref.watch(availableTasksProvider);
    final completedTasks = ref.watch(completedTasksProvider);
    final referralStats = ref.watch(referralStatsProvider);

    final balanceTooltip =
        'Saldo: €${dashboardStats.totalBalance.toStringAsFixed(2)}';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard Compostos'),
        backgroundColor: Colors.deepPurple,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.account_balance_wallet),
            onPressed: () {},
            tooltip: balanceTooltip,
          ),
          IconButton(
            icon: const Icon(Icons.bar_chart),
            onPressed: () => context.push('/reports'),
            tooltip: 'Relatórios e Extrato',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () =>
            ref.read(dashboardStatsProvider.notifier).loadDashboardStats(),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header com boas-vindas e saldo
              _buildWelcomeHeader(user, dashboardStats),
              const SizedBox(height: 20),

              // Cards de métricas animadas
              const AnimatedMetricCards(),
              const SizedBox(height: 20),

              // Gráficos do dashboard
              const DashboardCharts(),
              const SizedBox(height: 20),

              // Cards de status
              _buildStatusCards(ref, completedTasks.length, referralStats),
              const SizedBox(height: 20),

              // Seção de tarefas disponíveis
              _buildAvailableTasksSection(tasks),
              const SizedBox(height: 20),

              // Seção de tarefas concluídas
              if (completedTasks.isNotEmpty)
                _buildCompletedTasksSection(completedTasks),

              // Seção de Gerenciamento de Pagamentos
              const PaymentManagerCard(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWelcomeHeader(UserModel? user, DashboardStats dashboardStats) {
    if (user == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (dashboardStats.isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (dashboardStats.error != null) {
      return Center(child: Text('Erro: ${dashboardStats.error}'));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Olá, ${user.name}!',
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: Colors.deepPurple,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Saldo atual: €${dashboardStats.totalBalance.toStringAsFixed(2)}',
          style: const TextStyle(
            fontSize: 18,
            color: Colors.green,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Ganhos de hoje: €${dashboardStats.dailyEarnings.toStringAsFixed(2)}',
          style: const TextStyle(
            fontSize: 16,
            color: Colors.blue,
          ),
        ),
      ],
    );
  }

  Widget _buildStatusCards(
      WidgetRef ref, int completedTasksCount, ReferralStats referralStats) {
    return Row(
      children: [
        Expanded(
          child: RobotStatusCard(),
        ),
        SizedBox(width: 12),
        Expanded(
          child: Consumer(
            builder: (context, ref, child) {
              final stats = ref.watch(referralStatsProvider);
              final rewards = ref.watch(referralProvider);
              final referralNotifier = ref.read(referralProvider.notifier);
              return ReferralStatsCard();
            },
          ),
        ),
      ],
    );
  }

  Widget _buildAvailableTasksSection(List<TaskModel> tasks) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '📋 Tarefas Disponíveis',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Colors.deepPurple,
          ),
        ),
        const SizedBox(height: 12),
        if (tasks.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16.0),
              child: Text(
                'Nenhuma tarefa disponível no momento. \nVerifique novamente mais tarde!',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
            ),
          )
        else
          Column(
            children: tasks
                .map((task) => Padding(
                      padding: const EdgeInsets.only(bottom: 8.0),
                      child: TaskCard(task: task),
                    ))
                .toList(),
          ),
      ],
    );
  }

  Widget _buildCompletedTasksSection(List<TaskModel> completedTasks) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '✅ Tarefas Concluídas',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Colors.deepPurple,
          ),
        ),
        const SizedBox(height: 12),
        Column(
          children: completedTasks
              .map((task) => Padding(
                    padding: const EdgeInsets.only(bottom: 8.0),
                    child: TaskCard(task: task, isCompleted: true),
                  ))
              .toList(),
        ),
      ],
    );
  }
}