import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/models/user_model.dart';
import 'package:compostos/providers/admin_provider.dart';

class UserListTile extends ConsumerStatefulWidget {
  final UserModel user;

  const UserListTile({super.key, required this.user});

  @override
  ConsumerState<UserListTile> createState() => _UserListTileState();
}

class _UserListTileState extends ConsumerState<UserListTile> {
  bool _isUpdating = false;

  Future<void> _toggleUserStatus() async {
    setState(() {
      _isUpdating = true;
    });

    try {
      final adminNotifier = ref.read(adminProvider.notifier);
      await adminNotifier.updateUserStatus(widget.user.id, !widget.user.isActive);
    } finally {
      setState(() {
        _isUpdating = false;
      });
    }
  }

  Future<void> _updateUserRole(String newRole) async {
    setState(() {
      _isUpdating = true;
    });

    try {
      final adminNotifier = ref.read(adminProvider.notifier);
      await adminNotifier.updateUserRole(widget.user.id, newRole);
    } finally {
      setState(() {
        _isUpdating = false;
      });
    }
  }

  void _showUserDetails() {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text('Detalhes do Usuário - ${widget.user.name}'),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildDetailRow('Nome:', widget.user.name),
                _buildDetailRow('Email:', widget.user.email),
                _buildDetailRow('Telefone:', widget.user.phone ?? 'Não informado'),
                _buildDetailRow('CPF:', widget.user.cpf ?? 'Não informado'),
                _buildDetailRow('Status:', widget.user.isActive ? 'Ativo' : 'Inativo'),
                _buildDetailRow('Função:', widget.user.role),
                _buildDetailRow('Data de Criação:', 
                    widget.user.createdAt?.toLocal().toString() ?? 'N/A'),
                _buildDetailRow('Último Login:', 
                    widget.user.lastLogin?.toLocal().toString() ?? 'Nunca'),
                if (widget.user.totalInvested > 0)
                  _buildDetailRow('Total Investido:', 
                      'R\${widget.user.totalInvested.toStringAsFixed(2)}'),
                if (widget.user.totalProfit > 0)
                  _buildDetailRow('Lucro Total:', 
                      'R\${widget.user.totalProfit.toStringAsFixed(2)}'),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Fechar'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              value,
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: widget.user.isActive ? Colors.green : Colors.grey,
          child: Icon(
            widget.user.isActive ? Icons.person : Icons.person_off,
            color: Colors.white,
          ),
        ),
        title: Text(widget.user.name),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.user.email),
            Text(
              '${widget.user.role} • ${widget.user.isActive ? 'Ativo' : 'Inativo'}',
              style: TextStyle(
                color: widget.user.isActive ? Colors.green : Colors.red,
                fontSize: 12,
              ),
            ),
          ],
        ),
        trailing: _isUpdating
            ? const CircularProgressIndicator(strokeWidth: 2)
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Dropdown para alterar role
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert),
                    onSelected: _updateUserRole,
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'user',
                        child: Text('Definir como Usuário'),
                      ),
                      const PopupMenuItem(
                        value: 'admin',
                        child: Text('Definir como Admin'),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: Icon(
                      widget.user.isActive ? Icons.block : Icons.check_circle,
                      color: widget.user.isActive ? Colors.red : Colors.green,
                    ),
                    onPressed: _toggleUserStatus,
                    tooltip: widget.user.isActive ? 'Desativar' : 'Ativar',
                  ),
                ],
              ),
        onTap: _showUserDetails,
        onLongPress: _toggleUserStatus,
      ),
    );
  }
}