// Configuração do Google Authentication
// Credenciais obtidas do Google Cloud Console

export const GOOGLE_AUTH_CONFIG = {
  // Web Client ID - para autenticação com Supabase
  WEB_CLIENT_ID: '815491836975-vsol2870hqfg6v4l82ejqmmab9k9rqc7.apps.googleusercontent.com',
  
  // Android Client ID - criado com package name: com.comituga.saborportugues
  // SHA-1: 7C:80:E4:67:01:8B:D7:E1:29:4B:AF:30:7B:87:62:9B:EA:8F:A5:58
  ANDROID_CLIENT_ID: '815491836975-0d3b655ed1ss7kfdbtvhh4ftq7m72fi4.apps.googleusercontent.com',
  
  // iOS Client ID (se necessário)
  IOS_CLIENT_ID: 'YOUR_IOS_CLIENT_ID_HERE.apps.googleusercontent.com',
  
  // Package name para Android
  PACKAGE_NAME: 'com.comituga.saborportugues',
  
  // SHA-1 fingerprint usado
  SHA1_FINGERPRINT: '7C:80:E4:67:01:8B:D7:E1:29:4B:AF:30:7B:87:62:9B:EA:8F:A5:58',
};

// ✅ CHECKLIST DE CONFIGURAÇÃO:
// 
// 1. Google Cloud Console:
//    ✅ Android Client ID criado com:
//       - Package name: com.comituga.saborportugues
//       - SHA-1: 7C:80:E4:67:01:8B:D7:E1:29:4B:AF:30:7B:87:62:9B:EA:8F:A5:58
//    ✅ Web Client ID criado com:
//       - URIs de redirecionamento: https://<teu-projeto>.supabase.co/auth/v1/callback
//
// 2. Supabase (Settings > Auth > Providers > Google):
//    ✅ Client ID: (Web Client ID)
//    ✅ Client Secret: (do Web Client)
//    ✅ Redirect URL: https://<teu-projeto>.supabase.co/auth/v1/callback
//    ✅ Android Client ID adicionado à lista (opcional)
//
// 3. Código da App:
//    ✅ GoogleSignin configurado com webClientId e androidClientId
//    ✅ Botão de Google Sign-In implementado
//
// IMPORTANTE: Substitua XXXXXXXXXX pelo Android Client ID real do Google Cloud Console