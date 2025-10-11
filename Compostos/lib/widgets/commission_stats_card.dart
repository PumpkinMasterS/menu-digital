import 'package:flutter/material.dart';

class CommissionStatsCard extends StatelessWidget {
  final Map<String, dynamic> stats;

  const CommissionStatsCard({super.key, required this.stats});

  @override
  Widget build(BuildContext context) {
    final totalPending = stats['totalPending'] ?? 0.0;
    final totalApproved = stats['totalApproved'] ?? 0.0;
    final totalPaid = stats['totalPaid'] ?? 0.0;
    final totalCancelled = stats['totalCancelled'] ?? 0.0;
    final totalAmount = stats['totalAmount'] ?? 0.0;

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Estatísticas de Comissões',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            _buildStatRow('Total Geral', totalAmount, Colors.blue),
            const Divider(),
            _buildStatRow('Pendentes', totalPending, Colors.orange),
            _buildStatRow('Aprovadas', totalApproved, Colors.green),
            _buildStatRow('Pagas', totalPaid, Colors.purple),
            _buildStatRow('Canceladas', totalCancelled, Colors.red),
          ],
        ),
      ),
    );
  }

  Widget _buildStatRow(String label, double value, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
          Text(
            'R\$ ${value.toStringAsFixed(2)}',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}