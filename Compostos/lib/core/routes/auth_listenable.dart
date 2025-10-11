import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/models/user_model.dart';
import 'package:compostos/providers/user_provider.dart';

class AuthListenable extends ChangeNotifier {
  final Ref ref;
  late final ProviderSubscription<UserModel?> _subscription;

  AuthListenable(this.ref) {
    _subscription = ref.listen(userProvider, (previous, next) {
      notifyListeners();
    });
  }

  @override
  void dispose() {
    _subscription.close();
    super.dispose();
  }
}