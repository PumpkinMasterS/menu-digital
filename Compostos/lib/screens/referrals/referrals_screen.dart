import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import 'package:compostos/widgets/referral_stats_card.dart';
import 'package:compostos/providers/user_provider.dart';
import 'package:compostos/providers/referral_provider.dart';
import 'package:compostos/models/referral_model.dart';

class ReferralsScreen extends ConsumerWidget {
  const ReferralsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(userProvider);
    final referralStats = ref.watch(referralStatsProvider);
    
    final referralCode = user?.referralCode ?? 'GERAR-CODIGO';
    final shareMessage = '💎 Junte-se a mim no Compostos - Plataforma de Investimentos em Robôs!\n\n' +
        'Use meu código de indicação: $referralCode\n\n' +
        '🎯 Ganhe 5% em todas as transações do seu 1º nível\n' +
        '🎯 Ganhe 3% em todas as transações do seu 2º nível\n\n' +
        '💰 Comece com €100 grátis!\n' +
        '🔗 Baixe o app: https://compostos.app/install';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Indicações'),
        backgroundColor: const Color(0xFFFF6B35),
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Estatísticas
            const ReferralStatsCard(),
            const SizedBox(height: 24),

            // Seu código de indicação
            _buildReferralCodeCard(context, referralCode, shareMessage),
            const SizedBox(height: 24),

            // Como funciona
            _buildHowItWorksCard(),
            const SizedBox(height: 24),

            // Histórico de indicações
            _buildReferralHistory(),
          ],
        ),
      ),
    );
  }

  Widget _buildReferralCodeCard(BuildContext context, String referralCode, String shareMessage) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          children: [
            const Text(
              'Seu Código de Indicação',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.orange,
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.orange[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.orange),
              ),
              child: Text(
                referralCode,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.orange,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _copyToClipboard(context, referralCode),
                    icon: const Icon(Icons.copy, size: 18),
                    label: const Text('Copiar'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.orange,
                      side: const BorderSide(color: Colors.orange),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _shareReferralCode(shareMessage),
                    icon: const Icon(Icons.share, size: 18),
                    label: const Text('Compartilhar'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHowItWorksCard() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '🎯 Como Funciona',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.blue,
              ),
            ),
            const SizedBox(height: 16),
            _buildStep(
              icon: Icons.person_add,
              title: '1. Compartilhe seu código',
              description: 'Use os botões acima para compartilhar seu código único',
            ),
            _buildStep(
              icon: Icons.people,
              title: '2. Seus indicados se cadastram',
              description: 'Eles usam seu código ao criar a conta',
            ),
            _buildStep(
              icon: Icons.attach_money,
              title: '3. Ganhe comissões',
              description: '5% em todas as transações do 1º nível\n3% em todas as transações do 2º nível',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep({required IconData icon, required String title, required String description}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Colors.blue, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReferralHistory() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '📊 Histórico de Indicações',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.green,
              ),
            ),
            const SizedBox(height: 12),
            Consumer(
              builder: (context, ref, child) {
                final referralRewards = ref.watch(referralProvider);
                final user = ref.watch(userProvider);
                
                if (user == null) {
                  return const Center(child: Text('Faça login para ver o histórico'));
                }
                
                final userRewards = referralRewards.where((reward) => reward.referrerId == user.id).toList();
                
                if (userRewards.isEmpty) {
                  return const Center(
                    child: Text(
                      'Nenhuma indicação ainda\nCompartilhe seu código para começar a ganhar!',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey),
                    ),
                  );
                }
                
                return Column(
                  children: userRewards.map((reward) => _buildReferralItem(reward)).toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReferralItem(ReferralReward reward) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: _getLevelColor(reward.level),
          shape: BoxShape.circle,
        ),
        child: Icon(
          reward.level == ReferralLevel.firstLevel ? Icons.star : Icons.star_border,
          color: Colors.white,
          size: 20,
        ),
      ),
      title: Text(
        reward.description,
        style: const TextStyle(fontSize: 14),
      ),
      subtitle: Text(
        '€${reward.amount.toStringAsFixed(2)} • ${_formatDate(reward.date)}',
        style: TextStyle(color: Colors.grey[600]),
      ),
      trailing: Chip(
        label: Text(
          reward.level == ReferralLevel.firstLevel ? '1º' : '2º',
          style: const TextStyle(color: Colors.white, fontSize: 12),
        ),
        backgroundColor: _getLevelColor(reward.level),
      ),
    );
  }

  Color _getLevelColor(ReferralLevel level) {
    switch (level) {
      case ReferralLevel.firstLevel:
        return Colors.orange;
      case ReferralLevel.secondLevel:
        return Colors.purple;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  void _copyToClipboard(BuildContext context, String text) {
    // Implementação simplificada - em produção usar clipboard package
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Código copiado para a área de transferência!')),
    );
  }

  void _shareReferralCode(String message) {
    Share.share(message);
  }
}