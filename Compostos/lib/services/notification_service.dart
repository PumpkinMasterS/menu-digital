import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz;

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  
  factory NotificationService() => _instance;
  
  NotificationService._internal();
  
  late FlutterLocalNotificationsPlugin _notificationsPlugin;
  
  Future<void> initialize() async {
    tz.initializeTimeZones();
    
    const AndroidInitializationSettings androidSettings = 
        AndroidInitializationSettings('@mipmap/ic_launcher');
    
    const DarwinInitializationSettings iosSettings = 
        DarwinInitializationSettings();
    
    const InitializationSettings settings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );
    
    _notificationsPlugin = FlutterLocalNotificationsPlugin();
    
    await _notificationsPlugin.initialize(
      settings,
      onDidReceiveNotificationResponse: (details) {
        // Handle notification tap
      },
    );
  }
  
  Future<void> showProfitNotification({
    required double amount,
    required String robotName,
    required String title,
    required String body,
  }) async {
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'profit_channel',
      'Lucros',
      channelDescription: 'Notificações de lucros dos robôs',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
      enableVibration: true,
      playSound: true,
    );
    
    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails();
    
    const NotificationDetails details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );
    
    await _notificationsPlugin.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title,
      body,
      details,
    );
  }
  
  Future<void> showDailyProfitNotification(double amount) async {
    await showProfitNotification(
      amount: amount,
      robotName: 'Todos os Robôs',
      title: '💰 Lucro Diário Disponível!',
      body: 'Você tem €\${amount.toStringAsFixed(2)} disponíveis para coleta.',
    );
  }
  
  Future<void> showRobotProfitNotification({
    required double amount,
    required String robotName,
  }) async {
    await showProfitNotification(
      amount: amount,
      robotName: robotName,
      title: '🤖 $robotName Gerou Lucro!',
      body: 'Seu robô gerou €\${amount.toStringAsFixed(2)}. Clique para coletar!',
    );
  }
  
  Future<void> showBonusNotification(double amount) async {
    await showProfitNotification(
      amount: amount,
      robotName: 'Bônus',
      title: '🎁 Bônus Recebido!',
      body: 'Você recebeu um bônus de €\${amount.toStringAsFixed(2)}.',
    );
  }
  
  Future<void> scheduleDailyReminder() async {
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'reminder_channel',
      'Lembretes',
      channelDescription: 'Lembretes diários para coletar lucros',
      importance: Importance.defaultImportance,
      priority: Priority.defaultPriority,
    );
    
    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails();
    
    const NotificationDetails details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );
    
    // Schedule for 9 AM daily
    final scheduledTime = tz.TZDateTime(
      tz.local,
      DateTime.now().year,
      DateTime.now().month,
      DateTime.now().day,
      9,
      0,
    );
    
    await _notificationsPlugin.zonedSchedule(
      0,
      '⏰ Hora de Coletar Lucros!',
      'Não se esqueça de coletar seus lucros diários hoje.',
      scheduledTime,
      details,
      androidAllowWhileIdle: true,
      uiLocalNotificationDateInterpretation: 
          UILocalNotificationDateInterpretation.absoluteTime,
      matchDateTimeComponents: DateTimeComponents.time,
    );
  }
  
  Future<void> cancelAllNotifications() async {
    await _notificationsPlugin.cancelAll();
  }
}