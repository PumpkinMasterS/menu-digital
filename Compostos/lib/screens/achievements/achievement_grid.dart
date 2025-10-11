import 'package:flutter/material.dart';
import 'package:compostos/models/achievement_model.dart';
import 'package:compostos/screens/achievements/achievement_card.dart';

class AchievementGrid extends StatelessWidget {
  final List<AchievementModel> achievements;
  final List<UserAchievementModel> userAchievements;
  final Future<Map<String, dynamic>> Function(String) onClaimReward;

  const AchievementGrid({
    super.key,
    required this.achievements,
    required this.userAchievements,
    required this.onClaimReward,
  });

  UserAchievementModel? _getUserAchievement(String achievementId) {
    return userAchievements.firstWhere(
      (ua) => ua.achievement.id == achievementId,
      orElse: () => UserAchievementModel.empty(),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (achievements.isEmpty) {
      return const Center(
        child: Text('Nenhuma conquista disponível'),
      );
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 0.85,
      ),
      itemCount: achievements.length,
      itemBuilder: (context, index) {
        final achievement = achievements[index];
        final userAchievement = _getUserAchievement(achievement.id);

        return AchievementCard(
          achievement: achievement,
          userAchievement: userAchievement ?? UserAchievementModel.empty(),
          onClaimReward: onClaimReward,
        );
      },
    );
  }
}