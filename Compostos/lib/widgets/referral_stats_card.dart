import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:compostos/providers/referral_provider.dart';

class ReferralStatsCard extends ConsumerWidget {
  const ReferralStatsCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final referralStats = ref.watch(referralStatsProvider);

    return Card(
      elevation: 3,
      color: Colors.blue[50],
      child: InkWell(
        onTap: () => context.push('/referrals'),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.group, color: Colors.blue, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Referências',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.blue,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _buildStatRow('Total Ganho', '€${referralStats.totalEarnings.toStringAsFixed(2)}', Colors.green),
              const SizedBox(height: 8),
              _buildStatRow('1º Nível', '${referralStats.firstLevelCount} (€${referralStats.firstLevelEarnings.toStringAsFixed(2)})', Colors.orange),
              const SizedBox(height: 4),
              _buildStatRow('2º Nível', '${referralStats.secondLevelCount} (€${referralStats.secondLevelEarnings.toStringAsFixed(2)})', Colors.purple),
              const SizedBox(height: 8),
              _buildStatRow('Total Indicados', referralStats.totalReferrals.toString(), Colors.blue),
              const SizedBox(height: 12),
              const Text(
                '🎯 5% no 1º nível\n🎯 3% no 2º nível',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.arrow_forward, size: 14, color: Colors.blue),
                  SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      'Ver detalhes',
                      style: TextStyle(fontSize: 12, color: Colors.blue),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatRow(String label, String value, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Flexible(
          child: Text(
            label,
            style: const TextStyle(fontSize: 14, color: Colors.black87),
            overflow: TextOverflow.ellipsis,
          ),
        ),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: color,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}