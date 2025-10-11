import 'package:hive/hive.dart';
import 'daily_profit_model.dart';

part 'robot_model.g.dart';

@HiveType(typeId: 2)
enum RobotLevel {
  @HiveField(0)
  S,
  @HiveField(1)
  A,
  @HiveField(2)
  B,
}

@HiveType(typeId: 3)
class RobotModel {
  @HiveField(0)
  final String id;
  
  @HiveField(1)
  final String name;
  
  @HiveField(2)
  final RobotLevel level;
  
  @HiveField(3)
  final double initialInvestment;
  
  @HiveField(4)
  final double dailyReturnRate;
  
  @HiveField(5)
  final DateTime purchaseDate;
  
  @HiveField(6)
  double currentValue;
  
  @HiveField(7)
  DateTime lastCollectionDate;
  
  @HiveField(8)
  final int processingPower; // Poder de processamento (1-100)
  
  @HiveField(9)
  final double energyConsumption; // Consumo energético
  
  @HiveField(10)
  final double maintenanceFee; // Taxa de manutenção diária

  @HiveField(11)
  bool isActive; // Status do robô (ativo/inativo)

  @HiveField(12)
  List<DailyProfit> dailyProfits; // Histórico de lucros diários

  RobotModel({
    required this.id,
    required this.name,
    required this.level,
    required this.initialInvestment,
    required this.dailyReturnRate,
    required this.processingPower,
    required this.energyConsumption,
    required this.maintenanceFee,
    this.isActive = true, // Por padrão, robôs começam ativos
    this.dailyProfits = const [], // Lista vazia por padrão
    DateTime? purchaseDate,
  })  : purchaseDate = purchaseDate ?? DateTime.now(),
        currentValue = initialInvestment,
        lastCollectionDate = purchaseDate ?? DateTime.now();

  // Métodos de negócio
  double calculateDailyEarnings() {
    return currentValue * dailyReturnRate;
  }

  // Getter para ganhos diários
  double get dailyEarnings {
    return currentValue * dailyReturnRate;
  }

  double calculateMaintenanceCost() {
    return maintenanceFee;
  }

  double calculateNetEarnings() {
    return calculateDailyEarnings() - calculateMaintenanceCost();
  }

  void collectEarnings() {
    final earnings = calculateNetEarnings();
    currentValue += earnings;
    lastCollectionDate = DateTime.now();
  }

  double getTotalEarnings() {
    return currentValue - initialInvestment;
  }

  int getDaysOwned() {
    return DateTime.now().difference(purchaseDate).inDays;
  }

  double getEfficiencyScore() {
    // Quanto maior o score, melhor a eficiência (mais lucro, menos consumo)
    return (calculateNetEarnings() * processingPower) / energyConsumption;
  }

  String getLevelDescription() {
    switch (level) {
      case RobotLevel.S:
        return 'Nível Superior - Alta performance';
      case RobotLevel.A:
        return 'Nível Avançado - Boa performance';
      case RobotLevel.B:
        return 'Nível Básico - Performance padrão';
    }
  }

  double getLevelMultiplier() {
    switch (level) {
      case RobotLevel.S:
        return 1.5;
      case RobotLevel.A:
        return 1.2;
      case RobotLevel.B:
        return 1.0;
    }
  }

  // Factory methods para robôs pré-definidos inspirados na Topcomputing
  factory RobotModel.tc990() {
    return RobotModel(
      id: 'tc990_${DateTime.now().millisecondsSinceEpoch}',
      name: 'TC990 - Nível S',
      level: RobotLevel.S,
      initialInvestment: 1800.0,
      dailyReturnRate: 0.08, // 8% ao dia
      processingPower: 95,
      energyConsumption: 8.5,
      maintenanceFee: 15.0,
    );
  }

  factory RobotModel.tc880() {
    return RobotModel(
      id: 'tc880_${DateTime.now().millisecondsSinceEpoch}',
      name: 'TC880 - Nível A',
      level: RobotLevel.A,
      initialInvestment: 1200.0,
      dailyReturnRate: 0.06, // 6% ao dia
      processingPower: 80,
      energyConsumption: 6.0,
      maintenanceFee: 10.0,
    );
  }

  factory RobotModel.tc760() {
    return RobotModel(
      id: 'tc760_${DateTime.now().millisecondsSinceEpoch}',
      name: 'TC760 - Nível B',
      level: RobotLevel.B,
      initialInvestment: 720.0,
      dailyReturnRate: 0.04, // 4% ao dia
      processingPower: 65,
      energyConsumption: 4.5,
      maintenanceFee: 7.0,
    );
  }

