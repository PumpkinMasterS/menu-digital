import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/providers/cashback_provider.dart';
import 'package:compostos/core/services/cashback_api_service.dart';

class CashbackCalculationWidget extends ConsumerStatefulWidget {
  final double investmentAmount;
  final String robotType;
  final Function(double cashbackAmount) onCashbackCalculated;

  const CashbackCalculationWidget({
    super.key,
    required this.investmentAmount,
    required this.robotType,
    required this.onCashbackCalculated,
  });

  @override
  ConsumerState<CashbackCalculationWidget> createState() => _CashbackCalculationWidgetState();
}

class _CashbackCalculationWidgetState extends ConsumerState<CashbackCalculationWidget> {
  bool _isLoading = false;
  double? _cashbackAmount;
  double? _cashbackRate;
  String? _cashbackTier;

  @override
  void initState() {
    super.initState();
    _calculateCashback();
  }

  Future<void> _calculateCashback() async {
    setState(() => _isLoading = true);
    
    try {
      final cashbackNotifier = ref.read(cashbackNotifierProvider.notifier);
      final calculation = await cashbackNotifier.calculateCashback(
        widget.investmentAmount,
        widget.robotType,
      );

      if (calculation != null) {
        setState(() {
          _cashbackAmount = calculation.cashbackAmount;
          _cashbackRate = calculation.cashbackRate;
          _cashbackTier = calculation.tier;
          _isLoading = false;
        });

        widget.onCashbackCalculated(_cashbackAmount ?? 0);
      } else {
        setState(() => _isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Erro ao calcular cashback')),
          );
        }
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao calcular cashback: \$e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.green[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.green[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.redeem, size: 18, color: Colors.green),
              SizedBox(width: 8),
              Text(
                'Cashback Disponível',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.green,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          
          if (_isLoading)
            const Center(child: CircularProgressIndicator())
          else if (_cashbackAmount != null && _cashbackRate != null)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Nível: \$_cashbackTier',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  'Taxa: \${_cashbackRate!.toStringAsFixed(1)}%',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.green[700],
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Valor do Cashback: €\${_cashbackAmount!.toStringAsFixed(2)}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.green,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Você receberá €\${_cashbackAmount!.toStringAsFixed(2)} de volta após esta compra!',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.green[600],
                  ),
                ),
              ],
            )
          else
            const Text(
              'Calculando cashback...',
              style: TextStyle(color: Colors.grey),
            ),
        ],
      ),
    );
  }
}