import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/widgets/task_card.dart';
import 'package:compostos/core/services/task_service.dart';
import 'package:compostos/providers/task_provider.dart';

class TasksScreen extends ConsumerStatefulWidget {
  const TasksScreen({super.key});

  @override
  ConsumerState<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends ConsumerState<TasksScreen> {
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadTasks();
  }

  Future<void> _loadTasks() async {
    try {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
      
      // Carregar tarefas disponíveis
      await ref.read(taskProvider.notifier).loadAvailableTasks();
      
      setState(() {
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Erro ao carregar tarefas: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final tasks = ref.watch(availableTasksProvider);
    final completions = ref.watch(taskCompletionsProvider);
    final stats = ref.watch(taskStatsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tarefas'),
        backgroundColor: const Color(0xFF10B981),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTasks,
            tooltip: 'Recarregar tarefas',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _errorMessage!,
                        style: const TextStyle(color: Colors.red),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadTasks,
                        child: const Text('Tentar novamente'),
                      ),
                    ],
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Estatísticas
                      stats.when(
                        data: (statsData) {
                          final userStats = statsData['user'] ?? {};
                          final platformStats = statsData['platform'] ?? {};
                          
                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Suas Estatísticas',
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                                    children: [
                                      _buildStatItem(
                                        'Recompensas',
                                        'R\$${(userStats['totalRewards'] ?? 0).toStringAsFixed(2)}',
                                        Icons.attach_money,
                                      ),
                                      _buildStatItem(
                                        'Completadas',
                                        (userStats['totalCompletions'] ?? 0).toString(),
                                        Icons.check_circle,
                                      ),
                                      _buildStatItem(
                                        'Únicas',
                                        (userStats['uniqueTasksCompleted'] ?? 0).toString(),
                                        Icons.star,
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                        loading: () => const Center(child: CircularProgressIndicator()),
                        error: (error, stack) => const SizedBox.shrink(),
                      ),
                      
                      const SizedBox(height: 16),
                      
                      // Tarefas disponíveis
                      const Text(
                        'Tarefas Disponíveis',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      
                      if (tasks.isEmpty)
                        const Center(
                          child: Text(
                            'Nenhuma tarefa disponível no momento.',
                            style: TextStyle(color: Colors.grey),
                          ),
                        )
                      else
                        ...tasks.map((task) => TaskCard(task: task)),
                      
                      const SizedBox(height: 24),
                      
                      // Completadas
                      completions.when(
                        data: (completionsData) {
                          final userCompletions = completionsData['completions'] ?? [];
                          if (userCompletions.isEmpty) return const SizedBox.shrink();
                          
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Tarefas Completadas',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              ...userCompletions.map((completion) {
                                return ListTile(
                                  leading: const Icon(Icons.check_circle, color: Colors.green),
                                  title: Text(completion['task']?['title'] ?? 'Tarefa completada'),
                                  subtitle: Text(
                                    'Recompensa: R\$${(completion['reward'] ?? 0).toStringAsFixed(2)}',
                                  ),
                                  trailing: completion['status'] == 'completed'
                                      ? ElevatedButton(
                                          onPressed: () {
                                            // Reivindicar recompensa
                                            ref.read(taskProvider.notifier).claimTaskReward(completion['_id']);
                                          },
                                          child: const Text('Reivindicar'),
                                        )
                                      : const Icon(Icons.verified, color: Colors.green),
                                );
                              }),
                            ],
                          );
                        },
                        loading: () => const Center(child: CircularProgressIndicator()),
                        error: (error, stack) => const SizedBox.shrink(),
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: const Color(0xFF10B981)),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Colors.grey),
        ),
      ],
    );
  }
}