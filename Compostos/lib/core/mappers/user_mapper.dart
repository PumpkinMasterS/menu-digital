import 'package:compostos/models/user_model.dart';

class UserMapper {
  /// Converte dados da API backend para UserModel do frontend
  static UserModel fromApiData(Map<String, dynamic> apiData) {
    return UserModel(
      id: apiData['_id']?.toString() ?? apiData['id']?.toString() ?? '',
      email: apiData['email']?.toString() ?? '',
      name: apiData['name']?.toString() ?? 'Usuário',
      balance: (apiData['balance'] is int ? apiData['balance'].toDouble() : apiData['balance'] ?? 0.0),
      registrationDate: _parseDateTime(apiData['createdAt'] ?? apiData['registrationDate']),
      lastLogin: _parseDateTime(apiData['lastLogin']),
      referralCodes: _parseReferralCodes(apiData),
      referralCode: apiData['referralCode']?.toString(),
      dailyClicks: apiData['dailyClicks'] ?? 0,
      lastClickDate: _parseDateTime(apiData['lastClickDate']),
      phone: apiData['phone']?.toString(),
      address: apiData['address']?.toString(),
      isActive: apiData['isActive'] ?? true,
      totalProfit: (apiData['totalProfit'] is int ? apiData['totalProfit'].toDouble() : apiData['totalProfit'] ?? 0.0),
      role: apiData['role']?.toString() ?? 'user',
      cpf: apiData['cpf']?.toString(),
      createdAt: _parseDateTime(apiData['createdAt']),
      totalInvested: (apiData['totalInvested'] is int ? apiData['totalInvested'].toDouble() : apiData['totalInvested'] ?? 0.0),
    );
  }
  
  /// Converte dados de estatísticas da API para formato do frontend
  static Map<String, dynamic> statsFromApiData(Map<String, dynamic> apiData) {
    return {
      'balance': (apiData['balance'] is int ? apiData['balance'].toDouble() : apiData['balance'] ?? 0.0),
      'totalInvested': (apiData['totalInvested'] is int ? apiData['totalInvested'].toDouble() : apiData['totalInvested'] ?? 0.0),
      'totalEarned': (apiData['totalEarned'] is int ? apiData['totalEarned'].toDouble() : apiData['totalEarned'] ?? 0.0),
      'totalProfit': (apiData['totalProfit'] is int ? apiData['totalProfit'].toDouble() : apiData['totalProfit'] ?? 0.0),
      'activeInvestments': apiData['activeInvestments'] ?? 0,
      'totalInvestments': apiData['totalInvestments'] ?? 0,
      'totalTaskRewards': (apiData['totalTaskRewards'] is int ? apiData['totalTaskRewards'].toDouble() : apiData['totalTaskRewards'] ?? 0.0),
      'totalTasksCompleted': apiData['totalTasksCompleted'] ?? 0,
      'referralCount': apiData['referralCount'] ?? 0,
    };
  }
  
  /// Converte dados de transações da API para formato do frontend
  static List<Map<String, dynamic>> transactionsFromApiData(List<dynamic> apiDataList) {
    return apiDataList.map((transaction) {
      return {
        'id': transaction['id']?.toString() ?? '',
        'type': transaction['type']?.toString() ?? '',
        'amount': (transaction['amount'] is int ? transaction['amount'].toDouble() : transaction['amount'] ?? 0.0),
        'description': transaction['description']?.toString() ?? '',
        'date': _parseDateTime(transaction['date']),
        'status': transaction['status']?.toString() ?? '',
      };
    }).toList();
  }
  
  /// Converte dados de referrals da API para formato do frontend
  static List<Map<String, dynamic>> referralsFromApiData(List<dynamic> apiDataList) {
    return apiDataList.map((referral) {
      return {
        'name': referral['name']?.toString() ?? '',
        'email': referral['email']?.toString() ?? '',
        'createdAt': _parseDateTime(referral['createdAt']),
        'balance': (referral['balance'] is int ? referral['balance'].toDouble() : referral['balance'] ?? 0.0),
      };
    }).toList();
  }
  
  /// Parse seguro de datas
  static DateTime _parseDateTime(dynamic dateValue) {
    if (dateValue == null) return DateTime.now();
    try {
      if (dateValue is DateTime) return dateValue;
      if (dateValue is String) return DateTime.parse(dateValue);
      if (dateValue is int) return DateTime.fromMillisecondsSinceEpoch(dateValue);
      return DateTime.now();
    } catch (e) {
      return DateTime.now();
    }
  }
  
  /// Parse seguro de códigos de referral
  static List<String> _parseReferralCodes(Map<String, dynamic> apiData) {
    try {
      if (apiData['referralCodes'] is List) {
        return (apiData['referralCodes'] as List).map((code) => code.toString()).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }
}