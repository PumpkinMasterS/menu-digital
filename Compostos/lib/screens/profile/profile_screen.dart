import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:compostos/providers/user_provider.dart';
import 'package:compostos/providers/dashboard_provider.dart';
import 'package:compostos/providers/referral_provider.dart';
import 'package:compostos/models/user_model.dart';
import 'package:intl/intl.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  bool _isEditing = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  void _toggleEdit() {
    setState(() {
      _isEditing = !_isEditing;
    });
  }

  void _saveProfile() {
    final user = ref.read(userProvider);
    if (user != null) {
      final updatedUser = UserModel(
        id: user.id,
        email: _emailController.text,
        name: _nameController.text,
        balance: user.balance,
        registrationDate: user.registrationDate,
        lastLogin: user.lastLogin,
        referralCodes: user.referralCodes,
        referralCode: user.referralCode,
        dailyClicks: user.dailyClicks,
        lastClickDate: user.lastClickDate,
        phone: user.phone,
        address: user.address,
      );
      ref.read(userProvider.notifier).updateUser(updatedUser);
      setState(() {
        _isEditing = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Perfil atualizado com sucesso!')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(userProvider);
    final dashboardStats = ref.watch(dashboardStatsProvider);
    final referralStats = ref.watch(referralStatsProvider);

    if (user != null) {
      _nameController.text = user.name;
      _emailController.text = user.email;
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Meu Perfil'),
        backgroundColor: const Color(0xFF6B46C1),
        foregroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/dashboard'),
        ),
        actions: [
          IconButton(
            icon: Icon(_isEditing ? Icons.save : Icons.edit),
            onPressed: _isEditing ? _saveProfile : _toggleEdit,
            tooltip: _isEditing ? 'Salvar alterações' : 'Editar perfil',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header do perfil
            _buildProfileHeader(user),
            const SizedBox(height: 32),

            // Informações pessoais
            _buildPersonalInfoSection(user),
            const SizedBox(height: 24),

            // Estatísticas financeiras
            _buildFinancialStats(dashboardStats),
            const SizedBox(height: 24),

            // Estatísticas de indicações
            _buildReferralStats(referralStats),
            const SizedBox(height: 24),

            // Informações da conta
            _buildAccountInfo(user),
            const SizedBox(height: 32),

            // Ações da conta
            _buildAccountActions(),
            const SizedBox(height: 24),

            // Conquistas
            _buildAchievementsSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileHeader(UserModel? user) {
    return Center(
      child: Column(
        children: [
          CircleAvatar(
            radius: 50,
            backgroundColor: Colors.deepPurple,
            child: Text(
              user?.name.split(' ').map((n) => n[0]).take(2).join() ?? 'US',
              style: const TextStyle(
                fontSize: 32,
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            user?.name ?? 'Usuário',
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.deepPurple,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            user?.email ?? 'email@exemplo.com',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey[600],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPersonalInfoSection(UserModel? user) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '📋 Informações Pessoais',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.deepPurple,
              ),
            ),
            const SizedBox(height: 16),
            _buildEditableField(
              label: 'Nome completo',
              controller: _nameController,
              isEditing: _isEditing,
              icon: Icons.person,
            ),
            const SizedBox(height: 12),
            _buildEditableField(
              label: 'E-mail',
              controller: _emailController,
              isEditing: _isEditing,
              icon: Icons.email,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEditableField({
    required String label,
    required TextEditingController controller,
    required bool isEditing,
    required IconData icon,
  }) {
    return Row(
      children: [
        Icon(icon, color: Colors.deepPurple, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: isEditing
              ? TextFormField(
                  controller: controller,
                  decoration: InputDecoration(
                    labelText: label,
                    border: const OutlineInputBorder(),
                  ),
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Colors.grey,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      controller.text,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _buildFinancialStats(DashboardStats stats) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '💰 Estatísticas Financeiras',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.deepPurple,
              ),
            ),
            const SizedBox(height: 16),
            _buildStatRow('Saldo total', '€\${stats.totalBalance.toStringAsFixed(2)}', Icons.account_balance_wallet),
            const SizedBox(height: 8),
            _buildStatRow('Ganhos de hoje', '€\${stats.dailyEarnings.toStringAsFixed(2)}', Icons.today),
            const SizedBox(height: 8),
            _buildStatRow('Ganhos totais', '€\${stats.totalEarnings.toStringAsFixed(2)}', Icons.attach_money),
          ],
        ),
      ),
    );
  }

  Widget _buildReferralStats(ReferralStats stats) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '👥 Programa de Indicações',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.deepPurple,
              ),
            ),
            const SizedBox(height: 16),
            _buildStatRow('Total indicados', stats.totalReferrals.toString(), Icons.people),
            const SizedBox(height: 8),
            _buildStatRow('Ganhos com indicações', '€\${stats.totalEarnings.toStringAsFixed(2)}', Icons.currency_exchange),
            const SizedBox(height: 8),
            _buildStatRow('Nível atual', 'Nível \${stats.level}', Icons.star),
          ],
        ),
      ),
    );
  }

  Widget _buildStatRow(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: Colors.deepPurple, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.grey,
                ),
              ),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAccountInfo(UserModel? user) {
    final formatter = DateFormat('dd/MM/yyyy HH:mm');
    
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '📊 Informações da Conta',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.deepPurple,
              ),
            ),
            const SizedBox(height: 16),
            _buildInfoRow('ID do usuário', user?.id ?? 'N/A', Icons.fingerprint),
            const SizedBox(height: 8),
            _buildInfoRow('Data de registro', formatter.format(user?.registrationDate ?? DateTime.now()), Icons.calendar_today),
            const SizedBox(height: 8),
            _buildInfoRow('Último login', formatter.format(user?.lastLogin ?? DateTime.now()), Icons.login),
            const SizedBox(height: 8),
            _buildInfoRow('Cliques hoje', '\${user?.dailyClicks ?? 0}/3', Icons.touch_app),
          ],
        ),
      ),
    );
  }

  Widget _buildAchievementsSection() {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '🏆 Conquistas',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.deepPurple,
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => context.push('/achievements'),
              icon: const Icon(Icons.emoji_events),
              label: const Text('Ver Minhas Conquistas'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.amber,
                foregroundColor: Colors.black,
                minimumSize: const Size(double.infinity, 50),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, color: Colors.grey, size: 18),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  color: Colors.grey,
                ),
              ),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAccountActions() {
    return Column(
      children: [
        ElevatedButton.icon(
          onPressed: () => context.push('/reports'),
          icon: const Icon(Icons.bar_chart),
          label: const Text('Ver Extrato Completo'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.deepPurple,
            foregroundColor: Colors.white,
            minimumSize: const Size(double.infinity, 50),
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () async {
            try {
              // Primeiro mostra o feedback visual
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('A fazer logout...'),
                    backgroundColor: Colors.blue,
                    duration: Duration(seconds: 2),
                  ),
                );
              }
              
              // Executa o logout e aguarda conclusão
              await ref.read(userProvider.notifier).logout();
              
              // Força uma atualização do estado de autenticação
              await Future.delayed(const Duration(milliseconds: 100));
              
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Logout realizado com sucesso!'),
                    backgroundColor: Colors.green,
                    duration: Duration(seconds: 2),
                  ),
                );
                
                // Redireciona para login após garantir que o estado foi limpo
                context.go('/login');
              }
            } catch (e) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Erro ao fazer logout: \$e'),
                    backgroundColor: Colors.red,
                    duration: const Duration(seconds: 3),
                  ),
                );
              }
            }
          },
          icon: const Icon(Icons.logout),
          label: const Text('Sair da Conta'),
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.red,
            side: const BorderSide(color: Colors.red),
            minimumSize: const Size(double.infinity, 50),
          ),
        ),
      ],
    );
  }
}