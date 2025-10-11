const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const twilio = require('twilio');

// Configurações do Twilio via variáveis de ambiente
const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  SMS_SIMULATE
} = process.env;

const isTwilioConfigured = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);
const simulateSms = String(SMS_SIMULATE || '').toLowerCase() === 'true';

// Rate limit específico para SMS OTP
const smsLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // no máximo 10 envios por IP
  message: {
    success: false,
    message: 'Limite de envios de SMS atingido. Tente novamente em alguns minutos.'
  }
});

// Middleware de validação simples do corpo
function validateSmsBody(req, res, next) {
  const { phoneNumber, otpCode, message } = req.body || {};

  if (!phoneNumber || !otpCode) {
    return res.status(400).json({ success: false, message: 'phoneNumber e otpCode são obrigatórios.' });
  }

  // Limpar telefone (permitir apenas + e dígitos)
  const cleaned = String(phoneNumber).replace(/[^\d+]/g, '');
  if (!cleaned.startsWith('+') || cleaned.length < 10) {
    return res.status(400).json({ success: false, message: 'Telefone inválido. Use o formato internacional, ex: +3519xxxxxxxx.' });
  }

  req.body.phoneNumber = cleaned;
  req.body.message = message || `Seu código Compostos: ${otpCode}\n\nVálido por 5min.\n\nNão compartilhe.`;
  next();
}

router.post('/sms', smsLimiter, validateSmsBody, async (req, res) => {
  try {
    const { phoneNumber, message, otpCode } = req.body;

    // Modo simulado (sem Twilio) — sempre retorna sucesso
    if (simulateSms || !isTwilioConfigured) {
      console.log('📨 [SIMULADO] SMS OTP enviado', { to: phoneNumber, otpCode, preview: message.slice(0, 60) + '...' });
      return res.status(200).json({ success: true, simulated: true, to: phoneNumber });
    }

    // Envio real via Twilio
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    const twilioResp = await client.messages.create({
      body: message,
      to: phoneNumber,
      from: TWILIO_PHONE_NUMBER,
    });

    console.log('✅ SMS enviado via Twilio:', {
      sid: twilioResp.sid,
      status: twilioResp.status,
      to: phoneNumber,
    });

    return res.status(200).json({ success: true, sid: twilioResp.sid, status: twilioResp.status });
  } catch (error) {
    console.error('❌ Erro ao enviar SMS via Twilio:', error?.message || error);
    const statusCode = error?.status || 500;
    return res.status(statusCode).json({ success: false, message: 'Falha ao enviar SMS', error: error?.message || 'Erro desconhecido' });
  }
});

module.exports = router;