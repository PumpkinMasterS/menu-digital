import 'package:flutter/material.dart';

class ReportFilterWidget extends StatefulWidget {
  final Function(DateTime?, DateTime?, String) onFilterApplied;

  const ReportFilterWidget({
    super.key,
    required this.onFilterApplied,
  });

  @override
  State<ReportFilterWidget> createState() => _ReportFilterWidgetState();
}

class _ReportFilterWidgetState extends State<ReportFilterWidget> {
  DateTime? _startDate;
  DateTime? _endDate;
  String _groupBy = 'day';

  Future<void> _selectStartDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _startDate ?? DateTime.now().subtract(const Duration(days: 30)),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() => _startDate = picked);
    }
  }

  Future<void> _selectEndDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _endDate ?? DateTime.now(),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() => _endDate = picked);
    }
  }

  void _applyFilters() {
    widget.onFilterApplied(_startDate, _endDate, _groupBy);
    Navigator.of(context).pop();
  }

  void _clearFilters() {
    setState(() {
      _startDate = null;
      _endDate = null;
      _groupBy = 'day';
    });
    widget.onFilterApplied(null, null, 'day');
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Filtrar Relatório',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          
          // Data Inicial
          Row(
            children: [
              const Text('Data Inicial:'),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _selectStartDate(context),
                  child: Text(
                    _startDate != null
                        ? '${_startDate!.day}/${_startDate!.month}/${_startDate!.year}'
                        : 'Selecionar data',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          
          // Data Final
          Row(
            children: [
              const Text('Data Final:'),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _selectEndDate(context),
                  child: Text(
                    _endDate != null
                        ? '${_endDate!.day}/${_endDate!.month}/${_endDate!.year}'
                        : 'Selecionar data',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          
          // Agrupamento
          Row(
            children: [
              const Text('Agrupar por:'),
              const SizedBox(width: 8),
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _groupBy,
                  items: const [
                    DropdownMenuItem(value: 'day', child: Text('Dia')),
                    DropdownMenuItem(value: 'month', child: Text('Mês')),
                  ],
                  onChanged: (value) {
                    setState(() => _groupBy = value!);
                  },
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  ),
                ),
              ),
            ],
          ),
          
          const SizedBox(height: 24),
          
          // Botões
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _clearFilters,
                  child: const Text('Limpar'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _applyFilters,
                  child: const Text('Aplicar'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}