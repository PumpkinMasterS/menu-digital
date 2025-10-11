class AchievementModel {
  final String id;
  final String name;
  final String description;
  final String icon;
  final String category;
  final int points;
  final Map<String, dynamic> criteria;
  final Map<String, dynamic> reward;
  final bool isActive;
  final String type;

  AchievementModel({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.category,
    required this.points,
    required this.criteria,
    required this.reward,
    required this.isActive,
    required this.type,
  });

  factory AchievementModel.fromJson(Map<String, dynamic> json) {
    return AchievementModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      icon: (json['icon'] ?? '').toString(),
      category: (json['category'] ?? '').toString(),
      points: (json['points'] is int)
          ? json['points'] as int
          : int.tryParse((json['points'] ?? '0').toString()) ?? 0,
      criteria: Map<String, dynamic>.from(json['criteria'] ?? const {}),
      reward: Map<String, dynamic>.from(json['reward'] ?? const {}),
      isActive: (json['isActive'] ?? false) == true,
      type: (json['type'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'id': id,
      'name': name,
      'description': description,
      'icon': icon,
      'category': category,
      'points': points,
      'criteria': criteria,
      'reward': reward,
      'isActive': isActive,
      'type': type,
    };
  }
}

class UserAchievementModel {
  final String id;
  final String userId;
  final AchievementModel achievement;
  final DateTime? unlockedAt;
  final bool isNew;
  final bool rewardClaimed;
  final Map<String, dynamic> progress;

  UserAchievementModel({
    required this.id,
    required this.userId,
    required this.achievement,
    required this.unlockedAt,
    required this.isNew,
    required this.rewardClaimed,
    required this.progress,
  });

  // Construtor para criar uma instância vazia
  factory UserAchievementModel.empty() {
    return UserAchievementModel(
      id: '',
      userId: '',
      achievement: AchievementModel(
        id: '',
        name: '',
        description: '',
        icon: '',
        category: '',
        points: 0,
        criteria: {},
        reward: {},
        isActive: false,
        type: '',
      ),
      unlockedAt: null,
      isNew: false,
      rewardClaimed: false,
      progress: {},
    );
  }

  bool get isUnlocked => unlockedAt != null;

  factory UserAchievementModel.fromJson(Map<String, dynamic> json) {
    final unlockedRaw = json['unlockedAt'];
    DateTime? parsedUnlocked;
    if (unlockedRaw is String) {
      parsedUnlocked = DateTime.tryParse(unlockedRaw);
    } else if (unlockedRaw is int) {
      // timestamp (ms or s)
      final ms = unlockedRaw > 10000000000 ? unlockedRaw : unlockedRaw * 1000;
      parsedUnlocked = DateTime.fromMillisecondsSinceEpoch(ms, isUtc: true);
    } else if (unlockedRaw is DateTime) {
      parsedUnlocked = unlockedRaw;
    }

    return UserAchievementModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      userId: (json['userId'] ?? '').toString(),
      achievement: AchievementModel.fromJson(
          Map<String, dynamic>.from(json['achievement'] ?? const {})),
      unlockedAt: parsedUnlocked,
      isNew: (json['isNew'] ?? false) == true,
      rewardClaimed: (json['rewardClaimed'] ?? false) == true,
      progress: Map<String, dynamic>.from(json['progress'] ?? const {}),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'id': id,
      'userId': userId,
      'achievement': achievement.toJson(),
      'unlockedAt': unlockedAt?.toIso8601String(),
      'isNew': isNew,
      'rewardClaimed': rewardClaimed,
      'progress': progress,
    };
  }

  double get progressPercentage {
    final currentAny = progress['current'] ?? 0;
    final targetAny = progress['target'] ?? 1;
    final current = currentAny is num ? currentAny.toDouble() : double.tryParse(currentAny.toString()) ?? 0.0;
    final target = targetAny is num ? targetAny.toDouble() : double.tryParse(targetAny.toString()) ?? 1.0;
    if (target <= 0) return 0.0;
    return (current / target).clamp(0.0, 1.0);
  }

  bool get hasReward {
    final value = achievement.reward['value'];
    final numValue = value is num ? value : num.tryParse(value?.toString() ?? '') ?? 0;
    return !rewardClaimed && numValue > 0;
  }
}