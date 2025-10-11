import 'dart:convert';
import 'dart:math';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class EmailService {
  // Configurações do EmailJS (você vai configurar no site)
  static const String _serviceId = 'YOUR_SERVICE_ID';
  static const String _templateId = 'YOUR_TEMPLATE_ID';
  static const String _publicKey = 'YOUR_PUBLIC_KEY';
  static const String _privateKey = 'YOUR_PRIVATE_KEY';
  
  static const String _emailJsUrl = 'https://api.emailjs.com/api/v1.0/email/send';

  /// Envia OTP por email usando EmailJS
  static Future<bool> sendOtp(String email, String otp) async {
    try {
      // Verificar se EmailJS está configurado
      if (!ApiConfig.isEmailConfigured) {
        print('❌ EmailJS não configurado. Configure as chaves em api_config.dart');
        return false;
      }

      // Preparar dados para EmailJS
      final templateParams = {
        'to_email': email,
        'to_name': email.split('@')[0], // Nome baseado no email
        'app_name': 'Compostos',
        'otp_code': otp,
        'validity_minutes': ApiConfig.otpExpiryMinutes.toString(),
      };

      final data = {
        'service_id': ApiConfig.emailJsServiceId,
        'template_id': ApiConfig.emailJsTemplateId,
        'user_id': ApiConfig.emailJsPublicKey,
        'accessToken': ApiConfig.emailJsPrivateKey,
        'template_params': templateParams,
      };

      print('📧 Enviando email para: ${_maskEmail(email)}');
      
      final response = await http.post(
        Uri.parse('https://api.emailjs.com/api/v1.0/email/send'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode(data),
      );

      if (response.statusCode == 200) {
        print('✅ Email enviado com sucesso!');
        return true;
      } else {
        print('❌ Erro ao enviar email: ${response.statusCode}');
        print('Resposta: ${response.body}');
        return false;
      }
    } catch (e) {
      print('❌ Erro ao enviar email: $e');
      return false;
    }
  }

  /// Máscara para email (privacidade) - função pública
  static String maskEmail(String email) {
    return _maskEmail(email);
  }

  /// Máscara para email (privacidade)
  static String _maskEmail(String email) {
    if (email.length < 3) return email;
    final parts = email.split('@');
    if (parts.length != 2) return email;
    
    final username = parts[0];
    final domain = parts[1];
    
    if (username.length <= 2) {
      return '${username[0]}***@$domain';
    }
    
    return '${username[0]}${'*' * (username.length - 2)}${username[username.length - 1]}@$domain';
  }

  /// Valida formato de email
  static bool isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }
}