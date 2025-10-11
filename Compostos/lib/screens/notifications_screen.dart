import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:compostos/providers/notification_provider.dart';
import 'package:compostos/widgets/notification_card.dart';
import 'package:compostos/widgets/loading_indicator.dart';
import 'package:compostos/widgets/error_message.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(notificationProvider.notifier).loadNotifications(refresh: true);
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels ==
        _scrollController.position.maxScrollExtent) {
      ref.read(notificationProvider.notifier).loadMoreNotifications();
    }
  }

  Future<void> _refreshNotifications() async {
    await ref.read(notificationProvider.notifier).loadNotifications(refresh: true);
  }

  @override
  Widget build(BuildContext context) {
    final notificationState = ref.watch(notificationProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notificações'),
        actions: [
          if (notificationState.unreadCount > 0)
            IconButton(
              icon: const Icon(Icons.mark_email_read),
              onPressed: () async {
                try {
                  await ref
                      .read(notificationProvider.notifier)
                      .markAllAsRead();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Todas as notificações marcadas como lidas'),
                    ),
                  );
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Erro: \$e'),
                    ),
                  );
                }
              },
              tooltip: 'Marcar todas como lidas',
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refreshNotifications,
        child: _buildBody(notificationState),
      ),
    );
  }

  Widget _buildBody(NotificationState state) {
    if (state.isLoading && state.notifications.isEmpty) {
      return const Center(child: LoadingIndicator());
    }

    if (state.error != null && state.notifications.isEmpty) {
      return ErrorMessage(
        message: state.error!,
        onRetry: () => ref
            .read(notificationProvider.notifier)
            .loadNotifications(refresh: true),
      );
    }

    if (state.notifications.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.notifications_none, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'Nenhuma notificação',
              style: TextStyle(fontSize: 18, color: Colors.grey),
            ),
            SizedBox(height: 8),
            Text(
              'Você será notificado quando houver novidades',
              style: TextStyle(color: Colors.grey),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      itemCount: state.notifications.length + (state.hasMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index == state.notifications.length) {
          return state.isLoading
              ? const Padding(
                  padding: EdgeInsets.all(16.0),
                  child: Center(child: LoadingIndicator()),
                )
              : const SizedBox.shrink();
        }

        final notification = state.notifications[index];
        return NotificationCard(
          notification: notification,
          onTap: () async {
            if (!notification.isRead) {
              try {
                await ref
                    .read(notificationProvider.notifier)
                    .markAsRead(notification.id);
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Erro: \$e'),
                  ),
                );
              }
            }
          },
        );
      },
    );
  }
}