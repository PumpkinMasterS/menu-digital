import 'package:json_annotation/json_annotation.dart';

part 'transaction_model.g.dart';

@JsonSerializable()
class TransactionModel {
  final String id;
  final String type;
  final double amount;
  final double fee;
  final double totalAmount;
  final String currency;
  final String? network;
  final String status;
  final String description;
  final String? fromAddress;
  final String? toAddress;
  final String? txHash;
  final int? blockNumber;
  final String? blockHash;
  final int confirmations;
  final DateTime createdAt;
  final DateTime? completedAt;
  final Map<String, dynamic>? metadata;

  TransactionModel({
    required this.id,
    required this.type,
    required this.amount,
    required this.fee,
    required this.totalAmount,
    required this.currency,
    this.network,
    required this.status,
    required this.description,
    this.fromAddress,
    this.toAddress,
    this.txHash,
    this.blockNumber,
    this.blockHash,
    this.confirmations = 0,
    required this.createdAt,
    this.completedAt,
    this.metadata,
  });

  factory TransactionModel.fromJson(Map<String, dynamic> json) =>
      _$TransactionModelFromJson(json);

  Map<String, dynamic> toJson() => _$TransactionModelToJson(this);

  bool get isDeposit => type == 'deposit';
  bool get isWithdrawal => type == 'withdrawal';
  bool get isInvestment => type == 'investment';
  bool get isProfit => type == 'profit';
  bool get isCommission => type == 'commission';
  
  bool get isCompleted => status == 'completed';
  bool get isPending => status == 'pending';
  bool get isProcessing => status == 'processing';
  bool get isFailed => status == 'failed';
  
  String get explorerUrl {
    if (txHash != null && network == 'BEP20') {
      return 'https://bscscan.com/tx/$txHash';
    }
    return metadata?['explorerUrl'];
  }
}