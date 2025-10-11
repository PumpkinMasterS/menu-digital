# 🔑 Configuração Google Authentication - SaborPortugues

## ✅ Informações para configurar no Google Cloud Console

### 📱 **Android App Configuration**
- **Tipo de aplicativo:** Android
- **Nome:** Cliente Android SaborPortugues  
- **Nome do pacote:** `com.comituga.saborportugues`
- **SHA-1 fingerprint:** `93:16:B6:DA:68:B5:F4:02:5B:7D:75:0D:59:26:D4:2D:C5:89:CF:4C`

### 🌐 **Web App Configuration**
- **Tipo de aplicativo:** Aplicação web
- **Nome:** Cliente Web SaborPortugues
- **URIs de redirecionamento autorizados:** 
  ```
  https://misswwtaysshbnnsjhtv.supabase.co/auth/v1/callback
  ```

## 🔧 **Para configurar no Supabase**

### Authentication > Providers > Google:
1. **Enable Sign in with Google:** ✅ Ativado
2. **Client IDs:** `815491836975-0d3b655ed1ss7kfdbtvhh4ftq7m72fi4.apps.googleusercontent.com,[ANDROID_CLIENT_ID]` (separados por vírgula)
3. **Client Secret (for OAuth):** `[WEB_CLIENT_SECRET]`
4. **Callback URL (for OAuth):** `https://misswwtaysshbnnsjhtv.supabase.co/auth/v1/callback`

## 📋 **Passos a seguir:**

### 1. Google Cloud Console
1. Vá para: https://console.cloud.google.com/apis/credentials
2. Crie credenciais OAuth 2.0 para Android (use os dados acima)
3. Crie credenciais OAuth 2.0 para Web (use os dados acima)
4. Copie os Client IDs e Client Secret gerados

### 2. Supabase
1. Vá para: https://misswwtaysshbnnsjhtv.supabase.co/project/_/auth/providers
2. Configure o Google provider com as credenciais obtidas

### 3. App Configuration
1. ✅ **Web Client ID já configurado:** `815491836975-0d3b655ed1ss7kfdbtvhh4ftq7m72fi4.apps.googleusercontent.com`
2. Ainda precisas do Android Client ID - cria no Google Cloud Console
3. Edita: `config/google-auth.ts` e substitui `YOUR_ANDROID_CLIENT_ID_HERE`

### 4. Google Services (Android)
1. No Google Cloud Console, baixe o `google-services.json`
2. Coloque em: `android/app/google-services.json`

## 🎯 **Dados já configurados na app:**
- ✅ Biblioteca `@react-native-google-signin/google-signin` instalada
- ✅ Botão "Continuar com Google" adicionado
- ✅ Função de login implementada
- ✅ Configuração no `app.json` atualizada
- ✅ SHA-1 fingerprint obtido: `93:16:B6:DA:68:B5:F4:02:5B:7D:75:0D:59:26:D4:2D:C5:89:CF:4C`

## 🚀 **Após configurar tudo:**
```bash
npx expo start --clear
```

O Google Sign-In estará funcionando! 🎉