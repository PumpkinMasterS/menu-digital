import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/models/task_model.dart';
import 'package:compostos/providers/task_provider.dart';

class TaskCard extends ConsumerWidget {
  final TaskModel task;
  final bool isCompleted;

  const TaskCard({
    super.key,
    required this.task,
    this.isCompleted = false,
  });

  Color _getDifficultyColor(TaskDifficulty difficulty) {
    switch (difficulty) {
      case TaskDifficulty.S:
        return Colors.deepPurple;
      case TaskDifficulty.A:
        return Colors.blue;
      case TaskDifficulty.B:
        return Colors.green;
    }
  }

  String _getDifficultyText(TaskDifficulty difficulty) {
    switch (difficulty) {
      case TaskDifficulty.S:
        return 'S';
      case TaskDifficulty.A:
        return 'A';
      case TaskDifficulty.B:
        return 'B';
    }
  }

  IconData _getTaskIcon(String title) {
    if (title.contains('IA')) return Icons.psychology;
    if (title.contains('Big Data')) return Icons.analytics;
    if (title.contains('Render')) return Icons.movie;
    return Icons.task;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final taskNotifier = ref.read(taskProvider.notifier);

    return Card(
      elevation: 3,
      color: isCompleted ? Colors.grey[100] : null,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  _getTaskIcon(task.title),
                  color: _getDifficultyColor(task.difficulty),
                  size: 24,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    task.title,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: isCompleted ? Colors.grey : Colors.black,
                      decoration: isCompleted ? TextDecoration.lineThrough : null,
                    ),
                  ),
                ),
                Chip(
                  label: Text(
                    _getDifficultyText(task.difficulty),
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                  ),
                  backgroundColor: _getDifficultyColor(task.difficulty),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              task.description,
              style: TextStyle(
                color: isCompleted ? Colors.grey[600] : Colors.black87,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Recompensa: €${task.reward.toStringAsFixed(2)}',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: isCompleted ? Colors.grey : Colors.green,
                  ),
                ),
                if (!isCompleted && task.status == TaskStatus.pending)
                  ElevatedButton(
                    onPressed: () {
                      taskNotifier.startTask(task.id);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Tarefa "${task.title}" iniciada!'),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.deepPurple,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Iniciar Tarefa'),
                  )
                else if (task.status == TaskStatus.inProgress)
                  ElevatedButton(
                    onPressed: () {
                      taskNotifier.completeTask(task.id);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Tarefa "${task.title}" concluída! +€${task.reward.toStringAsFixed(2)}'),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Concluir'),
                  )
                else if (isCompleted)
                  const Icon(Icons.check_circle, color: Colors.green, size: 24),
              ],
            ),
            if (task.status == TaskStatus.inProgress)
              Column(
                children: [
                  const SizedBox(height: 8),
                  LinearProgressIndicator(
                    backgroundColor: Colors.grey[300],
                    color: Colors.deepPurple,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Em progresso',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}