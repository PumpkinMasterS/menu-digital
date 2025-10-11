import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/providers/task_provider.dart';
import 'package:compostos/models/task_model.dart';

class TaskListCard extends ConsumerWidget {
  const TaskListCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasks = ref.watch(taskProvider);
    final pendingTasks = tasks.where((task) => task.status == TaskStatus.pending).toList();
    
    return Card(
      elevation: 3,
      color: Colors.green[50],
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.task, color: Colors.green, size: 20),
                SizedBox(width: 8),
                Text(
                  'Tarefas Disponíveis',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.green,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            
            if (pendingTasks.isNotEmpty)
              Column(
                children: [
                  _buildStatRow('Tarefas Pendentes', pendingTasks.length.toString(), Colors.orange),
                  const SizedBox(height: 8),
                  _buildStatRow(
                    'Recompensa Total', 
                    '€${pendingTasks.fold(0.0, (sum, task) => sum + task.reward).toStringAsFixed(2)}', 
                    Colors.green
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Tarefas disponíveis para completar e ganhar recompensas!',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              )
            else
              const Text(
                'Nenhuma tarefa disponível no momento',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildStatRow(String label, String value, Color color) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 14, color: Colors.black87),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }
}