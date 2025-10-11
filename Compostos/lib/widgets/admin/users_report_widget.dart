import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/providers/report_provider.dart';

class UsersReportWidget extends ConsumerWidget {
  const UsersReportWidget({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportState = ref.watch(reportNotifierProvider);
    final usersReport = reportState.usersReport;

    if (reportState.isLoading && usersReport == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (reportState.error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              'Erro: ${reportState.error!}',
              style: const TextStyle(color: Colors.red, fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => ref.read(reportNotifierProvider.notifier).loadUsersReport(),
              child: const Text('Tentar Novamente'),
            ),
          ],
        ),
      );
    }

    if (usersReport == null) {
      return const Center(
        child: Text(
          'Nenhum dado de usuários disponível',
          style: TextStyle(fontSize: 16, color: Colors.grey),
        ),
      );
    }

    return Column(
      children: [
        // Informações de paginação
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Total: ${usersReport.totalUsers} usuários',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              Text(
                'Página ${usersReport.currentPage} de ${usersReport.totalPages}',
                style: const TextStyle(color: Colors.grey),
              ),
            ],
          ),
        ),

        // Lista de usuários
        Expanded(
          child: ListView.builder(
            itemCount: usersReport.users.length,
            itemBuilder: (context, index) {
              final user = usersReport.users[index];
              return _buildUserCard(user);
            },
          ),
        ),

        // Controles de paginação
        if (usersReport.totalPages > 1)
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: usersReport.currentPage > 1
                      ? () => ref.read(reportNotifierProvider.notifier).loadUsersReport(
                            page: usersReport.currentPage - 1,
                          )
                      : null,
                ),
                Text(
                  '${usersReport.currentPage} / ${usersReport.totalPages}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.arrow_forward),
                  onPressed: usersReport.currentPage < usersReport.totalPages
                      ? () => ref.read(reportNotifierProvider.notifier).loadUsersReport(
                            page: usersReport.currentPage + 1,
                          )
                      : null,
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildUserCard(Map<String, dynamic> user) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: user['isActive'] == true ? Colors.green : Colors.grey,
          child: Text(
            user['name']?.toString().substring(0, 1).toUpperCase() ?? 'U',
            style: const TextStyle(color: Colors.white),
          ),
        ),
        title: Text(
          user['name']?.toString() ?? 'Nome não informado',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(user['email']?.toString() ?? ''),
            if (user['phone'] != null) Text(user['phone']?.toString() ?? ''),
            const SizedBox(height: 4),
            Row(
              children: [
                Chip(
                  label: Text(
                    user['role']?.toString().toUpperCase() ?? 'USER',
                    style: const TextStyle(fontSize: 10, color: Colors.white),
                  ),
                  backgroundColor: user['role'] == 'admin' ? Colors.red : Colors.blue,
                ),
                const SizedBox(width: 8),
                Chip(
                  label: Text(
                    user['isActive'] == true ? 'ATIVO' : 'INATIVO',
                    style: TextStyle(
                      fontSize: 10,
                      color: user['isActive'] == true ? Colors.white : Colors.black,
                    ),
                  ),
                  backgroundColor: user['isActive'] == true ? Colors.green : Colors.yellow,
                ),
              ],
            ),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              '€${(user['totalInvested'] ?? 0).toStringAsFixed(2)}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            Text(
              '€${(user['totalProfit'] ?? 0).toStringAsFixed(2)}',
              style: const TextStyle(
                fontSize: 12,
                color: Colors.green,
              ),
            ),
          ],
        ),
        onTap: () {
          // TODO: Navegar para detalhes do usuário
        },
      ),
    );
  }
}