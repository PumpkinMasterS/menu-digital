class TokenModel {
  final String symbol;
  final String address;
  final int decimals;
  final double withdrawalFee;

  TokenModel({
    required this.symbol,
    required this.address,
    required this.decimals,
    required this.withdrawalFee,
  });

  factory TokenModel.fromJson(Map<String, dynamic> json) {
    return TokenModel(
      symbol: json['symbol'] ?? '',
      address: json['address'] ?? '',
      decimals: json['decimals'] ?? 18,
      withdrawalFee: (json['withdrawalFee'] ?? 0.0).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'symbol': symbol,
      'address': address,
      'decimals': decimals,
      'withdrawalFee': withdrawalFee,
    };
  }

  @override
  String toString() {
    return symbol;
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is TokenModel && other.symbol == symbol;
  }

  @override
  int get hashCode => symbol.hashCode;
}

