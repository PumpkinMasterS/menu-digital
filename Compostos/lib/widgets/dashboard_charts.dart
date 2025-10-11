import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:syncfusion_flutter_charts/charts.dart';
import 'package:intl/intl.dart';
import 'package:compostos/providers/dashboard_provider.dart';
import 'package:compostos/core/services/dashboard_service.dart';

class DashboardCharts extends ConsumerStatefulWidget {
  const DashboardCharts({super.key});

  @override
  ConsumerState<DashboardCharts> createState() => _DashboardChartsState();
}

class _DashboardChartsState extends ConsumerState<DashboardCharts> {
  Map<String, dynamic>? _historicalData;
  bool _isLoading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadHistoricalData();
  }

  Future<void> _loadHistoricalData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final dashboardService = ref.read(dashboardServiceProvider);
      final data = await dashboardService.getHistoricalData(period: '7d');
      setState(() {
        _historicalData = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final dashboardStats = ref.watch(dashboardStatsProvider);

    if (dashboardStats.isLoading || _isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (dashboardStats.error != null || _error != null) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.grey[100],
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          _error ?? 'Gráficos indisponíveis no momento',
          style: const TextStyle(color: Colors.grey),
          textAlign: TextAlign.center,
        ),
      );
    }

    return Column(
      children: [
        // Gráfico de evolução de saldo
        _buildBalanceChart(dashboardStats, _historicalData),
        const SizedBox(height: 20),
        
        // Gráfico de distribuição de investimentos
        _buildInvestmentDistributionChart(dashboardStats, _historicalData),
        const SizedBox(height: 20),
        
        // Gráfico de ganhos diários
        _buildDailyEarningsChart(dashboardStats, _historicalData),
      ],
    );
  }

  Widget _buildBalanceChart(DashboardStats stats, Map<String, dynamic>? historicalData) {
    // Usar dados reais da API se disponíveis, caso contrário usar dados mock como fallback
    final List<ChartData> balanceData;
    
    if (historicalData != null && historicalData['balanceHistory'] is List) {
      final List<dynamic> history = historicalData['balanceHistory'];
      balanceData = history.map((item) {
        final date = item['date'] as String;
        final day = _getDayOfWeekFromDate(date);
        final value = (item['balance'] as num).toDouble();
        return ChartData(day, value);
      }).toList();
    } else {
      // Fallback para dados mock se API não estiver disponível
      balanceData = [
        ChartData('Seg', stats.totalBalance * 0.7),
        ChartData('Ter', stats.totalBalance * 0.8),
        ChartData('Qua', stats.totalBalance * 0.9),
        ChartData('Qui', stats.totalBalance * 0.95),
        ChartData('Sex', stats.totalBalance),
      ];
    }

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '📈 Evolução do Saldo',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.deepPurple,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 200,
              child: SfCartesianChart(
                primaryXAxis: CategoryAxis(),
                primaryYAxis: NumericAxis(
                  numberFormat: NumberFormat.currency(symbol: '€', decimalDigits: 2),
                  labelStyle: const TextStyle(fontSize: 12),
                ),
                series: <CartesianSeries>[
                  LineSeries<ChartData, String>(
                    dataSource: balanceData,
                    xValueMapper: (ChartData data, _) => data.day,
                    yValueMapper: (ChartData data, _) => data.value,
                    name: 'Saldo',
                    color: Colors.deepPurple,
                    markerSettings: const MarkerSettings(isVisible: true),
                    dataLabelSettings: const DataLabelSettings(
                      isVisible: true,
                      labelAlignment: ChartDataLabelAlignment.top,
                      textStyle: TextStyle(fontSize: 10),
                    ),
                  ),
                ],
                tooltipBehavior: TooltipBehavior(
                  enable: true,
                  format: 'Saldo: €{point.y}'
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInvestmentDistributionChart(DashboardStats stats, Map<String, dynamic>? historicalData) {
    // Usar dados reais da API se disponíveis, caso contrário usar dados mock como fallback
    final List<PieData> distributionData;
    
    if (historicalData != null && historicalData['investmentDistribution'] is Map) {
      final Map<String, dynamic> distribution = historicalData['investmentDistribution'];
      distributionData = [
        PieData('Robôs', (distribution['robots'] ?? 0).toDouble(), Colors.deepPurple),
        PieData('Tarefas', (distribution['tasks'] ?? 0).toDouble(), Colors.blue),
        PieData('Indicações', (distribution['referrals'] ?? 0).toDouble(), Colors.green),
      ];
    } else {
      // Fallback para dados mock se API não estiver disponível
      distributionData = [
        PieData('Robôs', stats.totalEarnings * 0.6, Colors.deepPurple),
        PieData('Tarefas', stats.totalEarnings * 0.3, Colors.blue),
        PieData('Indicações', stats.referralEarnings, Colors.green),
      ];
    }

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '🥧 Distribuição de Investimentos',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.deepPurple,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 200,
              child: SfCircularChart(
                legend: Legend(
                  isVisible: true,
                  position: LegendPosition.bottom,
                  overflowMode: LegendItemOverflowMode.wrap,
                ),
                series: <CircularSeries>[
                  PieSeries<PieData, String>(
                    dataSource: distributionData,
                    xValueMapper: (PieData data, _) => data.category,
                    yValueMapper: (PieData data, _) => data.value,
                    pointColorMapper: (PieData data, _) => data.color,
                    dataLabelSettings: const DataLabelSettings(
                      isVisible: true,
                      labelPosition: ChartDataLabelPosition.outside,
                      textStyle: TextStyle(fontSize: 10),
                      connectorLineSettings: ConnectorLineSettings(
                        type: ConnectorType.line,
                        length: '10%',
                      ),
                    ),
                  ),
                ],
                tooltipBehavior: TooltipBehavior(
                  enable: true,
                  format: '{point.x}: €{point.y}'
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDailyEarningsChart(DashboardStats stats, Map<String, dynamic>? historicalData) {
    // Usar dados reais da API se disponíveis, caso contrário usar dados mock como fallback
    final List<ChartData> earningsData;
    
    if (historicalData != null && historicalData['dailyEarnings'] is List) {
      final List<dynamic> earnings = historicalData['dailyEarnings'];
      earningsData = earnings.map((item) {
        final date = item['date'] as String;
        final day = _getDayOfWeekFromDate(date);
        final value = (item['earnings'] as num).toDouble();
        return ChartData(day, value);
      }).toList();
    } else {
      // Fallback para dados mock se API não estiver disponível
      earningsData = [
        ChartData('Seg', stats.dailyEarnings * 0.8),
        ChartData('Ter', stats.dailyEarnings * 1.1),
        ChartData('Qua', stats.dailyEarnings * 0.9),
        ChartData('Qui', stats.dailyEarnings * 1.2),
        ChartData('Sex', stats.dailyEarnings),
      ];
    }

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '💰 Ganhos Diários',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.deepPurple,
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 200,
              child: SfCartesianChart(
                primaryXAxis: CategoryAxis(),
                primaryYAxis: NumericAxis(
                  numberFormat: NumberFormat.currency(symbol: '€', decimalDigits: 2),
                  labelStyle: const TextStyle(fontSize: 12),
                ),
                series: <CartesianSeries>[
                  ColumnSeries<ChartData, String>(
                    dataSource: earningsData,
                    xValueMapper: (ChartData data, _) => data.day,
                    yValueMapper: (ChartData data, _) => data.value,
                    name: 'Ganhos',
                    color: Colors.green,
                    borderRadius: BorderRadius.circular(4),
                    dataLabelSettings: const DataLabelSettings(
                      isVisible: true,
                      labelAlignment: ChartDataLabelAlignment.top,
                      textStyle: TextStyle(fontSize: 10),
                    ),
                  ),
                ],
                tooltipBehavior: TooltipBehavior(
                  enable: true,
                  format: 'Ganhos: €{point.y}'
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// Classes de dados para os gráficos
class ChartData {
  final String day;
  final double value;

  ChartData(this.day, this.value);
}

class PieData {
  final String category;
  final double value;
  final Color color;

  PieData(this.category, this.value, this.color);
}

// Método auxiliar para extrair dia da semana da data
String _getDayOfWeekFromDate(String dateString) {
  try {
    final date = DateTime.parse(dateString);
    final dayOfWeek = date.weekday;
    switch (dayOfWeek) {
      case 1: return 'Seg';
      case 2: return 'Ter';
      case 3: return 'Qua';
      case 4: return 'Qui';
      case 5: return 'Sex';
      case 6: return 'Sáb';
      case 7: return 'Dom';
      default: return dateString.substring(5, 10); // Fallback: MM-DD
    }
  } catch (e) {
    return dateString.length > 5 ? dateString.substring(5, 10) : dateString;
  }
}