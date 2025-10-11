import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Provider para controlar o índice da navegação
final navigationIndexProvider = NotifierProvider<NavigationIndexNotifier, int>(() {
  return NavigationIndexNotifier();
});

class NavigationIndexNotifier extends Notifier<int> {
  @override
  int build() {
    return 0;
  }

  void setIndex(int index) {
    state = index;
  }
}

class MainNavigation extends ConsumerStatefulWidget {
  const MainNavigation({super.key, required this.child, required this.currentLocation});

  final Widget child;
  final String currentLocation;

  @override
  ConsumerState<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends ConsumerState<MainNavigation> {
  @override
  Widget build(BuildContext context) {
    final router = GoRouter.of(context);
    final currentLocation = widget.currentLocation;
    
    // Mapeamento das rotas para os índices
    final routeToIndex = {
      '/dashboard': 0,
      '/investments': 1,
      '/tasks': 2,
      '/referrals': 3,
      '/commissions': 4,
      '/profile': 5,
      '/notifications': 6,
      '/achievements': 7,
    };

    // Determina o índice atual baseado na rota
    final currentIndex = routeToIndex[currentLocation] ?? 0;

    // Determina se está em uma rota de autenticação (onde a bottom bar não deve aparecer)
    final isAuthRoute = currentLocation == '/login' ||
        currentLocation == '/register' ||
        currentLocation == '/register-advanced' ||
        currentLocation == '/forgot-password' ||
        currentLocation.startsWith('/reset-password');

    // Função para navegar entre as telas
    void _onItemTapped(int index) {
      final routes = [
        '/dashboard',
        '/investments', 
        '/tasks',
        '/referrals',
        '/commissions',
        '/profile',
        '/notifications',
        '/achievements',
      ];
      
      if (index < routes.length) {
        router.go(routes[index]);
      }
    }

    return Scaffold(
      body: widget.child,
      bottomNavigationBar: isAuthRoute ? null : BottomNavigationBar(
        currentIndex: currentIndex,
        onTap: _onItemTapped,
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.white,
        selectedItemColor: const Color(0xFF2563EB),
        unselectedItemColor: Colors.grey[600],
        selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500),
        unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.normal),
        showUnselectedLabels: true,
        elevation: 8,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home),
            label: 'Início',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.trending_up_outlined),
            activeIcon: Icon(Icons.trending_up),
            label: 'Investimentos',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.task_outlined),
            activeIcon: Icon(Icons.task),
            label: 'Tarefas',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.group_outlined),
            activeIcon: Icon(Icons.group),
            label: 'Indicações',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.attach_money_outlined),
            activeIcon: Icon(Icons.attach_money),
            label: 'Comissões',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outlined),
            activeIcon: Icon(Icons.person),
            label: 'Perfil',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.notifications_outlined),
            activeIcon: Icon(Icons.notifications),
            label: 'Notificações',
          ),
        ],
      ),
    );
  }
}