import 'package:flutter/material.dart';
import 'package:compostos/models/commission_model.dart';

class CommissionFilters extends StatefulWidget {
  final String? selectedStatus;
  final String? selectedLevel;
  final String? selectedSourceType;
  final DateTime? startDate;
  final DateTime? endDate;
  final Function({
    String? status,
    String? level,
    String? sourceType,
    DateTime? startDate,
    DateTime? endDate,
  }) onFiltersChanged;

  const CommissionFilters({
    super.key,
    this.selectedStatus,
    this.selectedLevel,
    this.selectedSourceType,
    this.startDate,
    this.endDate,
    required this.onFiltersChanged,
  });

  @override
  State<CommissionFilters> createState() => _CommissionFiltersState();
}

class _CommissionFiltersState extends State<CommissionFilters> {
  String? _selectedStatus;
  String? _selectedLevel;
  String? _selectedSourceType;
  DateTime? _startDate;
  DateTime? _endDate;

  @override
  void initState() {
    super.initState();
    _selectedStatus = widget.selectedStatus;
    _selectedLevel = widget.selectedLevel;
    _selectedSourceType = widget.selectedSourceType;
    _startDate = widget.startDate;
    _endDate = widget.endDate;
  }

  void _applyFilters() {
    widget.onFiltersChanged(
      status: _selectedStatus,
      level: _selectedLevel,
      sourceType: _selectedSourceType,
      startDate: _startDate,
      endDate: _endDate,
    );
  }

  void _clearFilters() {
    setState(() {
      _selectedStatus = null;
      _selectedLevel = null;
      _selectedSourceType = null;
      _startDate = null;
      _endDate = null;
    });
    widget.onFiltersChanged(
      status: null,
      level: null,
      sourceType: null,
      startDate: null,
      endDate: null,
    );
  }

  Future<void> _selectDate(BuildContext context, bool isStartDate) async {
    final initialDate = isStartDate ? _startDate : _endDate;
    final firstDate = DateTime(2020);
    final lastDate = DateTime.now();

    final pickedDate = await showDatePicker(
      context: context,
      initialDate: initialDate ?? DateTime.now(),
      firstDate: firstDate,
      lastDate: lastDate,
    );

    if (pickedDate != null) {
      setState(() {
        if (isStartDate) {
          _startDate = pickedDate;
        } else {
          _endDate = pickedDate;
        }
      });
      _applyFilters();
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasActiveFilters = _selectedStatus != null ||
        _selectedLevel != null ||
        _selectedSourceType != null ||
        _startDate != null ||
        _endDate != null;

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Filtros',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildDropdown(
                    'Status',
                    _selectedStatus,
                    CommissionStatus.values.map((e) => e.name).toList(),
                    (value) {
                      setState(() {
                        _selectedStatus = value;
                      });
                      _applyFilters();
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildDropdown(
                    'Nível',
                    _selectedLevel,
                    CommissionLevel.values.map((e) => e.name).toList(),
                    (value) {
                      setState(() {
                        _selectedLevel = value;
                      });
                      _applyFilters();
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _buildDropdown(
                    'Origem',
                    _selectedSourceType,
                    CommissionSourceType.values.map((e) => e.name).toList(),
                    (value) {
                      setState(() {
                        _selectedSourceType = value;
                      });
                      _applyFilters();
                    },
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildDateField('Data Início', _startDate, true),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _buildDateField('Data Fim', _endDate, false),
                ),
                const SizedBox(width: 8),
                if (hasActiveFilters)
                  Expanded(
                    child: ElevatedButton(
                      onPressed: _clearFilters,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.grey,
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('Limpar Filtros'),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDropdown(
    String label,
    String? value,
    List<String> items,
    Function(String?) onChanged,
  ) {
    return DropdownButtonFormField<String>(
      value: value,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      ),
      items: [
        DropdownMenuItem<String>(
          value: null,
          child: Text('Todos $label'),
        ),
        ...items.map((item) {
          return DropdownMenuItem<String>(
            value: item,
            child: Text(item),
          );
        }).toList(),
      ],
      onChanged: onChanged,
    );
  }

  Widget _buildDateField(String label, DateTime? date, bool isStartDate) {
    return TextFormField(
      readOnly: true,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        suffixIcon: IconButton(
          icon: const Icon(Icons.calendar_today),
          onPressed: () => _selectDate(context, isStartDate),
        ),
      ),
      controller: TextEditingController(
        text: date != null
            ? '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}'
            : '',
      ),
    );
  }
}