import 'package:compostos/models/robot_model.dart';

class RobotMapper {
  /// Converte dados da API backend para RobotModel do frontend
  static RobotModel fromApiData(Map<String, dynamic> apiData) {
    // Mapear campos da API para o modelo do frontend
    final robotLevel = _mapRiskLevelToRobotLevel(apiData['riskLevel'] ?? 'medium');
    
    return RobotModel(
      id: apiData['_id']?.toString() ?? '',
      name: apiData['name'] ?? 'Robô Sem Nome',
      level: robotLevel,
      initialInvestment: _calculateInitialInvestment(apiData),
      dailyReturnRate: (apiData['dailyProfit'] ?? 0.0) / 100.0, // Converte % para decimal
      processingPower: _mapRiskLevelToProcessingPower(apiData['riskLevel'] ?? 'medium'),
      energyConsumption: _calculateEnergyConsumption(apiData),
      maintenanceFee: _calculateMaintenanceFee(apiData),
      isActive: apiData['status'] == 'active',
      purchaseDate: DateTime.now(), // Será atualizado quando for um robô do usuário
    );
  }

  /// Mapeia nível de risco para enum RobotLevel
  static RobotLevel _mapRiskLevelToRobotLevel(String riskLevel) {
    switch (riskLevel) {
      case 'high':
        return RobotLevel.S;
      case 'medium':
        return RobotLevel.A;
      case 'low':
      default:
        return RobotLevel.B;
    }
  }

  /// Mapeia nível de risco para poder de processamento (1-100)
  static int _mapRiskLevelToProcessingPower(String riskLevel) {
    switch (riskLevel) {
      case 'high':
        return 95; // Alto risco = alta performance
      case 'medium':
        return 80; // Médio risco = média performance
      case 'low':
      default:
        return 65; // Baixo risco = baixa performance
    }
  }

  /// Calcula investimento inicial baseado nos limites da API
  static double _calculateInitialInvestment(Map<String, dynamic> apiData) {
    final minInvestment = (apiData['minInvestment'] ?? 50.0).toDouble();
    final maxInvestment = (apiData['maxInvestment'] ?? 1000.0).toDouble();
    
    // Usa o ponto médio entre min e max como investimento inicial padrão
    return (minInvestment + maxInvestment) / 2;
  }

  /// Calcula consumo energético baseado no risco e lucro diário
  static double _calculateEnergyConsumption(Map<String, dynamic> apiData) {
    final dailyProfit = (apiData['dailyProfit'] ?? 0.0).toDouble();
    final riskLevel = apiData['riskLevel'] ?? 'medium';
    
    switch (riskLevel) {
      case 'high':
        return 8.5 + (dailyProfit / 20); // Consumo base + ajuste por lucro
      case 'medium':
        return 6.0 + (dailyProfit / 30);
      case 'low':
      default:
        return 4.5 + (dailyProfit / 40);
    }
  }

  /// Calcula taxa de manutenção baseada no investimento e risco
  static double _calculateMaintenanceFee(Map<String, dynamic> apiData) {
    final minInvestment = (apiData['minInvestment'] ?? 50.0).toDouble();
    final riskLevel = apiData['riskLevel'] ?? 'medium';
    
    switch (riskLevel) {
      case 'high':
        return minInvestment * 0.008; // 0.8% do investimento mínimo
      case 'medium':
        return minInvestment * 0.006; // 0.6% do investimento mínimo
      case 'low':
      default:
        return minInvestment * 0.004; // 0.4% do investimento mínimo
    }
  }

  /// Método para converter robôs do usuário (com dados de investimento)
  static RobotModel fromUserInvestmentData(Map<String, dynamic> investmentData) {
    final robotData = investmentData['robot'] ?? {};
    final investmentInfo = investmentData;
    
    final robot = fromApiData(robotData);
    
    // Atualiza com dados específicos do investimento
    return robot.copyWith(
      initialInvestment: (investmentInfo['amount'] ?? 0.0).toDouble(),
      purchaseDate: DateTime.parse(investmentInfo['createdAt'] ?? DateTime.now().toIso8601String()),
      currentValue: _calculateCurrentValue(investmentInfo, robot),
    );
  }

  /// Calcula valor atual baseado no tempo e lucro diário
  static double _calculateCurrentValue(Map<String, dynamic> investmentInfo, RobotModel robot) {
    final amount = (investmentInfo['amount'] ?? 0.0).toDouble();
    final createdAt = DateTime.parse(investmentInfo['createdAt'] ?? DateTime.now().toIso8601String());
    
    final daysOwned = DateTime.now().difference(createdAt).inDays;
    final dailyEarnings = amount * robot.dailyReturnRate;
    
    // Valor atual = investimento inicial + (lucro diário * dias) - (manutenção * dias)
    return amount + (dailyEarnings * daysOwned) - (robot.maintenanceFee * daysOwned);
  }

  /// Converte lista de dados da API para lista de RobotModel
  static List<RobotModel> listFromApiData(List<dynamic> apiDataList) {
    return apiDataList.map((data) => fromApiData(data as Map<String, dynamic>)).toList();
  }

  /// Converte lista de investimentos do usuário para lista de RobotModel
  static List<RobotModel> listFromUserInvestments(List<dynamic> investmentDataList) {
    return investmentDataList
        .map((data) => fromUserInvestmentData(data as Map<String, dynamic>))
        .toList();
  }
}