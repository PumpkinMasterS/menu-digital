import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/models/robot_model.dart';
import 'package:compostos/models/user_model.dart';
import 'package:compostos/providers/robot_provider.dart';
import 'package:compostos/providers/profit_provider.dart';
import 'package:compostos/providers/user_provider.dart';
import 'package:compostos/widgets/robot_status_card.dart';
import 'package:syncfusion_flutter_charts/charts.dart';
import 'package:intl/intl.dart';

class RobotDetailScreen extends ConsumerStatefulWidget {
  final String robotId;

  const RobotDetailScreen({super.key, required this.robotId});

  @override
  ConsumerState<RobotDetailScreen> createState() => _RobotDetailScreenState();
}

class _RobotDetailScreenState extends ConsumerState<RobotDetailScreen> {
  final _dateFormat = DateFormat('dd/MM/yyyy HH:mm');
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    final robot = ref.watch(robotProvider).firstWhere(
      (robot) => robot.id == widget.robotId,
      orElse: () => RobotModel.tc760(), // Fallback
    );

    final profitState = ref.watch(profitProvider);
    final userState = ref.watch(userProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Detalhes do Robô'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: Icon(robot.isActive ? Icons.pause : Icons.play_arrow),
            onPressed: _toggleRobotStatus,
            tooltip: robot.isActive ? 'Pausar Robô' : 'Ativar Robô',
          ),
        ],
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Cabeçalho com informações principais
                  _buildRobotHeader(robot),
                  SizedBox(height: 24),

                  // Estatísticas de performance
                  _buildPerformanceStats(robot),
                  SizedBox(height: 24),

                  // Gráfico de evolução
                  _buildPerformanceChart(robot),
                  SizedBox(height: 24),

                  // Informações detalhadas
                  _buildDetailedInfo(robot),
                  SizedBox(height: 24),

                  // Ações
                  _buildActionButtons(robot, profitState, userState),
                ],
              ),
            ),
    );
  }

  Widget _buildRobotHeader(RobotModel robot) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Row(
          children: [
            // Ícone do robô baseado no nível
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: _getLevelColor(robot.level),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.memory,
                size: 32,
                color: Colors.white,
              ),
            ),
            SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    robot.name,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    robot.getLevelDescription(),
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 14,
                    ),
                  ),
                  SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(
                        robot.isActive ? Icons.check_circle : Icons.pause_circle,
                        size: 16,
                        color: robot.isActive ? Colors.green : Colors.orange,
                      ),
                      SizedBox(width: 4),
                      Text(
                        robot.isActive ? 'Ativo' : 'Pausado',
                        style: TextStyle(
                          color: robot.isActive ? Colors.green : Colors.orange,
                        ),
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

  Widget _buildPerformanceStats(RobotModel robot) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Performance',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 16),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: NeverScrollableScrollPhysics(),
              childAspectRatio: 2.5,
              children: [
                _buildStatCard(
                  'Valor Atual',
                  '€${robot.currentValue.toStringAsFixed(2)}',
                  Icons.attach_money,
                  Colors.green,
                ),
                _buildStatCard(
                  'Lucro Diário',
                  '€${robot.calculateDailyEarnings().toStringAsFixed(2)}',
                  Icons.trending_up,
                  Colors.blue,
                ),
                _buildStatCard(
                  'Investimento Inicial',
                  '€${robot.initialInvestment.toStringAsFixed(2)}',
                  Icons.account_balance_wallet,
                  Colors.purple,
                ),
                _buildStatCard(
                  'Lucro Total',
                  '€${robot.getTotalEarnings().toStringAsFixed(2)}',
                  Icons.bar_chart,
                  Colors.orange,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: EdgeInsets.all(8),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 16, color: color),
                SizedBox(width: 4),
                Text(
                  title,
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
              ],
            ),
            SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPerformanceChart(RobotModel robot) {
    // Dados simulados para o gráfico
    final chartData = [
      _ChartData('Dia 1', robot.initialInvestment),
      _ChartData('Dia 2', robot.initialInvestment * 1.04),
      _ChartData('Dia 3', robot.initialInvestment * 1.08),
      _ChartData('Dia 4', robot.initialInvestment * 1.12),
      _ChartData('Dia 5', robot.initialInvestment * 1.16),
      _ChartData('Dia 6', robot.initialInvestment * 1.20),
      _ChartData('Dia 7', robot.currentValue),
    ];

    return Card(
      elevation: 4,
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Evolução do Investimento',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 16),
            Container(
              height: 200,
              child: SfCartesianChart(
                primaryXAxis: CategoryAxis(),
                series: <CartesianSeries>[
                  LineSeries<_ChartData, String>(
                    dataSource: chartData,
                    xValueMapper: (_ChartData data, _) => data.day,
                    yValueMapper: (_ChartData data, _) => data.value,
                    markerSettings: MarkerSettings(isVisible: true),
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailedInfo(RobotModel robot) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Informações Detalhadas',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 16),
            _buildInfoRow('Data de Aquisição', _dateFormat.format(robot.purchaseDate)),
            _buildInfoRow('Última Coleta', _dateFormat.format(robot.lastCollectionDate)),
            _buildInfoRow('Dias em Operação', robot.getDaysOwned().toString()),
            _buildInfoRow('Poder de Processamento', '${robot.processingPower}/100'),
            _buildInfoRow('Consumo Energético', '${robot.energyConsumption} kWh/dia'),
            _buildInfoRow('Taxa de Manutenção', '€${robot.maintenanceFee.toStringAsFixed(2)}/dia'),
            _buildInfoRow('Score de Eficiência', robot.getEfficiencyScore().toStringAsFixed(2)),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w500,
              color: Colors.grey[600],
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(RobotModel robot, ProfitState profitState, UserModel? user) {
    return Column(
      children: [
        if (robot.isActive)
          ElevatedButton.icon(
            onPressed: _collectEarnings,
            icon: Icon(Icons.account_balance_wallet),
            label: Text('Coletar Lucros'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
              minimumSize: Size(double.infinity, 50),
            ),
          ),
        SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _toggleRobotStatus,
          icon: Icon(robot.isActive ? Icons.pause : Icons.play_arrow),
          label: Text(robot.isActive ? 'Pausar Robô' : 'Ativar Robô'),
          style: OutlinedButton.styleFrom(
            minimumSize: Size(double.infinity, 50),
          ),
        ),
      ],
    );
  }

  Color _getLevelColor(RobotLevel level) {
    switch (level) {
      case RobotLevel.S:
        return Colors.purple;
      case RobotLevel.A:
        return Colors.blue;
      case RobotLevel.B:
        return Colors.green;
    }
  }

  Future<void> _toggleRobotStatus() async {
    setState(() => _isLoading = true);
    try {
      await ref.read(robotProvider.notifier).toggleRobot(widget.robotId);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro ao alterar status do robô: $e')),
      );
    }
    setState(() => _isLoading = false);
  }

  Future<void> _collectEarnings() async {
    setState(() => _isLoading = true);
    try {
      final robot = ref.read(robotProvider).firstWhere(
        (r) => r.id == widget.robotId,
        orElse: () => RobotModel.tc760(),
      );
      
      // Coleta os lucros do robô específico
      robot.collectEarnings();
      
      // Atualiza o estado local
      await ref.read(robotProvider.notifier).updateRobot(widget.robotId, robot);
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lucros coletados com sucesso!')),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro ao coletar lucros: $e')),
      );
    }
    setState(() => _isLoading = false);
  }
}

class _ChartData {
  final String day;
  final double value;

  _ChartData(this.day, this.value);
}