  // Conversão para mapa para serialização
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'level': level.index,
      'initialInvestment': initialInvestment,
      'dailyReturnRate': dailyReturnRate,
      'purchaseDate': purchaseDate.millisecondsSinceEpoch,
      'currentValue': currentValue,
      'lastCollectionDate': lastCollectionDate.millisecondsSinceEpoch,
      'processingPower': processingPower,
      'energyConsumption': energyConsumption,
      'maintenanceFee': maintenanceFee,
      'isActive': isActive,
    };
  }

  factory RobotModel.fromMap(Map<String, dynamic> map) {
    return RobotModel(
      id: map['id'],
      name: map['name'],
      level: RobotLevel.values[map['level']],
      initialInvestment: map['initialInvestment'],
      dailyReturnRate: map['dailyReturnRate'],
      processingPower: map['processingPower'],
      energyConsumption: map['energyConsumption'],
      maintenanceFee: map['maintenanceFee'],
      isActive: map['isActive'] ?? true, // Default para true se não existir
      purchaseDate: DateTime.fromMillisecondsSinceEpoch(map['purchaseDate']),
    )
      ..currentValue = map['currentValue']
      ..lastCollectionDate = DateTime.fromMillisecondsSinceEpoch(map['lastCollectionDate']);
  }

  // Método fromJson para compatibilidade com o serviço
  factory RobotModel.fromJson(Map<String, dynamic> json) {
    return RobotModel.fromMap(json);
  }

  // Método para upgrade de robô
  RobotModel upgradeTo(RobotLevel newLevel) {
    final newRobot = RobotModel(
      id: 'upgraded_${DateTime.now().millisecondsSinceEpoch}',
      name: '${name.split(" - ")[0]} - Nível ${newLevel.name}',
      level: newLevel,
      initialInvestment: currentValue, // Usa o valor atual como novo investimento
      dailyReturnRate: _getReturnRateForLevel(newLevel),
      processingPower: _getProcessingPowerForLevel(newLevel),
      energyConsumption: _getEnergyConsumptionForLevel(newLevel),
      maintenanceFee: _getMaintenanceFeeForLevel(newLevel),
    );
    
    return newRobot;
  }

  double _getReturnRateForLevel(RobotLevel level) {
    switch (level) {
      case RobotLevel.S:
        return 0.08;
      case RobotLevel.A:
        return 0.06;
      case RobotLevel.B:
        return 0.04;
    }
  }

  int _getProcessingPowerForLevel(RobotLevel level) {
    switch (level) {
      case RobotLevel.S:
        return 95;
      case RobotLevel.A:
        return 80;
      case RobotLevel.B:
        return 65;
    }
  }

  double _getEnergyConsumptionForLevel(RobotLevel level) {
    switch (level) {
      case RobotLevel.S:
        return 8.5;
      case RobotLevel.A:
        return 6.0;
      case RobotLevel.B:
        return 4.5;
    }
  }

  double _getMaintenanceFeeForLevel(RobotLevel level) {
    switch (level) {
      case RobotLevel.S:
        return 15.0;
      case RobotLevel.A:
        return 10.0;
      case RobotLevel.B:
        return 7.0;
    }
  }

  // Método copyWith para criar cópias modificadas
  RobotModel copyWith({
    String? id,
    String? name,
    RobotLevel? level,
    double? initialInvestment,
    double? dailyReturnRate,
    int? processingPower,
    double? energyConsumption,
    double? maintenanceFee,
    bool? isActive,
    DateTime? purchaseDate,
    double? currentValue,
    DateTime? lastCollectionDate,
  }) {
    return RobotModel(
      id: id ?? this.id,
      name: name ?? this.name,
      level: level ?? this.level,
      initialInvestment: initialInvestment ?? this.initialInvestment,
      dailyReturnRate: dailyReturnRate ?? this.dailyReturnRate,
      processingPower: processingPower ?? this.processingPower,
      energyConsumption: energyConsumption ?? this.energyConsumption,
      maintenanceFee: maintenanceFee ?? this.maintenanceFee,
      isActive: isActive ?? this.isActive,
      purchaseDate: purchaseDate ?? this.purchaseDate,
    )
      ..currentValue = currentValue ?? this.currentValue
      ..lastCollectionDate = lastCollectionDate ?? this.lastCollectionDate;
  }
}