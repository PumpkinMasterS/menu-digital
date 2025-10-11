class DailyTaskModel {
  final String id;
  final String title;
  final String description;
  final double reward;
  final bool isCompleted;
  final DateTime createdAt;
  final DateTime? completedAt;
  final TaskType type;
  final int progress;
  final int target;

  DailyTaskModel({
    required this.id,
    required this.title,
    required this.description,
    required this.reward,
    required this.isCompleted,
    required this.createdAt,
    this.completedAt,
    required this.type,
    required this.progress,
    required this.target,
  });

  DailyTaskModel copyWith({
    String? id,
    String? title,
    String? description,
    double? reward,
    bool? isCompleted,
    DateTime? createdAt,
    DateTime? completedAt,
    TaskType? type,
    int? progress,
    int? target,
  }) {
    return DailyTaskModel(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      reward: reward ?? this.reward,
      isCompleted: isCompleted ?? this.isCompleted,
      createdAt: createdAt ?? this.createdAt,
      completedAt: completedAt ?? this.completedAt,
      type: type ?? this.type,
      progress: progress ?? this.progress,
      target: target ?? this.target,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'reward': reward,
      'isCompleted': isCompleted,
      'createdAt': createdAt.toIso8601String(),
      'completedAt': completedAt?.toIso8601String(),
      'type': type.toString(),
      'progress': progress,
      'target': target,
    };
  }

  factory DailyTaskModel.fromMap(Map<String, dynamic> map) {
    return DailyTaskModel(
      id: map['id'],
      title: map['title'],
      description: map['description'],
      reward: map['reward']?.toDouble() ?? 0.0,
      isCompleted: map['isCompleted'] ?? false,
      createdAt: DateTime.parse(map['createdAt']),
      completedAt: map['completedAt'] != null ? DateTime.parse(map['completedAt']) : null,
      type: TaskType.values.firstWhere((e) => e.toString() == map['type'], orElse: () => TaskType.daily),
      progress: map['progress'] ?? 0,
      target: map['target'] ?? 1,
    );
  }

  double get progressPercentage => target > 0 ? (progress / target) : 0;
  bool get isInProgress => progress > 0 && !isCompleted;
}

enum TaskType {
  daily,
  weekly,
  achievement,
  referral,
  investment,
  profit,
}

class DailyTaskGenerator {
  static List<DailyTaskModel> getDefaultDailyTasks() {
    final now = DateTime.now();
    return [
      DailyTaskModel(
        id: 'daily_login',
        title: 'Login Diário',
        description: 'Faça login no aplicativo',
        reward: 1.0,
        isCompleted: false,
        createdAt: now,
        type: TaskType.daily,
        progress: 0,
        target: 1,
      ),
      DailyTaskModel(
        id: 'collect_profits',
        title: 'Coletar Lucros',
        description: 'Colete seus lucros diários',
        reward: 2.0,
        isCompleted: false,
        createdAt: now,
        type: TaskType.daily,
        progress: 0,
        target: 1,
      ),
      DailyTaskModel(
        id: 'check_robots',
        title: 'Verificar Robôs',
        description: 'Verifique o status dos seus robôs',
        reward: 1.5,
        isCompleted: false,
        createdAt: now,
        type: TaskType.daily,
        progress: 0,
        target: 1,
      ),
      DailyTaskModel(
        id: 'refer_friend',
        title: 'Indicar Amigo',
        description: 'Indique um amigo para o aplicativo',
        reward: 5.0,
        isCompleted: false,
        createdAt: now,
        type: TaskType.daily,
        progress: 0,
        target: 1,
      ),
      DailyTaskModel(
        id: 'complete_3_tasks',
        title: 'Completar 3 Tarefas',
        description: 'Complete 3 tarefas diárias',
        reward: 3.0,
        isCompleted: false,
        createdAt: now,
        type: TaskType.daily,
        progress: 0,
        target: 3,
      ),
    ];
  }

  static List<DailyTaskModel> getDefaultWeeklyTasks() {
    final now = DateTime.now();
    return [
      DailyTaskModel(
        id: 'weekly_login',
        title: 'Login Semanal',
        description: 'Faça login 7 dias consecutivos',
        reward: 10.0,
        isCompleted: false,
        createdAt: now,
        type: TaskType.weekly,
        progress: 0,
        target: 7,
      ),
      DailyTaskModel(
        id: 'collect_50',
        title: 'Coletar €50',
        description: 'Colete €50 em lucros esta semana',
        reward: 15.0,
        isCompleted: false,
        createdAt: now,
        type: TaskType.weekly,
        progress: 0,
        target: 50,
      ),
      DailyTaskModel(
        id: 'complete_all_daily',
        title: 'Tarefas Diárias Completas',
        description: 'Complete todas as tarefas diárias por 5 dias',
        reward: 20.0,
        isCompleted: false,
        createdAt: now,
        type: TaskType.weekly,
        progress: 0,
        target: 5,
      ),
      DailyTaskModel(
        id: 'invest_100',
        title: 'Investir €100',
        description: 'Invista €100 esta semana',
        reward: 25.0,
        isCompleted: false,
        createdAt: now,
        type: TaskType.weekly,
        progress: 0,
        target: 100,
      ),
    ];
  }
}