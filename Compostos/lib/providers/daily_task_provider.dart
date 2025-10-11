import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/models/daily_task_model.dart';
import 'package:compostos/services/storage_service.dart';

class DailyTaskState {
  final List<DailyTaskModel> dailyTasks;
  final List<DailyTaskModel> weeklyTasks;
  final bool isLoading;
  final String? error;
  final double totalRewardsCollected;

  DailyTaskState({
    required this.dailyTasks,
    required this.weeklyTasks,
    required this.isLoading,
    this.error,
    required this.totalRewardsCollected,
  });

  DailyTaskState copyWith({
    List<DailyTaskModel>? dailyTasks,
    List<DailyTaskModel>? weeklyTasks,
    bool? isLoading,
    String? error,
    double? totalRewardsCollected,
  }) {
    return DailyTaskState(
      dailyTasks: dailyTasks ?? this.dailyTasks,
      weeklyTasks: weeklyTasks ?? this.weeklyTasks,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      totalRewardsCollected: totalRewardsCollected ?? this.totalRewardsCollected,
    );
  }

  int get completedDailyTasks => dailyTasks.where((task) => task.isCompleted).length;
  int get totalDailyTasks => dailyTasks.length;
  int get completedWeeklyTasks => weeklyTasks.where((task) => task.isCompleted).length;
  int get totalWeeklyTasks => weeklyTasks.length;
  
  double get dailyProgress => totalDailyTasks > 0 ? completedDailyTasks / totalDailyTasks : 0;
  double get weeklyProgress => totalWeeklyTasks > 0 ? completedWeeklyTasks / totalWeeklyTasks : 0;
  
  double get availableRewards {
    final dailyRewards = dailyTasks
        .where((task) => task.isCompleted)
        .fold<double>(0, (sum, task) => sum + task.reward);
    
    final weeklyRewards = weeklyTasks
        .where((task) => task.isCompleted)
        .fold<double>(0, (sum, task) => sum + task.reward);
    
    return dailyRewards + weeklyRewards;
  }
}

class DailyTaskNotifier extends Notifier<DailyTaskState> {
  late final StorageService _storageService;
  
  @override
  DailyTaskState build() {
    _storageService = ref.watch(storageServiceProvider);
    return DailyTaskState(
      dailyTasks: [],
      weeklyTasks: [],
      isLoading: false,
      totalRewardsCollected: 0,
    );
  }

  Future<void> loadTasks() async {
    try {
      state = state.copyWith(isLoading: true, error: null);
      
      // Carregar tarefas do storage
      final savedTasks = await _storageService.getDailyTasks();
      final savedRewards = await _storageService.getTotalTaskRewards();
      
      if (savedTasks.isEmpty) {
        // Primeira execução - criar tarefas padrão
        final dailyTasks = DailyTaskGenerator.getDefaultDailyTasks();
        final weeklyTasks = DailyTaskGenerator.getDefaultWeeklyTasks();
        
        await _storageService.saveDailyTasks([...dailyTasks, ...weeklyTasks]);
        
        state = state.copyWith(
          dailyTasks: dailyTasks,
          weeklyTasks: weeklyTasks,
          isLoading: false,
          totalRewardsCollected: savedRewards,
        );
      } else {
        // Separar tarefas diárias e semanais
        final dailyTasks = savedTasks.where((task) => task.type == TaskType.daily).toList();
        final weeklyTasks = savedTasks.where((task) => task.type == TaskType.weekly).toList();
        
        state = state.copyWith(
          dailyTasks: dailyTasks,
          weeklyTasks: weeklyTasks,
          isLoading: false,
          totalRewardsCollected: savedRewards,
        );
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Erro ao carregar tarefas: \$e',
      );
    }
  }

