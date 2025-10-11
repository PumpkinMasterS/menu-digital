# 🚀 **SETUP META DEVELOPERS + WHATSAPP BUSINESS API**

## 📋 **ETAPA 1: Criar Conta Meta Developers**

### 🔗 **Links importantes:**

- **Meta Developers:** https://developers.facebook.com/
- **Apps Dashboard:** https://developers.facebook.com/apps/
- **WhatsApp Business API:** https://developers.facebook.com/docs/whatsapp

### 👤 **Criar conta:**

1. Acesse: https://developers.facebook.com/
2. Clique **"Get Started"** (canto superior direito)
3. **Opções de login:**

   - ✅ **"I want to use Facebook Login"** (mais rápido)
   - 📧 **"Create a new account"** (se não tem Facebook)

4. **Verificação obrigatória:**
   - ✅ Confirmar email
   - ✅ Verificar telefone (SMS)
   - ✅ Aceitar termos de desenvolvedor

---

## 📱 **ETAPA 2: Criar App WhatsApp Business**

### 🎯 **Criar novo app:**

1. **Dashboard:** https://developers.facebook.com/apps/
2. **Clique:** "Create App" (botão azul)
3. **Tipo de app:** Selecione **"Business"**
4. **Informações do app:**
   ```
   App Display Name: Clever School Pal AI
   Contact Email: seu_email@dominio.com
   App Purpose: Education & Learning Platform
   Business Use Case: Educational AI Assistant
   ```

### ➕ **Adicionar WhatsApp:**

1. Na tela do app → **"Add Product"**
2. Encontre **"WhatsApp"** → Clique **"Set Up"**
3. Aguarde carregar o painel WhatsApp

---

## 🔧 **ETAPA 3: Configurar WhatsApp Business API**

### 📞 **Configurar número de teste:**

1. **Na seção "Getting Started":**
   - Você verá um número de teste do WhatsApp
   - **ANOTE:** o Phone Number ID (ex: `123456789012345`)

### 🔑 **Obter credenciais:**

#### **Access Token (Temporário - 24h):**

```
Copie o token que aparece na tela
Exemplo: EAABw...xyz (muito longo)
```

#### **Access Token (Permanente):**

1. Vá em **"App Settings" → "Basic"**
2. Anote o **App ID** e **App Secret**
3. Gere token permanente posteriormente

### 🌐 **Configurar Webhook:**

#### **URLs do webhook:**

```
Webhook URL: https://nsaodmuqjtabfblrrdqv.supabase.co/functions/v1/whatsapp-webhook
Verify Token: clever_school_2024
```

#### **Passos no Meta:**

1. **WhatsApp → Configuration**
2. **Edit webhook**
3. **Preencher:**
   - Webhook URL: `https://nsaodmuqjtabfblrrdqv.supabase.co/functions/v1/whatsapp-webhook`
   - Verify token: `clever_school_2024`
4. **Subscribe to:** `messages` (marcar checkbox)
5. **Save**

---

## 🎯 **ETAPA 4: Testar Configuração**

### 📱 **Número de teste:**

- Meta fornece um número de WhatsApp para testes
- Adicione SEU número pessoal como número de teste
- Envie mensagem para o número fornecido

### ✅ **Verificações:**

- [ ] App criado com sucesso
- [ ] WhatsApp adicionado ao app
- [ ] Phone Number ID anotado
- [ ] Access Token anotado
- [ ] Webhook configurado
- [ ] Seu número adicionado para testes

---

## 🔐 **CREDENCIAIS NECESSÁRIAS**

Anote estas informações (serão usadas no sistema):

```env
# Meta App Credentials
WHATSAPP_ACCESS_TOKEN=EAABw...xyz (token muito longo)
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_VERIFY_TOKEN=clever_school_2024

# App Info (para referência)
META_APP_ID=sua_app_id
META_APP_SECRET=sua_app_secret
```

---

## 🎓 **PRÓXIMOS PASSOS**

Após obter as credenciais:

1. **Configurar no Supabase:**

   ```bash
   .\supabase.exe secrets set WHATSAPP_ACCESS_TOKEN=seu_token
   .\supabase.exe secrets set WHATSAPP_PHONE_NUMBER_ID=seu_phone_id
   .\supabase.exe secrets set WHATSAPP_VERIFY_TOKEN=clever_school_2024
   ```

2. **Deploy da função webhook**

3. **Testar integração**

---

## 🆘 **PROBLEMAS COMUNS**

### ❌ **"Webhook verification failed"**

- Verificar se URL está correta
- Verificar se verify_token está correto
- Função webhook deve estar deployed

### ❌ **"Invalid access token"**

- Token expira em 24h (usar token permanente)
- Verificar se copiou token completo

### ❌ **"Phone number not verified"**

- Adicionar seu número na lista de testes
- Aguardar até 15 minutos para ativação

---

## 📞 **SUPORTE**

Se tiver problemas:

1. **Meta Support:** https://developers.facebook.com/support/
2. **WhatsApp Business API Docs:** https://developers.facebook.com/docs/whatsapp/cloud-api/
3. **Status da API:** https://developers.facebook.com/status/
