# 🚀 Guia de Configuração - Serviços Externos

Este guia te ajudará a configurar os serviços de email e SMS para o sistema de OTP.

## 📧 Configuração do EmailJS (GRATUITO)

### 1. Criar Conta no EmailJS
1. Acesse: https://www.emailjs.com/
2. Clique em "Sign Up" e crie uma conta gratuita
3. Confirme seu email

### 2. Configurar Serviço de Email
1. No dashboard, clique em "Email Services"
2. Clique em "Add New Service"
3. Escolha seu provedor (Gmail, Outlook, Yahoo, etc.)
4. Siga as instruções para conectar sua conta
5. **Anote o Service ID** (ex: service_abc123)

### 3. Criar Template de Email
1. Clique em "Email Templates"
2. Clique em "Create New Template"
3. Cole o HTML fornecido no arquivo `api_config.dart` (linhas 47-97)
4. **Anote o Template ID** (ex: template_xyz789)

### 4. Obter Chaves de API
1. Vá em "Account" → "General"
2. **Anote o Public Key** (ex: user_abc123)
3. **Anote o Private Key** (ex: private_xyz789)

### 5. Configurar no Projeto
Edite o arquivo `lib/config/api_config.dart`:

```dart
static const String emailJsServiceId = 'service_abc123';    // Seu Service ID
static const String emailJsTemplateId = 'template_xyz789';  // Seu Template ID
static const String emailJsPublicKey = 'user_abc123';       // Seu Public Key
static const String emailJsPrivateKey = 'private_xyz789';   // Seu Private Key
```

## 📱 Configuração do SMS

### Opção 1: TextBelt (GRATUITO - Recomendado para testes)

**Vantagens:**
- ✅ Totalmente gratuito
- ✅ 1 SMS por dia por IP
- ✅ Sem cadastro necessário
- ✅ Funciona imediatamente

**Limitações:**
- ⚠️ Apenas 1 SMS por dia por IP
- ⚠️ Pode ter delays ocasionais

**Configuração:**
```dart
static const bool useTextBelt = true; // Já configurado por padrão
```

### Opção 2: Twilio (PAGO - Recomendado para produção)

**Vantagens:**
- ✅ Muito confiável
- ✅ $15 de crédito grátis
- ✅ Suporte global
- ✅ APIs robustas

**Configuração:**
1. Acesse: https://www.twilio.com/
2. Crie uma conta (receba $15 grátis)
3. Vá em "Console" → "Account Info"
4. **Anote o Account SID** (ex: ACxxxxx)
5. **Anote o Auth Token** (ex: xxxxx)
6. Vá em "Phone Numbers" → "Manage" → "Buy a number"
7. Compre um número (cerca de $1/mês)
8. **Anote o Phone Number** (ex: +1234567890)

Edite `lib/config/api_config.dart`:
```dart
static const bool useTextBelt = false; // Usar Twilio
static const String twilioAccountSid = 'ACxxxxx';
static const String twilioAuthToken = 'xxxxx';
static const String twilioPhoneNumber = '+1234567890';
```

## 🧪 Como Testar

### 1. Testar Email
1. Execute o app: `flutter run -d web-server --web-port=8081`
2. Acesse: http://localhost:8081
3. Clique em "Criar conta com Email"
4. Digite seu email real
5. Clique em "Entrar"
6. Verifique sua caixa de entrada

### 2. Testar SMS
1. No app, clique em "Criar conta com Telefone"
2. Digite seu número (formato: +5511999999999)
3. Clique em "Entrar"
4. Aguarde o SMS chegar

## 🔧 Solução de Problemas

### Email não chega
- ✅ Verifique spam/lixo eletrônico
- ✅ Confirme as chaves no `api_config.dart`
- ✅ Verifique o console do navegador (F12)
- ✅ Teste com outro email

### SMS não chega
- ✅ Verifique o formato do telefone (+5511999999999)
- ✅ Para TextBelt: aguarde até 5 minutos
- ✅ Para Twilio: verifique saldo e configurações
- ✅ Teste com outro número

### Erros Comuns
```
❌ EmailJS não configurado
→ Configure as chaves em api_config.dart

❌ Twilio não configurado  
→ Configure as chaves ou use TextBelt

❌ Erro 400/401
→ Verifique se as chaves estão corretas
```

## 💰 Custos

### EmailJS
- **Gratuito:** 200 emails/mês
- **Pago:** $15/mês para 1000 emails

### TextBelt
- **Gratuito:** 1 SMS/dia por IP
- **Pago:** $0.0075 por SMS

### Twilio
- **Crédito inicial:** $15 grátis
- **SMS:** ~$0.0075 por SMS
- **Número:** ~$1/mês

## 🎯 Recomendações

**Para Desenvolvimento/Testes:**
- Email: EmailJS (gratuito)
- SMS: TextBelt (gratuito)

**Para Produção:**
- Email: EmailJS (pago) ou SendGrid
- SMS: Twilio (mais confiável)

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs no console
2. Teste com dados diferentes
3. Confirme as configurações
4. Verifique a conexão com internet

**Logs importantes:**
- `✅ Email enviado com sucesso!`
- `✅ SMS enviado com sucesso!`
- `❌ Erro ao enviar...` (verifique a causa)