  Future<void> completeTask(String taskId) async {
    try {
      // Encontrar a tarefa
      DailyTaskModel? task;
      
      // Procurar nas tarefas diárias
      for (var i = 0; i < state.dailyTasks.length; i++) {
        if (state.dailyTasks[i].id == taskId) {
          task = state.dailyTasks[i];
          break;
        }
      }
      
      // Se não encontrou, procurar nas semanais
      if (task == null) {
        for (var i = 0; i < state.weeklyTasks.length; i++) {
          if (state.weeklyTasks[i].id == taskId) {
            task = state.weeklyTasks[i];
            break;
          }
        }
      }
      
      if (task != null && !task.isCompleted) {
        // Atualizar a tarefa
        final updatedTask = task.copyWith(
          isCompleted: true,
          completedAt: DateTime.now(),
        );
        
        // Atualizar o estado
        final allTasks = [...state.dailyTasks, ...state.weeklyTasks];
        final taskIndex = allTasks.indexWhere((t) => t.id == taskId);
        
        if (taskIndex != -1) {
          allTasks[taskIndex] = updatedTask;
          
          // Separar novamente
          final dailyTasks = allTasks.where((t) => t.type == TaskType.daily).toList();
          final weeklyTasks = allTasks.where((t) => t.type == TaskType.weekly).toList();
          
          // Salvar no storage
          await _storageService.saveDailyTasks(allTasks);
          await _storageService.addTaskReward(updatedTask.reward);
          
          state = state.copyWith(
            dailyTasks: dailyTasks,
            weeklyTasks: weeklyTasks,
            totalRewardsCollected: state.totalRewardsCollected + updatedTask.reward,
          );
        }
      }
    } catch (e) {
      state = state.copyWith(error: 'Erro ao completar tarefa: \$e');
    }
  }

  Future<void> updateTaskProgress(String taskId, int progress) async {
    try {
      // Encontrar a tarefa
      DailyTaskModel? task;
      List<DailyTaskModel> allTasks = [...state.dailyTasks, ...state.weeklyTasks];
      
      final taskIndex = allTasks.indexWhere((t) => t.id == taskId);
      
      if (taskIndex != -1) {
        task = allTasks[taskIndex];
        final updatedTask = task.copyWith(progress: progress);
        
        allTasks[taskIndex] = updatedTask;
        
        // Verificar se a tarefa foi completada
        if (progress >= task.target && !task.isCompleted) {
          await completeTask(taskId);
        } else {
          // Separar novamente
          final dailyTasks = allTasks.where((t) => t.type == TaskType.daily).toList();
          final weeklyTasks = allTasks.where((t) => t.type == TaskType.weekly).toList();
          
          // Salvar no storage
          await _storageService.saveDailyTasks(allTasks);
          
          state = state.copyWith(
            dailyTasks: dailyTasks,
            weeklyTasks: weeklyTasks,
          );
        }
      }
    } catch (e) {
      state = state.copyWith(error: 'Erro ao atualizar progresso: \$e');
    }
  }

  Future<void> resetDailyTasks() async {
    try {
      final newDailyTasks = DailyTaskGenerator.getDefaultDailyTasks();
      final allTasks = [...newDailyTasks, ...state.weeklyTasks];
      
      await _storageService.saveDailyTasks(allTasks);
      
      state = state.copyWith(dailyTasks: newDailyTasks);
    } catch (e) {
      state = state.copyWith(error: 'Erro ao resetar tarefas: \$e');
    }
  }

  Future<void> resetWeeklyTasks() async {
    try {
      final newWeeklyTasks = DailyTaskGenerator.getDefaultWeeklyTasks();
      final allTasks = [...state.dailyTasks, ...newWeeklyTasks];
      
      await _storageService.saveDailyTasks(allTasks);
      
      state = state.copyWith(weeklyTasks: newWeeklyTasks);
    } catch (e) {
      state = state.copyWith(error: 'Erro ao resetar tarefas semanais: \$e');
    }
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

final dailyTaskProvider = NotifierProvider<DailyTaskNotifier, DailyTaskState>(() {
  return DailyTaskNotifier();
});