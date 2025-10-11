import 'package:hive/hive.dart';

part 'task_model.g.dart';

@HiveType(typeId: 4)
enum TaskDifficulty {
  @HiveField(0)
  S,
  @HiveField(1)
  A,
  @HiveField(2)
  B,
}

@HiveType(typeId: 5)
enum TaskStatus {
  @HiveField(0)
  pending,
  @HiveField(1)
  inProgress,
  @HiveField(2)
  completed,
  @HiveField(3)
  failed,
}

@HiveType(typeId: 6)
class TaskModel {
  @HiveField(0)
  final String id;
  
  @HiveField(1)
  final String title;
  
  @HiveField(2)
  final String description;
  
  @HiveField(3)
  final TaskDifficulty difficulty;
  
  @HiveField(4)
  final double reward;
  
  @HiveField(5)
  final Duration estimatedDuration;
  
  @HiveField(6)
  TaskStatus status;
  
  @HiveField(7)
  final DateTime createdAt;
  
  @HiveField(8)
  DateTime? startedAt;
  
  @HiveField(9)
  DateTime? completedAt;
  
  @HiveField(10)
  final int requiredLevel;

  @HiveField(11)
  final String category;

  TaskModel({
    required this.id,
    required this.title,
    required this.description,
    required this.difficulty,
    required this.reward,
    required this.estimatedDuration,
    required this.requiredLevel,
    required this.category,
    this.status = TaskStatus.pending,
    DateTime? createdAt,
  }) : createdAt = createdAt ?? DateTime.now();

  // Métodos de negócio
  void startTask() {
    if (status == TaskStatus.pending) {
      status = TaskStatus.inProgress;
      startedAt = DateTime.now();
    }
  }

  void completeTask() {
    if (status == TaskStatus.inProgress) {
      status = TaskStatus.completed;
      completedAt = DateTime.now();
    }
  }

  void failTask() {
    status = TaskStatus.failed;
  }

  bool get isEligible => status == TaskStatus.pending;
  
  bool get canComplete => status == TaskStatus.inProgress;
  
  Duration? get timeSpent {
    if (startedAt == null) return null;
    final end = completedAt ?? DateTime.now();
    return end.difference(startedAt!);
  }

  double get efficiencyScore {
    if (completedAt == null || startedAt == null) return 0.0;
    
    final actualDuration = completedAt!.difference(startedAt!);
    final expectedDuration = estimatedDuration;
    
    if (actualDuration.inSeconds == 0) return 0.0;
    
    return expectedDuration.inSeconds / actualDuration.inSeconds;
  }

  // Factory methods para tarefas pré-definidas
  factory TaskModel.aiTrainingBasic() {
    return TaskModel(
      id: 'ai_basic_${DateTime.now().millisecondsSinceEpoch}',
      title: 'Treino de IA Básico',
      description: 'Complete o treinamento de um modelo de IA simples',
      difficulty: TaskDifficulty.B,
      reward: 5.0,
      estimatedDuration: const Duration(minutes: 30),
      requiredLevel: 1,
      category: 'ai_training',
    );
  }

  factory TaskModel.aiTrainingAdvanced() {
    return TaskModel(
      id: 'ai_advanced_${DateTime.now().millisecondsSinceEpoch}',
      title: 'Treino de IA Avançado',
      description: 'Treinamento de modelo de IA complexo com big data',
      difficulty: TaskDifficulty.A,
      reward: 15.0,
      estimatedDuration: const Duration(hours: 2),
      requiredLevel: 2,
      category: 'ai_training',
    );
  }

  factory TaskModel.dataAnalysis() {
    return TaskModel(
      id: 'data_analysis_${DateTime.now().millisecondsSinceEpoch}',
      title: 'Análise de Big Data',
      description: 'Processamento e análise de grandes volumes de dados',
      difficulty: TaskDifficulty.S,
      reward: 25.0,
      estimatedDuration: const Duration(hours: 4),
      requiredLevel: 3,
      category: 'data_analysis',
    );
  }

  // Conversão para mapa para serialização
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'difficulty': difficulty.index,
      'reward': reward,
      'estimatedDuration': estimatedDuration.inMilliseconds,
      'status': status.index,
      'createdAt': createdAt.millisecondsSinceEpoch,
      'startedAt': startedAt?.millisecondsSinceEpoch,
      'completedAt': completedAt?.millisecondsSinceEpoch,
      'requiredLevel': requiredLevel,
      'category': category,
    };
  }

  factory TaskModel.fromMap(Map<String, dynamic> map) {
    return TaskModel(
      id: map['id'],
      title: map['title'],
      description: map['description'],
      difficulty: TaskDifficulty.values[map['difficulty']],
      reward: map['reward'],
      estimatedDuration: Duration(milliseconds: map['estimatedDuration']),
      requiredLevel: map['requiredLevel'],
      category: map['category'] ?? 'general',
    )..status = TaskStatus.values[map['status']]
     ..startedAt = map['startedAt'] != null ? DateTime.fromMillisecondsSinceEpoch(map['startedAt']) : null
     ..completedAt = map['completedAt'] != null ? DateTime.fromMillisecondsSinceEpoch(map['completedAt']) : null;
  }

  // Método fromJson para compatibilidade com o serviço
  factory TaskModel.fromJson(Map<String, dynamic> json) {
    return TaskModel.fromMap(json);
  }

  // Método toJson para compatibilidade com o serviço
  Map<String, dynamic> toJson() {
    return toMap();
  }

  // Método copyWith para criar cópias modificadas
  TaskModel copyWith({
    String? id,
    String? title,
    String? description,
    TaskDifficulty? difficulty,
    double? reward,
    Duration? estimatedDuration,
    TaskStatus? status,
    DateTime? createdAt,
    DateTime? startedAt,
    DateTime? completedAt,
    int? requiredLevel,
    String? category,
  }) {
    return TaskModel(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      difficulty: difficulty ?? this.difficulty,
      reward: reward ?? this.reward,
      estimatedDuration: estimatedDuration ?? this.estimatedDuration,
      requiredLevel: requiredLevel ?? this.requiredLevel,
      category: category ?? this.category,
    )..status = status ?? this.status
     ..startedAt = startedAt ?? this.startedAt
     ..completedAt = completedAt ?? this.completedAt;
  }
}