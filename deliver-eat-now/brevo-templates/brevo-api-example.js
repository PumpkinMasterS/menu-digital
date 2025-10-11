// Exemplo de como enviar email via Brevo API com placeholders
// Este código vai na tua Edge Function (send-signup-confirmation)

// 1. SIGNUP CONFIRMATION
async function sendSignupConfirmation(email, userInfo) {
  const confirmationUrl = `https://comituga.eu/app/confirm?token=${generateToken()}&email=${email}&type=signup`;
  
  const brevoData = {
    sender: {
      name: "SaborPortuguês",
      email: "noreply@comituga.eu"
    },
    to: [
      {
        email: email,
        name: email.split('@')[0] // Usar parte antes do @ como nome
      }
    ],
    templateId: 1, // ID do template no Brevo (signup-confirmation-saborportugues)
    params: {
      CONFIRMATION_URL: confirmationUrl,
      DEVICE_TYPE: userInfo.device || 'Unknown',
      COUNTRY: userInfo.country || 'Portugal',
      IP_ADDRESS: userInfo.ipAddress || 'Hidden'
    },
    headers: {
      "X-Mailin-custom": "custom_header_1:custom_value_1|custom_header_2:custom_value_2"
    }
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': 'YOUR_BREVO_API_KEY' // Configurar nas env vars
    },
    body: JSON.stringify(brevoData)
  });

  return response.json();
}

// 2. PASSWORD RECOVERY
async function sendPasswordRecovery(email, userInfo) {
  const resetUrl = `https://comituga.eu/app/reset-password?token=${generateResetToken()}&email=${email}&type=recovery`;
  
  const brevoData = {
    sender: {
      name: "SaborPortuguês",
      email: "noreply@comituga.eu"
    },
    to: [
      {
        email: email,
        name: email.split('@')[0]
      }
    ],
    templateId: 2, // ID do template no Brevo (password-recovery-saborportugues)
    params: {
      RESET_PASSWORD_URL: resetUrl,
      DEVICE_TYPE: userInfo.device || 'Unknown',
      COUNTRY: userInfo.country || 'Portugal',
      IP_ADDRESS: userInfo.ipAddress || 'Hidden',
      TIMESTAMP: new Date().toLocaleString('pt-PT', {
        timeZone: 'Europe/Lisbon',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': 'YOUR_BREVO_API_KEY'
    },
    body: JSON.stringify(brevoData)
  });

  return response.json();
}

// 3. UTILITÁRIOS
function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function generateResetToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function getUserInfo(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const country = request.headers.get('cf-ipcountry') || 'PT'; // Cloudflare country
  const ipAddress = request.headers.get('cf-connecting-ip') || 
                   request.headers.get('x-forwarded-for') || 
                   'Hidden';
  
  let device = 'Web';
  if (userAgent.includes('Android')) device = 'Android';
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) device = 'iOS';
  
  return {
    device,
    country,
    ipAddress: ipAddress.split(',')[0] // Primeiro IP se houver vários
  };
}

// 4. EXPORTAR FUNÇÕES
export { sendSignupConfirmation, sendPasswordRecovery, getUserInfo }; 