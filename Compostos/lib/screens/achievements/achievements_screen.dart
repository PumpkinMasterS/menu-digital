import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:compostos/providers/achievement_provider.dart';
import 'package:compostos/widgets/loading_indicator.dart';
import 'package:compostos/widgets/error_message.dart';
import 'package:compostos/widgets/achievement_unlock_dialog.dart';
import 'package:compostos/screens/achievements/achievement_grid.dart';
import 'package:compostos/screens/achievements/achievement_stats.dart';

class AchievementsScreen extends StatefulWidget {
  const AchievementsScreen({super.key});

  @override
  State<AchievementsScreen> createState() => _AchievementsScreenState();
}

class _AchievementsScreenState extends State<AchievementsScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final provider = Provider.of<AchievementProvider>(context, listen: false);
    await provider.loadAllAchievements();
    await provider.loadUserAchievements();
    await provider.loadUnreadAchievements();
  }

  Future<void> _refreshData() async {
    final provider = Provider.of<AchievementProvider>(context, listen: false);
    await provider.loadAllAchievements();
    await provider.loadUserAchievements();
    final newAchievements = await provider.checkForNewAchievements();
    if (newAchievements.isNotEmpty && mounted) {
      showDialog(
        context: context,
        barrierDismissible: true,
        builder: (_) => AchievementUnlockDialog(newAchievements: newAchievements),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Conquistas'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshData,
            tooltip: 'Atualizar conquistas',
          ),
        ],
      ),
      body: Consumer<AchievementProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && provider.allAchievements.isEmpty) {
            return const LoadingIndicator();
          }

          if (provider.error != null) {
            return ErrorMessage(
              message: provider.error!,
              onRetry: _loadData,
            );
          }

          return RefreshIndicator(
            onRefresh: _refreshData,
            child: SingleChildScrollView(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Estatísticas
                  AchievementStats(
                    unlockedCount: provider.unlockedCount,
                    totalCount: provider.allAchievements.length,
                    totalPoints: provider.totalPoints,
                    unreadCount: provider.unreadAchievements.length,
                    onMarkAllAsRead: provider.markAllAsRead,
                  ),

                  const SizedBox(height: 24),

                  // Grid de conquistas
                  AchievementGrid(
                    achievements: provider.allAchievements,
                    userAchievements: provider.userAchievements,
                    onClaimReward: provider.claimReward,
                  ),

                  const SizedBox(height: 32),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }
}