import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:compostos/providers/robot_provider.dart';
import 'package:compostos/providers/cashback_provider.dart';
import 'package:compostos/models/robot_model.dart';
import 'package:compostos/widgets/cashback_calculation_widget.dart';

class RobotStatusCard extends ConsumerWidget {
  const RobotStatusCard({super.key});

  Color _getLevelColor(RobotLevel level) {
    switch (level) {
      case RobotLevel.S:
        return Colors.deepPurple;
      case RobotLevel.A:
        return Colors.blue;
      case RobotLevel.B:
        return Colors.green;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final robots = ref.watch(robotProvider);
    final totalRobots = robots.length;
    final activeRobots = robots.where((r) => r.isActive).length;
    final totalDailyEarnings = robots.fold(0.0, (sum, r) => sum + r.dailyEarnings);

    return Card(
      elevation: 3,
      color: Colors.orange[50],
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.smart_toy, color: Colors.orange, size: 20),
                SizedBox(width: 8),
                Text(
                  'Robôs TC',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.orange,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildStatRow('Total Robôs', totalRobots.toString(), Colors.black),
            const SizedBox(height: 8),
            _buildStatRow('Ativos', '$activeRobots/$totalRobots', Colors.green),
            const SizedBox(height: 8),
            _buildStatRow('Ganhos Diários', '€${totalDailyEarnings.toStringAsFixed(2)}', Colors.green),
            const SizedBox(height: 12),
            if (robots.isNotEmpty)
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Níveis:',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: robots.map((robot) {
                      return GestureDetector(
                        onTap: () => context.push('/robot-detail/${robot.id}'),
                        child: Chip(
                          label: Text(
                            '${robot.name} (${robot.level.name})',
                            style: const TextStyle(color: Colors.white, fontSize: 10),
                          ),
                          backgroundColor: _getLevelColor(robot.level),
                          materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                      );
                    }).toList(),
                  ),
                ],
              )
            else
              const Text(
                'Nenhum robô adquirido',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
            const SizedBox(height: 16),
            _buildPurchaseButton(context, ref),
          ],
        ),
      ),
    );
  }

  Widget _buildPurchaseButton(BuildContext context, WidgetRef ref) {
    return ElevatedButton.icon(
      onPressed: () => _showPurchaseDialog(context, ref),
      icon: const Icon(Icons.add_shopping_cart, size: 16),
      label: const Text('Comprar Robô'),
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.orange,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }

  void _showPurchaseDialog(BuildContext context, WidgetRef ref) {
    String? selectedRobotType;
    double? selectedRobotPrice;
    
    final Map<String, double> robotPrices = {
      'tc760': 720,
      'tc880': 1200,
      'tc990': 1800,
    };

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) {
          return AlertDialog(
            title: const Text('Comprar Robô'),
            content: SizedBox(
              width: double.maxFinite,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Escolha o modelo de robô que deseja adquirir:'),
                  const SizedBox(height: 16),
                  
                  // Botões de seleção de robô
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: robotPrices.entries.map((entry) {
                      final isSelected = selectedRobotType == entry.key;
                      return ChoiceChip(
                        label: Text('\${entry.key.toUpperCase()} - €\${entry.value.toStringAsFixed(0)}'),
                        selected: isSelected,
                        onSelected: (selected) {
                          setState(() {
                            selectedRobotType = selected ? entry.key : null;
                            selectedRobotPrice = selected ? entry.value : null;
                          });
                        },
                      );
                    }).toList(),
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Exibição do cashback
                  if (selectedRobotType != null && selectedRobotPrice != null)
                    CashbackCalculationWidget(
                      investmentAmount: selectedRobotPrice!,
                      robotType: selectedRobotType!,
                      onCashbackCalculated: (cashback) {
                        // Callback opcional para usar o valor do cashback
                      },
                    )
                  else
                    const Text(
                      'Selecione um robô para ver o cashback disponível',
                      style: TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancelar'),
              ),
              if (selectedRobotType != null)
                ElevatedButton(
                  onPressed: () => _purchaseRobot(context, ref, selectedRobotType!),
                  child: const Text('Confirmar Compra'),
                ),
            ],
          );
        },
      ),
    );
  }

  Future<void> _purchaseRobot(BuildContext context, WidgetRef ref, String robotType) async {
    try {
      final robotNotifier = ref.read(robotProvider.notifier);
      
      // Cria o robô baseado no tipo
      RobotModel newRobot;
      switch (robotType) {
        case 'tc990':
          newRobot = RobotModel.tc990();
          break;
        case 'tc880':
          newRobot = RobotModel.tc880();
          break;
        case 'tc760':
          newRobot = RobotModel.tc760();
          break;
        default:
          throw Exception('Tipo de robô inválido');
      }

      // Adiciona o robô
      await robotNotifier.addRobot(newRobot.id, newRobot.initialInvestment);
      
      // Fecha o diálogo
      if (context.mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Robô ${newRobot.name} adquirido com sucesso!')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao comprar robô: $e')),
        );
      }
    }
  }

  Widget _buildStatRow(String label, String value, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 14, color: Colors.black87),
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
}