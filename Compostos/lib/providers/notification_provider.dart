import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/core/services/notification_api_service.dart';

// Modelo de notificação
class NotificationModel {
  final String id;
  final String title;
  final String message;
  final String type;
  final bool isRead;
  final DateTime createdAt;
  final Map<String, dynamic>? data;

  NotificationModel({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.isRead,
    required this.createdAt,
    this.data,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['_id'] ?? json['id'],
      title: json['title'],
      message: json['message'],
      type: json['type'],
      isRead: json['isRead'] ?? false,
      createdAt: DateTime.parse(json['createdAt']),
      data: json['data'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'message': message,
        'type': type,
        'isRead': isRead,
        'createdAt': createdAt.toIso8601String(),
        'data': data,
      };

  // Método copyWith para criar cópias modificadas
  NotificationModel copyWith({
    String? id,
    String? title,
    String? message,
    String? type,
    bool? isRead,
    DateTime? createdAt,
    Map<String, dynamic>? data,
  }) {
    return NotificationModel(
      id: id ?? this.id,
      title: title ?? this.title,
      message: message ?? this.message,
      type: type ?? this.type,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt ?? this.createdAt,
      data: data ?? this.data,
    );
  }
}

// Estado das notificações
class NotificationState {
  final List<NotificationModel> notifications;
  final int unreadCount;
  final bool isLoading;
  final String? error;
  final bool hasMore;
  final int currentPage;

  NotificationState({
    List<NotificationModel>? notifications,
    this.unreadCount = 0,
    this.isLoading = false,
    this.error,
    this.hasMore = true,
    this.currentPage = 1,
  }) : notifications = notifications ?? [];

  NotificationState copyWith({
    List<NotificationModel>? notifications,
    int? unreadCount,
    bool? isLoading,
    String? error,
    bool? hasMore,
    int? currentPage,
  }) {
    return NotificationState(
      notifications: notifications ?? this.notifications,
      unreadCount: unreadCount ?? this.unreadCount,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      hasMore: hasMore ?? this.hasMore,
      currentPage: currentPage ?? this.currentPage,
    );
  }
}

// Notifier para gerenciar notificações
class NotificationNotifier extends Notifier<NotificationState> {
  late NotificationApiService _notificationService;

  @override
  NotificationState build() {
    _notificationService = ref.watch(notificationApiServiceProvider);
    return NotificationState();
  }

  // Carregar notificações
  Future<void> loadNotifications({bool refresh = false}) async {
    try {
      if (refresh) {
        state = state.copyWith(isLoading: true, error: null, currentPage: 1);
      } else {
        state = state.copyWith(isLoading: true, error: null);
      }

      final page = refresh ? 1 : state.currentPage;
      
      final result = await _notificationService.getNotifications(
        page: page,
        limit: 20,
      );

      final notifications = (result['notifications'] as List)
          .map((json) => NotificationModel.fromJson(json))
          .toList();

      final hasMore = page < (result['pagination']['pages'] ?? 1);

      state = state.copyWith(
        notifications: refresh
            ? notifications
            : [...state.notifications, ...notifications],
        unreadCount: result['unreadCount'] ?? 0,
        isLoading: false,
        hasMore: hasMore,
        currentPage: page + 1,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  // Carregar mais notificações
  Future<void> loadMoreNotifications() async {
    if (state.isLoading || !state.hasMore) return;
    
    try {
      state = state.copyWith(isLoading: true);

      final result = await _notificationService.getNotifications(
        page: state.currentPage,
        limit: 20,
      );

      final notifications = (result['notifications'] as List)
          .map((json) => NotificationModel.fromJson(json))
          .toList();

      final hasMore = state.currentPage < (result['pagination']['pages'] ?? 1);

      state = state.copyWith(
        notifications: [...state.notifications, ...notifications],
        unreadCount: result['unreadCount'] ?? state.unreadCount,
        isLoading: false,
        hasMore: hasMore,
        currentPage: state.currentPage + 1,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  // Atualizar contagem de não lidas
  Future<void> updateUnreadCount() async {
    try {
      final count = await _notificationService.getUnreadCount();
      state = state.copyWith(unreadCount: count);
    } catch (e) {
      // Ignora erros na contagem
    }
  }

  // Marcar notificação como lida
  Future<void> markAsRead(String notificationId) async {
    try {
      await _notificationService.markAsRead(notificationId);
      
      // Atualiza localmente
      final updatedNotifications = state.notifications.map((notification) {
        if (notification.id == notificationId) {
          return notification.copyWith(isRead: true);
        }
        return notification;
      }).toList();

      state = state.copyWith(
        notifications: updatedNotifications,
        unreadCount: state.unreadCount > 0 ? state.unreadCount - 1 : 0,
      );
    } catch (e) {
      throw Exception('Erro ao marcar como lida: \$e');
    }
  }

  // Marcar todas como lidas
  Future<void> markAllAsRead() async {
    try {
      await _notificationService.markAllAsRead();
      
      // Atualiza localmente
      final updatedNotifications = state.notifications
          .map((notification) => notification.copyWith(isRead: true))
          .toList();

      state = state.copyWith(
        notifications: updatedNotifications,
        unreadCount: 0,
      );
    } catch (e) {
      throw Exception('Erro ao marcar todas como lidas: \$e');
    }
  }

  // Limpar erro
  void clearError() {
    state = state.copyWith(error: null);
  }

  // Adicionar notificação localmente (para testes)
  void addLocalNotification(NotificationModel notification) {
    state = state.copyWith(
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    );
  }
}

// Provider principal
final notificationProvider = NotifierProvider<NotificationNotifier, NotificationState>(() {
  return NotificationNotifier();
});

// Provider para contagem de não lidas (otimizado)
final unreadNotificationsCountProvider = FutureProvider<int>((ref) {
  final notificationService = ref.watch(notificationApiServiceProvider);
  return notificationService.getUnreadCount();
});