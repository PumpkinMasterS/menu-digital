import 'package:flutter/material.dart';

class AchievementStats extends StatelessWidget {
  final int unlockedCount;
  final int totalCount;
  final int totalPoints;
  final int unreadCount;
  final VoidCallback onMarkAllAsRead;

  const AchievementStats({
    super.key,
    required this.unlockedCount,
    required this.totalCount,
    required this.totalPoints,
    required this.unreadCount,
    required this.onMarkAllAsRead,
  });

  double get progressPercentage => totalCount > 0 ? unlockedCount / totalCount : 0;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Barra de progresso
            LinearProgressIndicator(
              value: progressPercentage,
              backgroundColor: Colors.grey[300],
              color: Theme.of(context).colorScheme.primary,
              minHeight: 8,
              borderRadius: BorderRadius.circular(4),
            ),

            const SizedBox(height: 16),

            // Estatísticas
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem(
                  icon: Icons.emoji_events,
                  value: unlockedCount.toString(),
                  label: 'Desbloqueadas',
                  color: Theme.of(context).colorScheme.primary,
                ),
                _buildStatItem(
                  icon: Icons.star,
                  value: totalPoints.toString(),
                  label: 'Pontos',
                  color: Colors.amber,
                ),
                _buildStatItem(
                  icon: Icons.notifications,
                  value: unreadCount.toString(),
                  label: 'Novas',
                  color: Colors.red,
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Botão para marcar todas como lidas
            if (unreadCount > 0)
              ElevatedButton.icon(
                onPressed: onMarkAllAsRead,
                icon: const Icon(Icons.check_circle, size: 18),
                label: const Text('Marcar todas como lidas'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.secondary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem({
    required IconData icon,
    required String value,
    required String label,
    required Color color,
  }) {
    return Column(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: Colors.grey,
          ),
        ),
      ],
    );
  }
}