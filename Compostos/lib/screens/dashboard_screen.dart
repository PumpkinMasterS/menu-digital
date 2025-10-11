import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:syncfusion_flutter_charts/charts.dart';
import 'package:compostos/providers/robot_provider.dart';
import 'package:compostos/providers/profit_provider.dart';
import 'package:compostos/widgets/robot_status_card.dart';
import 'package:compostos/widgets/profit_collection_button.dart';
import 'package:compostos/models/robot_model.dart';
import 'package:compostos/models/daily_profit_model.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    // Carregar dados do dashboard
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(robotProvider.notifier).loadRobots();
      ref.read(profitProvider.notifier).updatePendingProfit();
    });
  }

  @override
  Widget build(BuildContext context) {
    final robots = ref.watch(robotProvider);
    final profitState = ref.watch(profitProvider);

    final totalInvested = robots.fold<double>(0, (sum, robot) => sum + robot.initialInvestment);
    final totalProfit = robots.fold<double>(0, (sum, robot) => sum + robot.getTotalEarnings());
    final activeRobots = robots.where((robot) => robot.isActive).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        elevation: 4,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await ref.read(robotProvider.notifier).loadRobots();
          await ref.read(profitProvider.notifier).updatePendingProfit();
        },
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Resumo Financeiro
              _buildFinancialSummary(totalInvested, totalProfit, activeRobots),
              
              const SizedBox(height: 24),
              
              // Botão de Coleta de Lucros
              if (profitState.pendingProfit > 0)
                ProfitCollectionButton(
                  pendingProfit: profitState.pendingProfit,
                  onCollectionComplete: () {
                    ref.read(profitProvider.notifier).updatePendingProfit();
                  },
                ),
              
              const SizedBox(height: 24),
              
              // Gráfico de Performance
              _buildPerformanceChart(robots),
              
              const SizedBox(height: 24),
              
              // Lista de Robôs
              _buildRobotsList(robots),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFinancialSummary(double invested, double profit, int activeCount) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildSummaryItem('Total Investido', '€${invested.toStringAsFixed(2)}', Colors.blue),
              _buildSummaryItem('Lucro Total', '€${profit.toStringAsFixed(2)}', Colors.green),
              _buildSummaryItem('Robôs Ativos', activeCount.toString(), Colors.orange),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            height: 1,
            color: Colors.grey[200],
          ),
          const SizedBox(height: 16),
          Text(
            'ROI: ${(invested > 0 ? (profit / invested * 100).toStringAsFixed(2) : "0.00")}%',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.purple,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryItem(String title, String value, Color color) {
    return Column(
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
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

  Widget _buildPerformanceChart(List<RobotModel> robots) {
    final dailyData = robots.expand((robot) => robot.dailyProfits).toList();
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Performance dos Robôs',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 200,
            child: SfCartesianChart(
              primaryXAxis: CategoryAxis(),
              series: <CartesianSeries>[
                LineSeries<Map<String, dynamic>, String>(
                  dataSource: _prepareChartData(dailyData),
                  xValueMapper: (data, _) => data['date'],
                  yValueMapper: (data, _) => data['profit'],
                  markerSettings: const MarkerSettings(isVisible: true),
                  color: Colors.blue,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Map<String, dynamic>> _prepareChartData(List<DailyProfit> dailyProfits) {
    final Map<String, double> dailyTotals = {};
    
    for (final profit in dailyProfits) {
      final date = profit.date.substring(0, 10); // YYYY-MM-DD
      dailyTotals.update(date, (value) => value + profit.amount, ifAbsent: () => profit.amount);
    }
    
    final sortedEntries = dailyTotals.entries.toList()
      ..sort((a, b) => a.key.compareTo(b.key));
    
    return sortedEntries
        .map((entry) => {'date': entry.key, 'profit': entry.value})
        .take(7)
        .toList();
  }

  Widget _buildRobotsList(List<RobotModel> robots) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Meus Robôs',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 16),
        if (robots.isEmpty)
          const Center(
            child: Text(
              'Nenhum robô encontrado',
              style: TextStyle(color: Colors.grey),
            ),
          )
        else
          Expanded(
            child: ListView.builder(
              itemCount: robotList.length,
              itemBuilder: (context, index) {
                final robot = robotList[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12.0),
                  child: RobotStatusCard(),
                );
              },
            ),
          ),
      ],
    );
  }
}