import 'package:compostos/models/task_model.dart';

class TaskMapper {
  /// Converte dados da API backend para TaskModel do frontend
  static TaskModel fromApiData(Map<String, dynamic> apiData) {
    // Mapear tipo da tarefa para dificuldade
    final difficulty = _mapTypeToDifficulty(apiData['type']);
    
    // Mapear categoria
    final category = _mapCategory(apiData['category']);
    
    // Calcular duração estimada baseada no tipo
    final estimatedDuration = _calculateEstimatedDuration(apiData['type']);
    
    // Calcular nível requerido baseado na recompensa
    final requiredLevel = _calculateRequiredLevel(apiData['reward']);
    
    return TaskModel(
      id: apiData['_id']?.toString() ?? apiData['id']?.toString() ?? '',
      title: apiData['title'] ?? 'Tarefa sem título',
      description: apiData['description'] ?? '',
      difficulty: difficulty,
      reward: (apiData['reward'] ?? 0.0).toDouble(),
      estimatedDuration: estimatedDuration,
      requiredLevel: requiredLevel,
      category: category,
      status: TaskStatus.pending, // Status inicial sempre será pending
    );
  }
  
  /// Converte lista de dados da API para lista de TaskModel
  static List<TaskModel> listFromApiData(List<dynamic> apiDataList) {
    return apiDataList.map((data) => fromApiData(data)).toList();
  }
  
  /// Converte dados de completação de tarefa do usuário para TaskModel
  static TaskModel fromUserCompletionData(Map<String, dynamic> completionData, 
                                        Map<String, dynamic> taskData) {
    final task = fromApiData(taskData);
    
    // Atualizar status baseado nos dados de completação
    if (completionData['completedAt'] != null) {
      task.status = TaskStatus.completed;
      task.completedAt = DateTime.parse(completionData['completedAt']);
    } else if (completionData['startedAt'] != null) {
      task.status = TaskStatus.inProgress;
      task.startedAt = DateTime.parse(completionData['startedAt']);
    }
    
    return task;
  }
  
  /// Mapeia o tipo da tarefa para dificuldade
  static TaskDifficulty _mapTypeToDifficulty(String type) {
    switch (type) {
      case 'achievement':
        return TaskDifficulty.S;
      case 'weekly':
        return TaskDifficulty.A;
      case 'daily':
        return TaskDifficulty.B;
      case 'one_time':
      default:
        return TaskDifficulty.B;
    }
  }
  
  /// Mapeia a categoria da tarefa
  static String _mapCategory(String category) {
    switch (category) {
      case 'investment':
        return 'investment';
      case 'referral':
        return 'referral';
      case 'social':
        return 'social';
      case 'learning':
        return 'learning';
      case 'verification':
        return 'verification';
      default:
        return 'general';
    }
  }
  
  /// Calcula duração estimada baseada no tipo de tarefa
  static Duration _calculateEstimatedDuration(String type) {
    switch (type) {
      case 'achievement':
        return const Duration(hours: 4);
      case 'weekly':
        return const Duration(hours: 2);
      case 'daily':
        return const Duration(minutes: 30);
      case 'one_time':
      default:
        return const Duration(minutes: 15);
    }
  }
  
  /// Calcula nível requerido baseado na recompensa
  static int _calculateRequiredLevel(double reward) {
    if (reward >= 20) return 3;
    if (reward >= 10) return 2;
    return 1;
  }
}