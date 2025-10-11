import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/providers/commission_provider.dart';
import 'package:compostos/models/commission_model.dart';
import 'package:compostos/widgets/commission_stats_card.dart';
import 'package:compostos/widgets/commission_list.dart';
import 'package:compostos/widgets/commission_filters.dart';

class CommissionsScreen extends ConsumerStatefulWidget {
  const CommissionsScreen({super.key});

  @override
  ConsumerState<CommissionsScreen> createState() => _CommissionsScreenState();
}

class _CommissionsScreenState extends ConsumerState<CommissionsScreen> {
  String? _selectedStatus;
  String? _selectedLevel;
  String? _selectedSourceType;
  DateTime? _startDate;
  DateTime? _endDate;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadCommissions();
    });
  }

  Future<void> _loadCommissions() async {
    await ref.read(commissionProvider.notifier).loadUserCommissions(
      status: _selectedStatus,
      level: _selectedLevel,
      sourceType: _selectedSourceType,
      startDate: _startDate,
      endDate: _endDate,
    );
    await ref.read(commissionProvider.notifier).loadCommissionStats();
  }

  void _handleFiltersChanged({
    String? status,
    String? level,
    String? sourceType,
    DateTime? startDate,
    DateTime? endDate,
  }) {
    setState(() {
      _selectedStatus = status;
      _selectedLevel = level;
      _selectedSourceType = sourceType;
      _startDate = startDate;
      _endDate = endDate;
    });
    _loadCommissions();
  }

  Future<void> _refreshCommissions() async {
    await _loadCommissions();
  }

  @override
  Widget build(BuildContext context) {
    final commissionState = ref.watch(commissionProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Minhas Comissões'),
        backgroundColor: const Color(0xFFFF6B35),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshCommissions,
            tooltip: 'Atualizar comissões',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refreshCommissions,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Filtros
              CommissionFilters(
                selectedStatus: _selectedStatus,
                selectedLevel: _selectedLevel,
                selectedSourceType: _selectedSourceType,
                startDate: _startDate,
                endDate: _endDate,
                onFiltersChanged: _handleFiltersChanged,
              ),
              const SizedBox(height: 24),

              // Estatísticas
              if (commissionState.stats.isNotEmpty)
                CommissionStatsCard(stats: commissionState.stats),
              const SizedBox(height: 24),

              // Lista de comissões
              if (commissionState.isLoading)
                const Center(child: CircularProgressIndicator())
              else if (commissionState.error != null)
                _buildErrorWidget(commissionState.error!)
              else if (commissionState.commissions.isEmpty)
                _buildEmptyWidget()
              else
                CommissionList(commissions: commissionState.commissions),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildErrorWidget(String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          Text(
            'Erro ao carregar comissões',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            error,
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey[600]),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _refreshCommissions,
            child: const Text('Tentar Novamente'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyWidget() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.attach_money, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          const Text(
            'Nenhuma comissão encontrada',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            _selectedStatus != null || _selectedLevel != null || _selectedSourceType != null
                ? 'Tente ajustar os filtros'
                : 'Suas comissões aparecerão aqui quando estiverem disponíveis',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }
}