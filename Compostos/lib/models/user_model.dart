import 'package:hive/hive.dart';

part 'user_model.g.dart';

@HiveType(typeId: 0)
class UserModel {
  @HiveField(0)
  final String id;
  
  @HiveField(1)
  final String email;
  
  @HiveField(2)
  final String name;
  
  @HiveField(3)
  double balance;
  
  @HiveField(4)
  final DateTime registrationDate;
  
  @HiveField(5)
  DateTime lastLogin;
  
  @HiveField(6)
  final List<String> referralCodes;
  
  @HiveField(7)
  final String? referralCode; // Código de quem indicou
  
  @HiveField(8)
  int dailyClicks;
  
  @HiveField(9)
  DateTime lastClickDate;

  @HiveField(10)
  String? phone;

  @HiveField(11)
  String? address;

  @HiveField(12)
  bool isActive;

  @HiveField(13)
  double totalProfit;

  @HiveField(14)
  String role;

  @HiveField(15)
  String? cpf;

  @HiveField(16)
  DateTime? createdAt;

  @HiveField(17)
  double totalInvested;

  UserModel({
    required this.id,
    required this.email,
    required this.name,
    this.balance = 100.0, // Saldo inicial em euros
    required this.registrationDate,
    required this.lastLogin,
    this.referralCodes = const [],
    this.referralCode,
    this.dailyClicks = 0,
    required this.lastClickDate,
    this.phone,
    this.address,
    this.isActive = true,
    this.totalProfit = 0.0,
    this.role = 'user',
    this.cpf,
    this.createdAt,
    this.totalInvested = 0.0,
  });

  // Método para adicionar saldo
  void addBalance(double amount) {
    balance += amount;
  }

  // Método para verificar se pode clicar hoje
  bool canClickToday() {
    final now = DateTime.now();
    if (lastClickDate.year != now.year ||
        lastClickDate.month != now.month ||
        lastClickDate.day != now.day) {
      dailyClicks = 0;
      return true;
    }
    return dailyClicks < 3;
  }

  // Método para registrar clique
  void registerClick() {
    if (canClickToday()) {
      dailyClicks++;
      lastClickDate = DateTime.now();
    }
  }

  // Método para adicionar referral
  void addReferral(String referralId) {
    referralCodes.add(referralId);
  }

  // Converter para mapa (para persistência)
  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'balance': balance,
      'registrationDate': registrationDate.toIso8601String(),
      'lastLogin': lastLogin.toIso8601String(),
      'referralCodes': referralCodes,
      'referralCode': referralCode,
      'dailyClicks': dailyClicks,
      'lastClickDate': lastClickDate.toIso8601String(),
      'phone': phone,
      'address': address,
      'isActive': isActive,
      'totalProfit': totalProfit,
      'role': role,
      'cpf': cpf,
      'createdAt': createdAt?.toIso8601String(),
      'totalInvested': totalInvested,
    };
  }

  // Criar a partir de mapa
  factory UserModel.fromMap(Map<String, dynamic> map) {
    return UserModel(
      id: map['id'],
      email: map['email'],
      name: map['name'],
      balance: map['balance'],
      registrationDate: DateTime.parse(map['registrationDate']),
      lastLogin: DateTime.parse(map['lastLogin']),
      referralCodes: List<String>.from(map['referralCodes']),
      referralCode: map['referralCode'],
      dailyClicks: map['dailyClicks'],
      lastClickDate: DateTime.parse(map['lastClickDate']),
      phone: map['phone'],
      address: map['address'],
      isActive: map['isActive'] ?? true,
      totalProfit: (map['totalProfit'] is int ? map['totalProfit'].toDouble() : map['totalProfit'] ?? 0.0),
      role: map['role'] ?? 'user',
      cpf: map['cpf'],
      createdAt: map['createdAt'] != null ? DateTime.parse(map['createdAt']) : null,
      totalInvested: (map['totalInvested'] is int ? map['totalInvested'].toDouble() : map['totalInvested'] ?? 0.0),
    );
  }
  
  // Criar a partir de JSON (para API)
  factory UserModel.fromJson(Map<String, dynamic> json) {
    // Função auxiliar para garantir que campos obrigatórios não sejam null
    String _ensureString(dynamic value, String fallback) {
      if (value == null) return fallback;
      return value.toString();
    }

    // Função auxiliar para parsing seguro de datas
    DateTime _parseDateTime(dynamic value, DateTime fallback) {
      if (value == null) return fallback;
      try {
        return DateTime.parse(value.toString());
      } catch (e) {
        return fallback;
      }
    }

    final now = DateTime.now();
    
    return UserModel(
      id: _ensureString(json['_id'] ?? json['id'], 'unknown_id'),
      email: _ensureString(json['email'], 'unknown@email.com'),
      name: _ensureString(json['name'], 'Usuário'),
      balance: (json['balance'] is int ? json['balance'].toDouble() : json['balance'] ?? 0.0),
      registrationDate: _parseDateTime(json['registrationDate'] ?? json['createdAt'], now),
      lastLogin: _parseDateTime(json['lastLogin'], now),
      referralCodes: List<String>.from(json['referralCodes'] ?? []),
      referralCode: json['referralCode']?.toString(),
      dailyClicks: json['dailyClicks'] ?? 0,
      lastClickDate: _parseDateTime(json['lastClickDate'], now),
      phone: json['phone']?.toString(),
      address: json['address']?.toString(),
      isActive: json['isActive'] ?? true,
      totalProfit: (json['totalProfit'] is int ? json['totalProfit'].toDouble() : json['totalProfit'] ?? 0.0),
      role: _ensureString(json['role'], 'user'),
      cpf: json['cpf']?.toString(),
      createdAt: json['createdAt'] != null ? _parseDateTime(json['createdAt'], DateTime.now()) : null,
      totalInvested: (json['totalInvested'] is int ? json['totalInvested'].toDouble() : json['totalInvested'] ?? 0.0),
    );
  }

  // Método copyWith para criar cópias modificadas
  UserModel copyWith({
    String? id,
    String? email,
    String? name,
    double? balance,
    DateTime? registrationDate,
    DateTime? lastLogin,
    List<String>? referralCodes,
    String? referralCode,
    int? dailyClicks,
    DateTime? lastClickDate,
    String? phone,
    String? address,
    bool? isActive,
    double? totalProfit,
    String? role,
    String? cpf,
    DateTime? createdAt,
    double? totalInvested,
  }) {
    return UserModel(
      id: id ?? this.id,
      email: email ?? this.email,
      name: name ?? this.name,
      balance: balance ?? this.balance,
      registrationDate: registrationDate ?? this.registrationDate,
      lastLogin: lastLogin ?? this.lastLogin,
      referralCodes: referralCodes ?? this.referralCodes,
      referralCode: referralCode ?? this.referralCode,
      dailyClicks: dailyClicks ?? this.dailyClicks,
      lastClickDate: lastClickDate ?? this.lastClickDate,
      phone: phone ?? this.phone,
      address: address ?? this.address,
      isActive: isActive ?? this.isActive,
      totalProfit: totalProfit ?? this.totalProfit,
      role: role ?? this.role,
      cpf: cpf ?? this.cpf,
      createdAt: createdAt ?? this.createdAt,
      totalInvested: totalInvested ?? this.totalInvested,
    );
  }
}