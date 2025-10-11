import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/providers/report_provider.dart';
import 'package:compostos/widgets/admin/performance_report_widget.dart';
import 'package:compostos/widgets/admin/users_report_widget.dart';
import 'package:compostos/widgets/admin/financial_report_widget.dart';
import 'package:compostos/widgets/admin/report_filter_widget.dart';

class AdvancedReportsScreen extends ConsumerStatefulWidget {
  const AdvancedReportsScreen({super.key});

  @override
  ConsumerState<AdvancedReportsScreen> createState() => _AdvancedReportsScreenState();
}

class _AdvancedReportsScreenState extends ConsumerState<AdvancedReportsScreen> {
  final ScrollController _scrollController = ScrollController();
  int _currentTabIndex = 0;
  
  final List<String> _tabTitles = [
    'Performance',
    'Usuários',
    'Financeiro',
  ];

  @override
  void initState() {
    super.initState();
    _loadInitialData();
  }

  void _loadInitialData() {
    final reportNotifier = ref.read(reportNotifierProvider.notifier);
    
    // Carregar dados iniciais para a primeira aba
    WidgetsBinding.instance.addPostFrameCallback((_) {
      reportNotifier.loadPerformanceReport();
    });
  }

  void _onTabChanged(int index) {
    setState(() {
      _currentTabIndex = index;
    });
    
    final reportNotifier = ref.read(reportNotifierProvider.notifier);
    
    // Carregar dados específicos da aba selecionada
    switch (index) {
      case 0:
        if (ref.read(reportNotifierProvider).performanceReport == null) {
          reportNotifier.loadPerformanceReport();
        }
        break;
      case 1:
        if (ref.read(reportNotifierProvider).usersReport == null) {
          reportNotifier.loadUsersReport();
        }
        break;
      case 2:
        if (ref.read(reportNotifierProvider).financialReport == null) {
          reportNotifier.loadFinancialReport();
        }
        break;
    }
  }

  Widget _buildCurrentTab() {
    switch (_currentTabIndex) {
      case 0:
        return const PerformanceReportWidget();
      case 1:
        return const UsersReportWidget();
      case 2:
        return const FinancialReportWidget();
      default:
        return const SizedBox();
    }
  }

  @override
  Widget build(BuildContext context) {
    final reportState = ref.watch(reportNotifierProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Relatórios Avançados'),
        actions: [
          if (_currentTabIndex == 0)
            IconButton(
              icon: const Icon(Icons.filter_alt),
              onPressed: () {
                showModalBottomSheet(
                  context: context,
                  builder: (context) => ReportFilterWidget(
                    onFilterApplied: (startDate, endDate, groupBy) {
                      ref.read(reportNotifierProvider.notifier).loadPerformanceReport(
                        startDate: startDate,
                        endDate: endDate,
                        groupBy: groupBy,
                      );
                    },
                  ),
                );
              },
            ),
          if (reportState.isLoading)
            const Padding(
              padding: EdgeInsets.all(8.0),
              child: CircularProgressIndicator(),
            ),
        ],
      ),
      body: Column(
        children: [
          // Tabs
          Container(
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              border: Border.bottom(
                borderSide: BorderSide(
                  color: Theme.of(context).dividerColor,
                  width: 1,
                ),
              ),
            ),
            child: Row(
              children: _tabTitles.asMap().entries.map((entry) {
                final index = entry.key;
                final title = entry.value;
                final isSelected = _currentTabIndex == index;
                
                return Expanded(
                  child: InkWell(
                    onTap: () => _onTabChanged(index),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: isSelected 
                                ? Theme.of(context).primaryColor 
                                : Colors.transparent,
                            width: 2,
                          ),
                        ),
                      ),
                      child: Text(
                        title,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          color: isSelected 
                              ? Theme.of(context).primaryColor 
                              : Theme.of(context).textTheme.bodyLarge?.color,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          
          // Conteúdo da tab
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                final notifier = ref.read(reportNotifierProvider.notifier);
                switch (_currentTabIndex) {
                  case 0:
                    await notifier.loadPerformanceReport();
                    break;
                  case 1:
                    await notifier.loadUsersReport();
                    break;
                  case 2:
                    await notifier.loadFinancialReport();
                    break;
                }
              },
              child: _buildCurrentTab(),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }
}