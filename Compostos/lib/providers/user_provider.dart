import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/core/storage/hive_storage.dart';
import 'package:compostos/core/services/auth_service.dart';
import 'package:compostos/core/services/user_service.dart';
import 'package:compostos/core/services/api_service.dart';
import 'package:compostos/models/user_model.dart';

final userProvider = NotifierProvider<UserNotifier, UserModel?>(() {
  return UserNotifier();
});

final userServiceProvider = Provider<UserService>((ref) {
  final apiService = ref.watch(apiServiceProvider);
  return UserService(apiService);
});

class UserNotifier extends Notifier<UserModel?> {
  late final UserService _userService;
  
  @override
  UserModel? build() {
    _userService = ref.read(userServiceProvider);
    _loadUser();
    return null;
  }

  Future<void> _loadUser() async {
    try {
      // Primeiro tenta carregar da API
      final userResponse = await _userService.getUserProfile();
      if (userResponse['success'] == true && userResponse['data'] != null) {
        final user = UserModel.fromJson(userResponse['data']);
        state = user;
        await HiveStorage.saveUser(user);
      }
    } catch (e) {
      print('Erro ao carregar usuário da API: $e');
      // Antes de usar fallback local, garantir que existe token válido
      final hasToken = await ref.read(authServiceProvider).isLoggedIn();
      if (!hasToken) {
        // Sem token, manter estado como não autenticado
        state = null;
        return;
      }
      // Fallback para dados locais apenas se houver token
      final localUser = HiveStorage.getUser();
      if (localUser != null) {
        state = localUser;
      }
    }
  }

  Future<void> login(String email, String password) async {
    try {
      final token = await ref.read(authServiceProvider).login(email, password);
      if (token != null) {
        final userData = await ref.read(authServiceProvider).getCurrentUser();
        if (userData != null) {
          final user = UserModel.fromJson(userData);
          await HiveStorage.saveUser(user);
          state = user;
          print('User state updated in UserNotifier after login');
        }
      }
    } catch (e) {
      throw Exception('Erro no login: \$e');
    }
  }
  
  Future<void> register(String name, String email, String password, {String? referralCode}) async {
    try {
      final token = await ref.read(authServiceProvider).register(
        name, email, password, referralCode: referralCode
      );
      if (token != null) {
        final userData = await ref.read(authServiceProvider).getCurrentUser();
        if (userData != null) {
          final user = UserModel.fromJson(userData);
          await HiveStorage.saveUser(user);
          state = user;
        }
      }
    } catch (e) {
      throw Exception('Erro no registro: \$e');
    }
  }

  Future<void> updateUser(UserModel user) async {
    try {
      // Atualiza localmente primeiro para feedback imediato
      await HiveStorage.saveUser(user);
      state = user;
      
      // Sincroniza com a API
      final updates = {
        'name': user.name,
        'email': user.email,
        'phone': user.phone,
        'address': user.address,
      };
      await _userService.updateUserProfile(updates);
      
      // Recarrega da API para garantir sincronização
      await _loadUser();
    } catch (e) {
      print('Erro ao atualizar usuário na API: $e');
      // Mantém a atualização local mesmo com erro na API
    }
  }

  Future<void> addBalance(double amount) async {
    if (state != null) {
      final updatedUser = state!;
      updatedUser.addBalance(amount);
      await updateUser(updatedUser);
    }
  }

  Future<void> registerClick() async {
    if (state != null) {
      final updatedUser = state!;
      updatedUser.registerClick();
      await updateUser(updatedUser);
    }
  }

  Future<void> addReferral(String referralId) async {
    if (state != null) {
      final updatedUser = state!;
      updatedUser.addReferral(referralId);
      await updateUser(updatedUser);
    }
  }

  Future<void> logout() async {
    try {
      await ref.read(authServiceProvider).logout();
    } catch (e) {
      // Ignorar erros no logout da API
    } finally {
      await HiveStorage.deleteUser();
      state = null;
    }
  }

  bool get isLoggedIn => state != null;
  
  UserModel? get currentUser => state;
  
  double get balance => state?.balance ?? 0.0;
  
  bool get canClickToday => state?.canClickToday() ?? false;
  
  int get dailyClicks => state?.dailyClicks ?? 0;
}