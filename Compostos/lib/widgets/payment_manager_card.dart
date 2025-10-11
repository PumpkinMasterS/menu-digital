import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/providers/referral_provider.dart';
import 'package:compostos/models/referral_model.dart';

class PaymentManagerCard extends ConsumerWidget {
  const PaymentManagerCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final referralNotifier = ref.read(referralProvider.notifier);
    final rewards = ref.watch(referralProvider);
    
    final pendingCount = referralNotifier.pendingPaymentsCount;
    final pendingAmount = referralNotifier.pendingPaymentsAmount;
    final scheduledPayments = referralNotifier.getScheduledPayments(limit: 5);

    return Card(
      elevation: 4,
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            const Row(
              children: [
                Icon(Icons.payment, color: Colors.green, size: 24),
                SizedBox(width: 8),
                Text(
                  'Gerenciador de Pagamentos',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.green,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Estatísticas de pagamentos
            _buildPaymentStats(pendingCount, pendingAmount),
            const SizedBox(height: 20),

            // Próximos pagamentos
            _buildScheduledPayments(scheduledPayments),
            const SizedBox(height: 20),

            // Botões de ação
            _buildActionButtons(context, ref, pendingCount),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentStats(int pendingCount, double pendingAmount) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _buildStatCard(
          title: 'Pendentes',
          value: pendingCount.toString(),
          icon: Icons.pending_actions,
          color: Colors.orange,
        ),
        _buildStatCard(
          title: 'Valor Total',
          value: '€\${pendingAmount.toStringAsFixed(2)}',
          icon: Icons.attach_money,
          color: Colors.green,
        ),
        _buildStatCard(
          title: 'Status',
          value: pendingCount > 0 ? 'Pendente' : 'Em dia',
          icon: Icons.check_circle,
          color: pendingCount > 0 ? Colors.orange : Colors.green,
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      width: 90,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: color,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: const TextStyle(fontSize: 10, color: Colors.grey),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildScheduledPayments(List<ReferralReward> payments) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Próximos Pagamentos',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        if (payments.isEmpty)
          const Text(
            'Nenhum pagamento pendente',
            style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic),
          )
        else
          Column(
            children: payments.map((payment) => _buildPaymentItem(payment)).toList(),
          ),
      ],
    );
  }

  Widget _buildPaymentItem(ReferralReward payment) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.orange.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.orange.withOpacity(0.2)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  payment.description,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  'Nível \${payment.level.index + 1}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '€\${payment.amount.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Colors.orange,
                ),
              ),
              Text(
                _formatDate(payment.date),
                style: const TextStyle(fontSize: 10, color: Colors.grey),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context, WidgetRef ref, int pendingCount) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        ElevatedButton.icon(
          onPressed: pendingCount > 0
              ? () => _processAllPayments(context, ref)
              : null,
          icon: const Icon(Icons.payment, size: 16),
          label: const Text('Pagar Tudo'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.green,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
        ),
        OutlinedButton.icon(
          onPressed: () => _viewPaymentHistory(context),
          icon: const Icon(Icons.history, size: 16),
          label: const Text('Histórico'),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
        ),
      ],
    );
  }

  void _processAllPayments(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Processar Pagamentos'),
        content: const Text('Deseja processar todos os pagamentos pendentes?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await _processPayments(ref);
            },
            child: const Text('Confirmar'),
          ),
        ],
      ),
    );
  }

  Future<void> _processPayments(WidgetRef ref) async {
    try {
      final referralNotifier = ref.read(referralProvider.notifier);
      final pendingIds = ref.read(referralProvider)
          .where((reward) => !reward.isPaid)
          .map((reward) => reward.id)
          .toList();

      if (pendingIds.isNotEmpty) {
        await referralNotifier.processBatchPayments(pendingIds);
        ScaffoldMessenger.of(ref.context).showSnackBar(
          const SnackBar(content: Text('Pagamentos processados com sucesso!')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(ref.context).showSnackBar(
        SnackBar(content: Text('Erro ao processar pagamentos: \$e')),
      );
    }
  }

  void _viewPaymentHistory(BuildContext context) {
    // Navegar para histórico de pagamentos
    // context.push('/payments/history');
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Funcionalidade em desenvolvimento')),
    );
  }

  String _formatDate(DateTime date) {
    return '\${date.day}/\${date.month}/\${date.year}';
  }
}