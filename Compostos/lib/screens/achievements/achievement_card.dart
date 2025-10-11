import 'package:flutter/material.dart';
import 'package:compostos/models/achievement_model.dart';

class AchievementCard extends StatefulWidget {
  final AchievementModel achievement;
  final UserAchievementModel userAchievement;
  final Future<Map<String, dynamic>> Function(String) onClaimReward;

  const AchievementCard({
    super.key,
    required this.achievement,
    required this.userAchievement,
    required this.onClaimReward,
  });

  @override
  State<AchievementCard> createState() => _AchievementCardState();
}

class _AchievementCardState extends State<AchievementCard> {
  bool _isClaiming = false;

  Color _getAchievementColor() {
    if (widget.userAchievement.isUnlocked) {
      return Colors.green;
    } else {
      return Colors.grey[300]!;
    }
  }

  IconData _getAchievementIcon() {
    switch (widget.achievement.type) {
      case 'investment':
        return Icons.trending_up;
      case 'cashback':
        return Icons.currency_exchange;
      case 'referral':
        return Icons.group_add;
      case 'earning':
        return Icons.attach_money;
      default:
        return Icons.emoji_events;
    }
  }

  Future<void> _claimReward() async {
    if (_isClaiming || widget.userAchievement.rewardClaimed) return;

    setState(() => _isClaiming = true);

    try {
      final result = await widget.onClaimReward(widget.userAchievement.id);
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result['message'] ?? 'Recompensa resgatada com sucesso!'),
          backgroundColor: Colors.green,
        ),
      );

      setState(() {});
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erro ao resgatar recompensa: \$e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      setState(() => _isClaiming = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isUnlocked = widget.userAchievement.isUnlocked;
    final progress = widget.userAchievement.progressPercentage;
    final showProgress = progress < 1.0;

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isUnlocked ? Colors.green : Colors.grey[300]!,
          width: 2,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Ícone e badge de nova conquista
            Stack(
              alignment: Alignment.topRight,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: _getAchievementColor(),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    _getAchievementIcon(),
                    color: isUnlocked ? Colors.white : Colors.grey[600],
                    size: 28,
                  ),
                ),
                if (widget.userAchievement.isNew)
                  Container(
                    width: 16,
                    height: 16,
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.circle,
                      color: Colors.white,
                      size: 8,
                    ),
                  ),
              ],
            ),

            const SizedBox(height: 8),

            // Nome da conquista
            Text(
              widget.achievement.name,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: isUnlocked ? Colors.black : Colors.grey[600],
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),

            const SizedBox(height: 4),

            // Descrição
            Text(
              widget.achievement.description,
              style: TextStyle(
                fontSize: 10,
                color: isUnlocked ? Colors.grey[600] : Colors.grey[400],
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),

            const SizedBox(height: 8),

            // Barra de progresso (se aplicável)
            if (showProgress)
              Column(
                children: [
                  LinearProgressIndicator(
                    value: progress,
                    backgroundColor: Colors.grey[200],
                    color: Theme.of(context).colorScheme.primary,
                    minHeight: 4,
                    borderRadius: BorderRadius.circular(2),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${(progress * 100).toStringAsFixed(0)}%',
                    style: const TextStyle(fontSize: 10, color: Colors.grey),
                  ),
                ],
              ),

            const Spacer(),

            // Pontos e botão de recompensa
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Pontos
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.amber,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    '\${widget.achievement.points}p',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),

                // Botão de recompensa
                if (isUnlocked && widget.userAchievement.hasReward)
                  _buildRewardButton(),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRewardButton() {
    final isClaimed = widget.userAchievement.rewardClaimed;
    
    return IconButton(
      icon: _isClaiming
          ? const SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : Icon(
              isClaimed ? Icons.check_circle : Icons.card_giftcard,
              size: 18,
              color: isClaimed ? Colors.green : Theme.of(context).colorScheme.primary,
            ),
      onPressed: isClaimed ? null : _claimReward,
      tooltip: isClaimed ? 'Recompensa já resgatada' : 'Resgatar recompensa',
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints(),
    );
  }
}