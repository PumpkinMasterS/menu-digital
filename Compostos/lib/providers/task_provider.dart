import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/models/task_model.dart';
import 'package:compostos/core/services/task_service.dart';

final taskProvider = NotifierProvider<TaskNotifier, List<TaskModel>>(() {
  return TaskNotifier();
});

final taskCompletionsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final taskService = ref.watch(taskServiceProvider);
  return await taskService.getUserTasks();
});

final taskStatsProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final taskService = ref.watch(taskServiceProvider);
  return await taskService.getTaskStats();
});

final availableTasksProvider = Provider<List<TaskModel>>((ref) {
  final tasks = ref.watch(taskProvider);
  return tasks.where((task) => task.isEligible).toList();
});

final completedTasksProvider = Provider<List<TaskModel>>((ref) {
  final tasks = ref.watch(taskProvider);
  return tasks.where((task) => task.status == TaskStatus.completed).toList();
});

class TaskNotifier extends Notifier<List<TaskModel>> {
  late TaskService _taskService;
  
  @override
  List<TaskModel> build() {
    _taskService = ref.watch(taskServiceProvider);
    loadAvailableTasks();
    return [];
  }

  // Carregar tarefas disponíveis da API
  Future<void> loadAvailableTasks() async {
    try {
      final tasks = await _taskService.getAvailableTasks();
      state = tasks;
    } catch (e) {
      // Fallback para tarefas mock em caso de erro
      state = [
        TaskModel.aiTrainingBasic(),
        TaskModel.aiTrainingAdvanced(),
        TaskModel.dataAnalysis(),
      ];
    }
  }

  // Iniciar uma tarefa localmente
  void startTask(String taskId) {
    state = state.map<TaskModel>((task) {
      if (task.id == taskId && task.status == TaskStatus.pending) {
        return task.copyWith(status: TaskStatus.inProgress);
      }
      return task;
    }).toList();
  }

  // Completar uma tarefa via API
  Future<Map<String, dynamic>> completeTask(String taskId, {Map<String, dynamic>? data}) async {
    try {
      final result = await _taskService.completeTask(taskId, data: data);
      
      // Atualizar estado local se necessário
      state = state.map<TaskModel>((task) {
        if (task.id == taskId) {
          return task.copyWith(status: TaskStatus.completed);
        }
        return task;
      }).toList();
      
      return result;
    } catch (e) {
      rethrow;
    }
  }

  // Reivindicar recompensa de tarefa
  Future<Map<String, dynamic>> claimTaskReward(String completionId) async {
    try {
      return await _taskService.claimTaskReward(completionId);
    } catch (e) {
      rethrow;
    }
  }

  // Obter tarefa por ID
  TaskModel? getTaskById(String taskId) {
    return state.firstWhere((task) => task.id == taskId, orElse: () => null!);
  }

  // Obter tarefas por categoria
  List<TaskModel> getTasksByCategory(String category) {
    return state.where((task) => task.category == category).toList();
  }

  // Obter tarefas que podem ser completadas
  List<TaskModel> getCompletableTasks() {
    return state.where((task) => task.canComplete).toList();
  }

  // Obter recompensa total de tarefas
  double get totalPotentialRewards {
    return state.fold(0.0, (sum, task) => sum + task.reward);
  }

  // Estatísticas de progresso
  Map<String, dynamic> get progressStats {
    final totalTasks = state.length;
    final completableTasks = getCompletableTasks().length;
    
    return {
      'totalTasks': totalTasks,
      'completableTasks': completableTasks,
      'completionRate': totalTasks > 0 ? completableTasks / totalTasks : 0.0,
    };
  }
}