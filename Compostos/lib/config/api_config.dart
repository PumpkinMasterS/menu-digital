/// Configurações de API para serviços externos
class ApiConfig {
  // ========== EMAILJS CONFIG ==========
  // 1. Acesse: https://www.emailjs.com/
  // 2. Crie uma conta gratuita
  // 3. Configure um serviço (Gmail, Outlook, etc.)
  // 4. Crie um template de email
  // 5. Substitua os valores abaixo
  
  static const String emailJsServiceId = 'YOUR_SERVICE_ID';
  static const String emailJsTemplateId = 'YOUR_TEMPLATE_ID';
  static const String emailJsPublicKey = 'YOUR_PUBLIC_KEY';
  static const String emailJsPrivateKey = 'YOUR_PRIVATE_KEY';
  
  // ========== SMS CONFIG ==========
  // Importante: Não expor segredos no frontend. O envio de SMS deve ser feito pelo backend.
  // Utilize a flag abaixo para controlar se o app deve usar o backend para SMS/OTP.
  static const bool useBackendForSms = true;

  // Placeholders (NÃO UTILIZAR no frontend)
  static const String twilioAccountSid = 'REDACTED';
  static const String twilioAuthToken = 'REDACTED';
  static const String twilioPhoneNumber = '+00000000000';
  
  // ========== OTP CONFIG ==========
  static const int otpLength = 6;
  static const int otpExpiryMinutes = 10;
  static const int resendCooldownSeconds = 60;
  
  // URLs dos serviços
  static const String emailJsUrl = 'https://api.emailjs.com/api/v1.0/email/send';
  static const String twilioBaseUrl = 'https://api.twilio.com/2010-04-01/Accounts';
  
  // ========== VALIDATION ==========
  static bool get isEmailConfigured => 
      emailJsServiceId != 'YOUR_SERVICE_ID' &&
      emailJsTemplateId != 'YOUR_TEMPLATE_ID' &&
      emailJsPublicKey != 'YOUR_PUBLIC_KEY';
      
  // Habilita SMS quando o app está configurado para usar o backend.
  // Não valida segredos do Twilio no frontend.
  static bool get isSmsConfigured {
    return useBackendForSms;
  }
}

/// Template de email para EmailJS
/// Use este HTML no seu template do EmailJS:
/// 
/// ```html
/// <!DOCTYPE html>
/// <html>
/// <head>
///     <meta charset="utf-8">
///     <title>Código de Verificação - {{app_name}}</title>
/// </head>
/// <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
///     <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white;">
///         <h1 style="margin: 0; font-size: 28px;">{{app_name}}</h1>
///         <p style="margin: 10px 0 0 0; opacity: 0.9;">Sistema de Investimentos</p>
///     </div>
///     
///     <div style="padding: 30px 0;">
///         <h2 style="color: #333; margin-bottom: 20px;">Olá, {{to_name}}!</h2>
///         
///         <p style="color: #666; font-size: 16px; line-height: 1.5;">
///             Você solicitou um código de verificação para acessar sua conta.
///         </p>
///         
///         <div style="background: #f8f9fa; border: 2px dashed #667eea; border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0;">
///             <p style="color: #333; font-size: 14px; margin: 0 0 10px 0;">Seu código de verificação é:</p>
///             <h1 style="color: #667eea; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 0;">{{otp_code}}</h1>
///         </div>
///         
///         <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
///             <p style="color: #856404; margin: 0; font-size: 14px;">
///                 <strong>⚠️ Importante:</strong><br>
///                 • Este código expira em {{validity_minutes}} minutos<br>
///                 • Não compartilhe este código com ninguém<br>
///                 • Se você não solicitou este código, ignore este email
///             </p>
///         </div>
///         
///         <p style="color: #666; font-size: 14px; margin-top: 30px;">
///             Atenciosamente,<br>
///             <strong>Equipe {{app_name}}</strong>
///         </p>
///     </div>
///     
///     <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
///         <p style="color: #999; font-size: 12px; margin: 0;">
///             Este é um email automático, não responda.
///         </p>
///     </div>
/// </body>
/// </html>
/// ```