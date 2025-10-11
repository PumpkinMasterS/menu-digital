import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/providers/admin_provider.dart';
import 'package:compostos/widgets/admin/admin_stats_card.dart';
import 'package:compostos/widgets/admin/user_list_tile.dart';
import 'package:compostos/widgets/loading_indicator.dart';
import 'package:compostos/widgets/error_message.dart';

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  final ScrollController _scrollController = ScrollController();
  bool _isLoadingMore = false;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
    _scrollController.addListener(_scrollListener);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    final adminNotifier = ref.read(adminProvider.notifier);
    await adminNotifier.loadDashboardStats();
    await adminNotifier.loadUsers();
  }

  void _scrollListener() {
    if (_scrollController.position.pixels ==
        _scrollController.position.maxScrollExtent) {
      _loadMoreUsers();
    }
  }

  Future<void> _loadMoreUsers() async {
    if (_isLoadingMore) return;
    
    setState(() {
      _isLoadingMore = true;
    });

    final adminNotifier = ref.read(adminProvider.notifier);
    await adminNotifier.loadNextPage();

    setState(() {
      _isLoadingMore = false;
    });
  }

  Future<void> _refreshData() async {
    final adminNotifier = ref.read(adminProvider.notifier);
    await adminNotifier.loadDashboardStats();
    await adminNotifier.loadUsers(
      page: 1,
      search: ref.read(adminProvider).searchQuery,
      role: ref.read(adminProvider).roleFilter,
      status: ref.read(adminProvider).statusFilter,
    );
  }

  @override
  Widget build(BuildContext context) {
    final adminState = ref.watch(adminProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard Administrativo'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshData,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refreshData,
        child: CustomScrollView(
          controller: _scrollController,
          slivers: [
            // Seção de estatísticas
            if (adminState.dashboardStats != null)
              SliverToBoxAdapter(
                child: _buildStatsSection(adminState.dashboardStats!),
              ),

            // Seção de usuários
            SliverPadding(
              padding: const EdgeInsets.all(16.0),
              sliver: SliverToBoxAdapter(
                child: Row(
                  children: [
                    Text(
                      'Usuários (${adminState.totalUsers})',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const Spacer(),
                    // TODO: Adicionar filtros de busca e filtro
                  ],
                ),
              ),
            ),

            // Lista de usuários
            if (adminState.isLoading && adminState.users.isEmpty)
              const SliverFillRemaining(
                child: Center(child: LoadingIndicator()),
              )
            else if (adminState.error != null && adminState.users.isEmpty)
              SliverFillRemaining(
                child: Center(
                  child: ErrorMessage(
                    message: adminState.error!,
                    onRetry: _refreshData,
                  ),
                ),
              )
            else if (adminState.users.isEmpty)
              const SliverFillRemaining(
                child: Center(
                  child: Text('Nenhum usuário encontrado'),
                ),
              )
            else
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    if (index < adminState.users.length) {
                      final user = adminState.users[index];
                      return UserListTile(user: user);
                    } else if (_isLoadingMore) {
                      return const Padding(
                        padding: EdgeInsets.all(16.0),
                        child: Center(child: CircularProgressIndicator()),
                      );
                    } else {
                      return const SizedBox.shrink();
                    }
                  },
                  childCount: adminState.users.length + (_isLoadingMore ? 1 : 0),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsSection(AdminDashboardStats stats) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Estatísticas Gerais',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 16,
            runSpacing: 16,
            children: [
              AdminStatsCard(
                title: 'Total de Usuários',
                value: stats.totalUsers.toString(),
                icon: Icons.people,
                color: Colors.blue,
              ),
              AdminStatsCard(
                title: 'Usuários Ativos',
                value: stats.activeUsers.toString(),
                icon: Icons.person,
                color: Colors.green,
              ),
              AdminStatsCard(
                title: 'Novos Hoje',
                value: stats.newUsersToday.toString(),
                icon: Icons.person_add,
                color: Colors.orange,
              ),
              AdminStatsCard(
                title: 'Total Investido',
                value: 'R\${stats.totalInvested.toStringAsFixed(2)}',
                icon: Icons.attach_money,
                color: Colors.purple,
              ),
              AdminStatsCard(
                title: 'Lucro Total',
                value: 'R\${stats.totalProfit.toStringAsFixed(2)}',
                icon: Icons.trending_up,
                color: Colors.green,
              ),
              AdminStatsCard(
                title: 'Total de Tarefas',
                value: stats.totalTasks.toString(),
                icon: Icons.task,
                color: Colors.blueGrey,
              ),
              AdminStatsCard(
                title: 'Tarefas Concluídas',
                value: stats.completedTasks.toString(),
                icon: Icons.check_circle,
                color: Colors.teal,
              ),
              AdminStatsCard(
                title: 'Total de Indicações',
                value: stats.totalReferrals.toString(),
                icon: Icons.group_add,
                color: Colors.indigo,
              ),
              AdminStatsCard(
                title: 'Indicações Ativas',
                value: stats.activeReferrals.toString(),
                icon: Icons.group,
                color: Colors.deepPurple,
              ),
            ],
          ),
        ],
      ),
    );
  }
}