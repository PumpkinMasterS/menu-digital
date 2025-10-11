class DailyProfit {
  final String date;
  final double amount;
  final String robotId;
  final String robotName;

  DailyProfit({
    required this.date,
    required this.amount,
    required this.robotId,
    required this.robotName,
  });

  Map<String, dynamic> toMap() {
    return {
      'date': date,
      'amount': amount,
      'robotId': robotId,
      'robotName': robotName,
    };
  }

  factory DailyProfit.fromMap(Map<String, dynamic> map) {
    return DailyProfit(
      date: map['date'],
      amount: map['amount'],
      robotId: map['robotId'],
      robotName: map['robotName'],
    );
  }
}