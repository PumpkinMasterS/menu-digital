import 'package:hive/hive.dart';

part 'referral_model.g.dart';

@HiveType(typeId: 1)
enum ReferralLevel {
  @HiveField(0)
  firstLevel, // 1º nível - 5%
  
  @HiveField(1)
  secondLevel, // 2º nível - 3%
}

class ReferralReward {
  final String id;
  
  final String referrerId; // Quem indicou
  
  final String referredId; // Quem foi indicado
  
  final ReferralLevel level;
  
  final double amount;
  
  final String description;
  
  final DateTime date;
  
  final bool isPaid;

  final String referralCode; // Código de referência usado

  ReferralReward({
    required this.id,
    required this.referrerId,
    required this.referredId,
    required this.level,
    required this.amount,
    required this.description,
    required this.date,
    this.isPaid = false,
    required this.referralCode,
  });

  // Método para calcular comissão baseada no nível
  static double calculateCommission(double baseAmount, ReferralLevel level) {
    switch (level) {
      case ReferralLevel.firstLevel:
        return baseAmount * 0.05; // 5% para 1º nível
      case ReferralLevel.secondLevel:
        return baseAmount * 0.03; // 3% para 2º nível
    }
  }

  // Converter para mapa
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'referrerId': referrerId,
      'referredId': referredId,
      'level': level.index,
      'amount': amount,
      'description': description,
      'date': date.toIso8601String(),
      'isPaid': isPaid,
      'referralCode': referralCode,
    };
  }

  // Criar a partir de mapa
  factory ReferralReward.fromMap(Map<String, dynamic> map) {
    return ReferralReward(
      id: map['id'],
      referrerId: map['referrerId'],
      referredId: map['referredId'],
      level: ReferralLevel.values[map['level']],
      amount: map['amount'],
      description: map['description'],
      date: DateTime.parse(map['date']),
      isPaid: map['isPaid'],
      referralCode: map['referralCode'],
    );
  }
}