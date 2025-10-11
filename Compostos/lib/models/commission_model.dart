import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

enum CommissionStatus {
  pending,
  approved,
  paid,
  cancelled,
}

enum CommissionLevel {
  level1,
  level2,
  level3,
  level4,
  level5,
}

enum CommissionSourceType {
  investment,
  task,
  trading,
  subscription,
  cashback,
  manual,
}

class Commission {
  final String id;
  final String userId;
  final String referrerId;
  final CommissionLevel level;
  final double amount;
  final double percentage;
  final CommissionSourceType sourceType;
  final String sourceId;
  final String description;
  final CommissionStatus status;
  final DateTime createdAt;
  final DateTime? approvedAt;
  final DateTime? paidAt;
  final DateTime? cancelledAt;

  Commission({
    required this.id,
    required this.userId,
    required this.referrerId,
    required this.level,
    required this.amount,
    required this.percentage,
    required this.sourceType,
    required this.sourceId,
    required this.description,
    required this.status,
    required this.createdAt,
    this.approvedAt,
    this.paidAt,
    this.cancelledAt,
  });

  factory Commission.fromJson(Map<String, dynamic> json) {
    return Commission(
      id: json['_id'] ?? json['id'],
      userId: json['userId'],
      referrerId: json['referrerId'],
      level: _parseLevel(json['level']),
      amount: (json['amount'] ?? 0).toDouble(),
      percentage: (json['percentage'] ?? 0).toDouble(),
      sourceType: _parseSourceType(json['sourceType']),
      sourceId: json['sourceId'],
      description: json['description'],
      status: _parseStatus(json['status']),
      createdAt: DateTime.parse(json['createdAt']),
      approvedAt: json['approvedAt'] != null ? DateTime.parse(json['approvedAt']) : null,
      paidAt: json['paidAt'] != null ? DateTime.parse(json['paidAt']) : null,
      cancelledAt: json['cancelledAt'] != null ? DateTime.parse(json['cancelledAt']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'referrerId': referrerId,
      'level': _levelToString(level),
      'amount': amount,
      'percentage': percentage,
      'sourceType': _sourceTypeToString(sourceType),
      'sourceId': sourceId,
      'description': description,
      'status': _statusToString(status),
      'createdAt': createdAt.toIso8601String(),
      'approvedAt': approvedAt?.toIso8601String(),
      'paidAt': paidAt?.toIso8601String(),
      'cancelledAt': cancelledAt?.toIso8601String(),
    };
  }

  static CommissionLevel _parseLevel(dynamic level) {
    if (level is int) {
      switch (level) {
        case 1: return CommissionLevel.level1;
        case 2: return CommissionLevel.level2;
        case 3: return CommissionLevel.level3;
        case 4: return CommissionLevel.level4;
        case 5: return CommissionLevel.level5;
        default: return CommissionLevel.level1;
      }
    }
    
    final levelStr = level.toString().toLowerCase();
    switch (levelStr) {
      case 'level1': return CommissionLevel.level1;
      case 'level2': return CommissionLevel.level2;
      case 'level3': return CommissionLevel.level3;
      case 'level4': return CommissionLevel.level4;
      case 'level5': return CommissionLevel.level5;
      default: return CommissionLevel.level1;
    }
  }

  static String _levelToString(CommissionLevel level) {
    switch (level) {
      case CommissionLevel.level1: return 'level1';
      case CommissionLevel.level2: return 'level2';
      case CommissionLevel.level3: return 'level3';
      case CommissionLevel.level4: return 'level4';
      case CommissionLevel.level5: return 'level5';
    }
  }

  static CommissionStatus _parseStatus(dynamic status) {
    final statusStr = status.toString().toLowerCase();
    switch (statusStr) {
      case 'pending': return CommissionStatus.pending;
      case 'approved': return CommissionStatus.approved;
      case 'paid': return CommissionStatus.paid;
      case 'cancelled': return CommissionStatus.cancelled;
      default: return CommissionStatus.pending;
    }
  }

  static String _statusToString(CommissionStatus status) {
    switch (status) {
      case CommissionStatus.pending: return 'pending';
      case CommissionStatus.approved: return 'approved';
      case CommissionStatus.paid: return 'paid';
      case CommissionStatus.cancelled: return 'cancelled';
    }
  }

  static CommissionSourceType _parseSourceType(dynamic sourceType) {
    final sourceTypeStr = sourceType.toString().toLowerCase();
    switch (sourceTypeStr) {
      case 'investment': return CommissionSourceType.investment;
      case 'task': return CommissionSourceType.task;
      case 'trading': return CommissionSourceType.trading;
      case 'subscription': return CommissionSourceType.subscription;
      case 'cashback': return CommissionSourceType.cashback;
      case 'manual': return CommissionSourceType.manual;
      default: return CommissionSourceType.investment;
    }
  }

  static String _sourceTypeToString(CommissionSourceType sourceType) {
    switch (sourceType) {
      case CommissionSourceType.investment: return 'investment';
      case CommissionSourceType.task: return 'task';
      case CommissionSourceType.trading: return 'trading';
      case CommissionSourceType.subscription: return 'subscription';
      case CommissionSourceType.cashback: return 'cashback';
      case CommissionSourceType.manual: return 'manual';
    }
  }

  String get levelDisplay {
    switch (level) {
      case CommissionLevel.level1: return '1º Nível';
      case CommissionLevel.level2: return '2º Nível';
      case CommissionLevel.level3: return '3º Nível';
      case CommissionLevel.level4: return '4º Nível';
      case CommissionLevel.level5: return '5º Nível';
    }
  }

  String get statusDisplay {
    switch (status) {
      case CommissionStatus.pending: return 'Pendente';
      case CommissionStatus.approved: return 'Aprovada';
      case CommissionStatus.paid: return 'Paga';
      case CommissionStatus.cancelled: return 'Cancelada';
    }
  }

  String get sourceTypeDisplay {
    switch (sourceType) {
      case CommissionSourceType.investment: return 'Investimento';
      case CommissionSourceType.task: return 'Tarefa';
      case CommissionSourceType.trading: return 'Trading';
      case CommissionSourceType.subscription: return 'Assinatura';
      case CommissionSourceType.cashback: return 'Cashback';
      case CommissionSourceType.manual: return 'Manual';
    }
  }

  Color get statusColor {
    switch (status) {
      case CommissionStatus.pending: return Colors.orange;
      case CommissionStatus.approved: return Colors.blue;
      case CommissionStatus.paid: return Colors.green;
      case CommissionStatus.cancelled: return Colors.red;
    }
  }

  Color get levelColor {
    switch (level) {
      case CommissionLevel.level1: return Colors.orange;
      case CommissionLevel.level2: return Colors.purple;
      case CommissionLevel.level3: return Colors.blue;
      case CommissionLevel.level4: return Colors.green;
      case CommissionLevel.level5: return Colors.teal;
    }
  }

  bool get isPending => status == CommissionStatus.pending;
  bool get isApproved => status == CommissionStatus.approved;
  bool get isPaid => status == CommissionStatus.paid;
  bool get isCancelled => status == CommissionStatus.cancelled;

  @override
  String toString() {
    return 'Commission(id: \$id, level: \$level, amount: \$amount, status: \$status)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Commission && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}