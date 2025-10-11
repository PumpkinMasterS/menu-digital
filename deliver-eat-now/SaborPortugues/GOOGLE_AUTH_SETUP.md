# Configuração do Google Authentication

## Passos para configurar o Google Sign-In

### 1. Google Cloud Console

1. **Acesse o Google Cloud Console:**
   - Vá para: https://console.cloud.google.com/
   - Faça login com sua conta Google

2. **Crie ou selecione um projeto:**
   - Se não tiver um projeto, clique em "Criar projeto"
   - Nome sugerido: "SaborPortugues"

3. **Ative a Google Sign-In API:**
   - Vá para "APIs e serviços" > "Biblioteca"
   - Procure por "Google Sign-In API" ou "Google+ API"
   - Clique em "Ativar"

### 2. Criar credenciais OAuth 2.0

#### Para Android:
1. Vá para "APIs e serviços" > "Credenciais"
2. Clique em "Criar credenciais" > "ID do cliente OAuth 2.0"
3. Selecione "Android"
4. Preencha:
   - **Nome:** Cliente Android SaborPortugues
   - **Nome do pacote:** `com.comituga.saborportugues`
   - **SHA-1:** (veja como obter abaixo)

#### Para Web (necessário para Supabase):
1. Clique em "Criar credenciais" > "ID do cliente OAuth 2.0"
2. Selecione "Aplicação web"
3. Preencha:
   - **Nome:** Cliente Web SaborPortugues
   - **URIs de redirecionamento autorizados:** 
     ```
     https://misswwtaysshbnnsjhtv.supabase.co/auth/v1/callback
     ```

### 3. Obter SHA-1 Fingerprint

#### Método 1: Android Studio
1. Abra o Android Studio
2. Abra o projeto SaborPortugues
3. Vá para "Gradle" > "android" > "signingReport"
4. Execute o task
5. Copie o SHA1 do "debug" keystore

#### Método 2: Linha de comando
```bash
# Windows (PowerShell)
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android

# macOS/Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### 4. Configurar Supabase

1. **Acesse seu projeto Supabase:**
   - URL: https://misswwtaysshbnnsjhtv.supabase.co

2. **Vá para Authentication > Providers:**
   - Encontre "Google"
   - Ative "Enable Sign in with Google"

3. **Preencha os campos:**
   - **Client IDs:** Cole os Client IDs do Android e Web (separados por vírgula)
   - **Client Secret:** Cole o Client Secret do Web Client
   - **Callback URL:** `https://misswwtaysshbnnsjhtv.supabase.co/auth/v1/callback`

### 5. Atualizar configuração da app

1. **Edite o arquivo:** `config/google-auth.ts`
2. **Substitua os valores:**
   ```typescript
   export const GOOGLE_AUTH_CONFIG = {
     WEB_CLIENT_ID: 'SEU_WEB_CLIENT_ID.apps.googleusercontent.com',
     ANDROID_CLIENT_ID: 'SEU_ANDROID_CLIENT_ID.apps.googleusercontent.com',
   };
   ```

### 6. Adicionar google-services.json (Android)

1. **No Google Cloud Console:**
   - Vá para "Configurações do projeto"
   - Clique em "Adicionar app" > "Android"
   - Use o nome do pacote: `com.comituga.saborportugues`
   - Baixe o arquivo `google-services.json`

2. **Coloque o arquivo:**
   - Salve em: `android/app/google-services.json`

### 7. Testar a configuração

1. **Rebuild da app:**
   ```bash
   npx expo run:android
   ```

2. **Teste o login:**
   - Abra a app
   - Clique em "Continuar com Google"
   - Verifique se o login funciona

## Informações importantes

- **Package name:** `com.comituga.saborportugues`
- **Callback URL:** `https://misswwtaysshbnnsjhtv.supabase.co/auth/v1/callback`
- **Scheme:** `saborportugues://`

## Troubleshooting

### Erro "DEVELOPER_ERROR"
- Verifique se o SHA-1 está correto
- Confirme se o package name está correto
- Aguarde até 5 minutos para as configurações entrarem em vigor

### Erro "SIGN_IN_CANCELLED"
- Normal quando o utilizador cancela o login

### Erro "PLAY_SERVICES_NOT_AVAILABLE"
- Instale o Google Play Services no dispositivo/emulador