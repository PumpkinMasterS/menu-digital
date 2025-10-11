import 'dart:math';
import 'email_service.dart';
import 'sms_service.dart';
import '../config/api_config.dart';

class OtpService {
  static final Random _random = Random();
  static final Map<String, String> _otpStorage = {};
  static final Map<String, DateTime> _otpExpiry = {};
  
  /// Gera um código OTP de 6 dígitos
  static String generateOtp() {
    return (_random.nextInt(900000) + 100000).toString();
  }
  
  /// Envia OTP por email (real ou simulado)
  static Future<bool> sendOtpEmail(String email, {String? userName}) async {
    try {
      final otpCode = generateOtp();
      
      // Armazena o código para validação
      _storeOtp(email, otpCode);
      
      print('📧 Enviando email para: ${_maskEmail(email)}');
      print('🔑 Código gerado: $otpCode');
      
      // Se as configurações estão definidas, usa serviço real
      if (ApiConfig.isEmailConfigured) {
        final success = await EmailService.sendOtp(email, otpCode);
        
        if (success) {
          print('✅ Email enviado via EmailJS!');
          return true;
        } else {
          print('⚠️ Falha no EmailJS, usando modo simulado');
        }
      }
      
      // Modo simulado (desenvolvimento)
      await Future.delayed(const Duration(seconds: 2));
      print('✅ Email simulado enviado com código: $otpCode');
      print('💡 Configure EmailJS em ApiConfig para envio real');
      
      return true;
    } catch (e) {
      print('❌ Erro ao enviar email: $e');
      return false;
    }
  }
  
  /// Envia OTP por SMS (real ou simulado)
  static Future<bool> sendOtpSms(String phoneNumber) async {
    try {
      final otpCode = generateOtp();
      // Armazena o código para validação
      _storeOtp(phoneNumber, otpCode);
  
      print('📱 Enviando SMS para: ${SmsService.maskPhone(phoneNumber)}');
      print('🔑 Código gerado: $otpCode');
  
      // Se as configurações estão definidas, usa serviço real via backend
      if (ApiConfig.isSmsConfigured) {
        final success = await SmsService.sendOtpSms(
          phoneNumber: phoneNumber,
          otpCode: otpCode,
        );
        if (success) {
          print('✅ SMS enviado via backend!');
          return true;
        } else {
          print('⚠️ Falha no backend SMS, usando modo simulado');
        }
      }
  
      // Modo simulado (desenvolvimento)
      await Future.delayed(const Duration(seconds: 2));
      print('✅ SMS simulado enviado com código: $otpCode');
      print('💡 Configure SMS em ApiConfig e backend para envio real');
      return true;
    } catch (e) {
      print('❌ Erro ao enviar SMS: $e');
      return false;
    }
  }
  
  /// Armazena OTP temporariamente
  static void _storeOtp(String contact, String otp) {
    _otpStorage[contact] = otp;
    _otpExpiry[contact] = DateTime.now().add(
      Duration(minutes: ApiConfig.otpExpiryMinutes)
    );
  }

  /// Valida o código OTP
  static Future<bool> validateOtp(String contact, String code) async {
    try {
      await Future.delayed(const Duration(seconds: 1));
      
      // Verifica se o código existe e não expirou
      if (!_otpStorage.containsKey(contact)) {
        print('❌ Código não encontrado para: ${_maskContact(contact)}');
        return false;
      }
      
      final storedOtp = _otpStorage[contact]!;
      final expiry = _otpExpiry[contact]!;
      
      // Verifica se expirou
      if (DateTime.now().isAfter(expiry)) {
        print('❌ Código expirado para: ${_maskContact(contact)}');
        _otpStorage.remove(contact);
        _otpExpiry.remove(contact);
        return false;
      }
      
      // Verifica se o código está correto
      if (storedOtp == code) {
        print('✅ Código válido para: ${_maskContact(contact)}');
        _otpStorage.remove(contact);
        _otpExpiry.remove(contact);
        return true;
      }
      
      print('❌ Código incorreto para: ${_maskContact(contact)}');
      return false;
      
    } catch (e) {
      print('❌ Erro ao validar OTP: $e');
      return false;
    }
  }

  /// Máscara genérica para contato
  static String _maskContact(String contact) {
    if (contact.contains('@')) {
      return _maskEmail(contact);
    } else {
      return _maskPhone(contact);
    }
  }

  /// Máscara para email (ex: j***@gmail.com)
  static String _maskEmail(String email) {
    if (email.isEmpty || !email.contains('@')) return email;
    
    final parts = email.split('@');
    final username = parts[0];
    final domain = parts[1];
    
    if (username.length <= 2) {
      return '${username[0]}***@$domain';
    }
    
    return '${username[0]}${'*' * (username.length - 2)}${username[username.length - 1]}@$domain';
  }

  /// Máscara para telefone (ex: (11) 9****-**34)
  static String _maskPhone(String phone) {
    if (phone.isEmpty) return phone;
    
    // Remove caracteres não numéricos
    final cleanPhone = phone.replaceAll(RegExp(r'[^0-9]'), '');
    
    if (cleanPhone.length < 8) return phone;
    
    if (cleanPhone.length == 11) {
      // Formato: (11) 9****-**34
      return '(${cleanPhone.substring(0, 2)}) ${cleanPhone[2]}****-**${cleanPhone.substring(9)}';
    } else if (cleanPhone.length == 10) {
      // Formato: (11) ****-**34
      return '(${cleanPhone.substring(0, 2)}) ****-**${cleanPhone.substring(8)}';
    }
    
    return phone;
  }

  /// Formata tempo restante para reenvio
  static String formatTimeRemaining(int seconds) {
    if (seconds <= 0) return '00:00';
    
    final minutes = seconds ~/ 60;
    final remainingSeconds = seconds % 60;
    
    return '${minutes.toString().padLeft(2, '0')}:${remainingSeconds.toString().padLeft(2, '0')}';
  }

  /// Valida formato de email
  static bool isValidEmail(String email) {
    return RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(email);
  }

  /// Valida formato de telefone brasileiro
  static bool isValidPhone(String phone) {
    final cleanPhone = phone.replaceAll(RegExp(r'[^0-9]'), '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
  }

  /// Limpa armazenamento de OTPs (útil para testes)
  static void clearOtpStorage() {
    _otpStorage.clear();
    _otpExpiry.clear();
    print('🧹 Armazenamento OTP limpo');
  }

  /// Obtém estatísticas do armazenamento (debug)
  static Map<String, dynamic> getStorageStats() {
    final now = DateTime.now();
    final expired = _otpExpiry.values.where((expiry) => now.isAfter(expiry)).length;
    final active = _otpStorage.length - expired;
    
    return {
      'total_stored': _otpStorage.length,
      'active': active,
      'expired': expired,
    };
  }
}