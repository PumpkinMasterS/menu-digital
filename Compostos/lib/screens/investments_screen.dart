import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:syncfusion_flutter_charts/charts.dart';
import 'package:compostos/providers/robot_provider.dart';
import 'package:compostos/providers/profit_provider.dart';
import 'package:compostos/widgets/robot_status_card.dart';
import 'package:compostos/widgets/profit_collection_button.dart';
import 'package:compostos/models/robot_model.dart';

class InvestmentsScreen extends ConsumerStatefulWidget {
  const InvestmentsScreen({super.key});

  @override
  ConsumerState<InvestmentsScreen> createState() => _InvestmentsScreenState();
}

class _InvestmentsScreenState extends ConsumerState<InvestmentsScreen> {
  RobotModel? _selectedRobot;

  @override
  void initState() {
    super.initState();
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
        title: const Text('Meus Investimentos'),
        backgroundColor: const Color(0xFF2563EB),
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
              // Resumo Geral
              _buildInvestmentSummary(totalInvested, totalProfit, activeRobots, robots.length),
              
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
              
              // Distribuição por Robô
              _buildRobotsDistribution(robots),
              
              const SizedBox(height: 24),
              
              // Performance por Robô
              _buildRobotsPerformance(robots),
              
              const SizedBox(height: 24),
              
              // Lista Detalhada de Robôs
              _buildRobotsList(robots),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInvestmentSummary(double invested, double profit, int active, int total) {
    final roi = invested > 0 ? (profit / invested * 100) : 0;
    
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
          const Text(
            'Visão Geral dos Investimentos',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildSummaryItem('Total Investido', '\€${invested.toStringAsFixed(2)}', Colors.blue),
              _buildSummaryItem('Lucro Total', '\€${profit.toStringAsFixed(2)}', Colors.green),
            ],
          ),
          
          const SizedBox(height: 16),
          
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildSummaryItem('Robôs Ativos', '$active/$total', Colors.orange),
              _buildSummaryItem('ROI', '${roi.toStringAsFixed(2)}%', Colors.purple),
            ],
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

  Widget _buildRobotsDistribution(List<RobotModel> robots) {
    final data = robots.map((robot) {
      return {
        'name': robot.name,
        'value': robot.initialInvestment,
        'color': _getRobotColor(robot.id),
      };
    }).toList();

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
            'Distribuição por Robô',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          
          SizedBox(
            height: 200,
            child: SfCircularChart(
              series: <CircularSeries>[
                DoughnutSeries<Map<String, dynamic>, String>(
                  dataSource: data,
                  xValueMapper: (data, _) => data['name'],
                  yValueMapper: (data, _) => data['value'],
                  pointColorMapper: (data, _) => data['color'],
                  dataLabelSettings: const DataLabelSettings(
                    isVisible: true,
                    labelPosition: ChartDataLabelPosition.outside,
                    textStyle: TextStyle(fontSize: 10),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRobotsPerformance(List<RobotModel> robots) {
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
            'Performance por Robô',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          
          Column(
            children: robots.map((robot) {
              final roi = robot.initialInvestment > 0 
                   ? (robot.getTotalEarnings() / robot.initialInvestment * 100)
                  : 0;
              
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[200]!),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            robot.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            '\€${robot.initialInvestment.toStringAsFixed(2)}',
                            style: TextStyle(
                              color: Colors.grey[600],
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '\€${robot.getTotalEarnings().toStringAsFixed(2)}',
                          style: TextStyle(
                            color: robot.getTotalEarnings() >= 0 ? Colors.green : Colors.red,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          '${roi.toStringAsFixed(2)}%',
                          style: TextStyle(
                            color: roi >= 0 ? Colors.green : Colors.red,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildRobotsList(List<RobotModel> robots) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Seus Robôs',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: robots.length,
            itemBuilder: (context, index) {
              final robot = robots[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 12.0),
                child: RobotStatusCard(),
              );
            },
          ),
        ],
      ),
    );
  }

  Color _getRobotColor(String robotId) {
    final colors = [
      Colors.blue,
      Colors.green,
      Colors.orange,
      Colors.purple,
      Colors.red,
      Colors.teal,
      Colors.pink,
    ];
    
    final index = robotId.hashCode % colors.length;
    return colors[index];
  }
}