import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../core/services/api_service.dart';

class SmsService {
  /// Envia OTP por SMS usando backend (seguro)
  static Future<bool> sendOtp(String phone, String otp) async {
    try {
      return await _sendViaBackend(phone, otp);
    } catch (e) {
      print('❌ Erro ao enviar SMS: $e');
      return false;
    }
  }

  /// Envia código OTP por SMS usando backend
  static Future<bool> sendOtpSms({
    required String phoneNumber,
    required String otpCode,
  }) async {
    return await sendOtp(phoneNumber, otpCode);
  }

  /// Envia SMS via Twilio (sistema de produção)
  static Future<bool> _sendViaTwilio(String phone, String otp) async {
    try {
      // Verificar se Twilio está configurado
      if (!ApiConfig.isSmsConfigured) {
        print('❌ Twilio não configurado. Configure as chaves em api_config.dart');
        return false;
      }

      final message = 'Seu código Compostos: $otp\n\nVálido por ${ApiConfig.otpExpiryMinutes}min.\n\nNão compartilhe.';
      
      final data = {
        'From': ApiConfig.twilioPhoneNumber,
        'To': _formatPhoneForTwilio(phone),
        'Body': message,
      };

      print('📱 Enviando SMS via Twilio para: ${_maskPhone(phone)}');
      
      final credentials = base64Encode(
        utf8.encode('${ApiConfig.twilioAccountSid}:${ApiConfig.twilioAuthToken}')
      );

      final response = await http.post(
        Uri.parse('${ApiConfig.twilioBaseUrl}/${ApiConfig.twilioAccountSid}/Messages.json'),
        headers: {
          'Authorization': 'Basic $credentials',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data,
      );

      if (response.statusCode == 201) {
        print('✅ SMS enviado com sucesso via Twilio!');
        return true;
      } else {
        print('❌ Erro Twilio: ${response.statusCode}');
        // Tenta decodificar resposta JSON do Twilio para obter detalhes
        try {
          final body = jsonDecode(response.body);
          final code = body['code'];
          final message = body['message'];
          final moreInfo = body['more_info'];
          if (code != null || message != null) {
            print('🔎 Detalhes: code=$code, message=$message');
            if (moreInfo is String) {
              print('ℹ️ Mais info: $moreInfo');
            }
          } else {
            print('Resposta: ${response.body}');
          }
        } catch (_) {
          // Caso não seja JSON, exibe corpo cru
          print('Resposta: ${response.body}');
        }
        return false;
      }
    } catch (e) {
      print('❌ Erro Twilio: $e');
      return false;
    }
  }

  /// Envia SMS via backend (Node/Express) que integra com Twilio
  static Future<bool> _sendViaBackend(String phone, String otp) async {
    try {
      // Verificar se envio de SMS está habilitado
      if (!ApiConfig.isSmsConfigured) {
        print('❌ SMS não configurado. Ative o envio via backend em ApiConfig.');
        return false;
      }

      final message = 'Seu código Compostos: $otp\n\nVálido por ${ApiConfig.otpExpiryMinutes}min.\n\nNão compartilhe.';

      print('📱 Enviando SMS via backend para: ${_maskPhone(phone)}');

      final response = await http.post(
        Uri.parse('${ApiService.baseUrl}/api/otp/sms'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'phoneNumber': _cleanPhoneNumber(phone),
          'otpCode': otp,
          'message': message,
        }),
      );

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body is Map && body['success'] == true) {
          print('✅ SMS enviado com sucesso via backend!');
          return true;
        }
        print('❌ Falha no backend ao enviar SMS: ${response.body}');
        return false;
      } else {
        print('❌ Erro backend SMS: ${response.statusCode}');
        try {
          final body = jsonDecode(response.body);
          print('🔎 Detalhes: $body');
        } catch (_) {
          print('Resposta: ${response.body}');
        }
        return false;
      }
    } catch (e) {
      print('❌ Erro backend SMS: $e');
      return false;
    }
  }

  /// Formatar telefone para Twilio (formato internacional)
  static String _formatPhoneForTwilio(String phone) {
    final cleaned = phone.replaceAll(RegExp(r'[^\d+]'), '');
    
    // Se já tem +, retorna como está
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    // Para números portugueses
    if (cleaned.startsWith('351')) {
      return '+$cleaned';
    } else if (cleaned.length == 9 && !cleaned.startsWith('0')) {
      return '+351$cleaned';
    }
    
    // Para números brasileiros
    if (cleaned.startsWith('55')) {
      return '+$cleaned';
    } else if (cleaned.length == 11 || cleaned.length == 10) {
      return '+55$cleaned';
    }
    
    // Formato genérico
    return '+$cleaned';
  }


  /// Limpa número de telefone (remove caracteres especiais)
  static String _cleanPhoneNumber(String phone) {
    // Remove todos os caracteres não numéricos exceto +
    String cleaned = phone.replaceAll(RegExp(r'[^\d+]'), '');
    
    // Se não começar com +, tenta detectar o país
    if (!cleaned.startsWith('+')) {
      // Portugal
      if (cleaned.startsWith('351') || (cleaned.length == 9 && !cleaned.startsWith('0'))) {
        if (!cleaned.startsWith('351')) {
          cleaned = '351$cleaned';
        }
        cleaned = '+$cleaned';
      }
      // Brasil
      else if (cleaned.startsWith('55') || cleaned.length >= 10) {
        if (!cleaned.startsWith('55')) {
          cleaned = '55$cleaned';
        }
        cleaned = '+$cleaned';
      }
      // Outros países - adiciona + genérico
      else {
        cleaned = '+$cleaned';
      }
    }
    
    return cleaned;
  }

  /// Máscara para telefone (privacidade) - função pública
  static String maskPhone(String phone) {
    return _maskPhone(phone);
  }

  /// Máscara para telefone (privacidade)
  static String _maskPhone(String phone) {
    if (phone.length < 8) return phone;
    
    // Para números portugueses: +351 9****-**38
    if (phone.startsWith('+351') && phone.length >= 12) {
      final start = phone.substring(0, 6);
      final end = phone.substring(phone.length - 2);
      return '$start${'*' * (phone.length - 8)}$end';
    }
    
    // Para números brasileiros: +55 (11) 9****-**34
    if (phone.startsWith('+55') && phone.length >= 13) {
      final ddd = phone.substring(3, 5);
      final start = phone.substring(5, 7);
      final end = phone.substring(phone.length - 2);
      return '+55 ($ddd) $start****-**$end';
    }
    
    // Formato genérico
    final start = phone.substring(0, 3);
    final end = phone.substring(phone.length - 2);
    return '$start${'*' * (phone.length - 5)}$end';
  }

  /// Valida formato de telefone português
  static bool isValidPortuguesePhone(String phone) {
    final cleaned = _cleanPhoneNumber(phone);
    // Formato: +351 + número (9 dígitos)
    return RegExp(r'^\+351\d{9}$').hasMatch(cleaned);
  }

  /// Valida formato de telefone brasileiro
  static bool isValidBrazilianPhone(String phone) {
    final cleaned = _cleanPhoneNumber(phone);
    // Formato: +55 + DDD (2 dígitos) + número (8 ou 9 dígitos)
    return RegExp(r'^\+55\d{10,11}$').hasMatch(cleaned);
  }

  /// Formata telefone para exibição
  static String formatPhoneDisplay(String phone) {
    final cleaned = _cleanPhoneNumber(phone);
    
    // Formato português
    if (cleaned.startsWith('+351') && cleaned.length == 12) {
      final number = cleaned.substring(4);
      return '+351 ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}';
    }
    
    // Formato brasileiro
    if (cleaned.startsWith('+55') && cleaned.length >= 13) {
      final ddd = cleaned.substring(3, 5);
      final number = cleaned.substring(5);
      
      if (number.length == 9) {
        // Celular: +55 (11) 99999-9999
        return '+55 ($ddd) ${number.substring(0, 5)}-${number.substring(5)}';
      } else if (number.length == 8) {
        // Fixo: +55 (11) 9999-9999
        return '+55 ($ddd) ${number.substring(0, 4)}-${number.substring(4)}';
      }
    }
    
    return phone;
  }
}