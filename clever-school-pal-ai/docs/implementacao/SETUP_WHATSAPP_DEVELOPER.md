# 🛠️ Setup WhatsApp Developer Account - Guia Passo a Passo

## 🎯 Objetivo

Configurar conta pessoal de desenvolvedor para testar integração WhatsApp Business API com o Clever School Pal AI.

## 📋 Pré-requisitos

- Conta Facebook pessoal
- Número de telefone para verificação
- Projeto Supabase funcionando
- 15-30 minutos disponíveis

---

## 🚀 Passo 1: Criar App no Meta Developers

### 1.1 Acessar Portal

```
🌐 Ir para: https://developers.facebook.com
📱 Fazer login com sua conta Facebook pessoal
```

### 1.2 Criar Nova App

```
1. Clicar "Create App" (botão verde)
2. Selecionar tipo: "Business"
3. Preencher informações:
   - App Name: "Clever School Pal AI Dev"
   - App Contact Email: seu_email@gmail.com
   - Purpose: "Myself or my own business"
4. Clicar "Create App"
```

### 1.3 Verificar Email

```
📧 Verificar email que recebeu do Meta
🔗 Clicar no link de confirmação
```

---

## 🚀 Passo 2: Adicionar WhatsApp Business

### 2.1 No Dashboard da App

```
📊 Você verá o dashboard da app criada
➕ Procurar seção "Add a Product"
📱 Encontrar "WhatsApp Business" → Clicar "Set up"
```

### 2.2 Escolher Business Account

```
🏢 Se aparecer para selecionar Business Account:
   - Selecionar "Create a business account"
   - Ou usar uma existente se tiver

📝 Preencher:
   - Business Name: "Dev Clever School"
   - Business Email: seu_email@gmail.com
```

---

## 🚀 Passo 3: Configurar Número de Teste

### 3.1 Obter Número de Teste

```
📍 Na seção WhatsApp Business → "Getting Started"
📱 Você verá um número de teste automático tipo:
   "+1 555-0199" (exemplo)

✅ Este número é GRATUITO para desenvolvimento
```

### 3.2 Adicionar Números de Teste

```
📞 Na seção "API Setup" → "Recipient phone numbers"
➕ Clicar "Add phone number"
📱 Adicionar SEU número pessoal
📨 Verificar código SMS que receber
```

---

## 🚀 Passo 4: Configurar Webhook

### 4.1 Obter URL do Webhook

```
🔗 Sua URL Supabase será algo como:
https://nsaodmuqjtabfblrrdqv.supabase.co/functions/v1/whatsapp-webhook

✅ Esta URL já está implementada no projeto!
```

### 4.2 Configurar no Meta

```
📍 Ir para "WhatsApp" → "Configuration"
🔗 Webhook URL: colar sua URL Supabase
🔐 Verify Token: criar um token (ex: "clever_school_dev_2024")
📝 Webhook Fields: selecionar "messages"
✅ Clicar "Verify and Save"
```

### 4.3 Se der Erro de Verificação

```
❌ "The callback URL or verify token couldn't be validated"

🔧 SOLUÇÃO:
1. Ir para Supabase Dashboard
2. Settings → Functions
3. Secrets → Add new secret:
   - Name: WHATSAPP_TOKEN
   - Value: clever_school_dev_2024
4. Tentar verificar novamente
```

---

## 🚀 Passo 5: Obter Credenciais

### 5.1 Access Token

```
📍 Ir para "WhatsApp" → "API Setup"
🔑 Copiar "Temporary access token"
⚠️  ATENÇÃO: Token temporário expira em 24h
💡 Para desenvolvimento é suficiente
```

### 5.2 Phone Number ID

```
📞 Na mesma seção "API Setup"
📋 Copiar "Phone number ID"
💡 Será algo como: "123456789012345"
```

### 5.3 Webhook Verify Token

```
🔐 O token que você criou no passo 4.2
💡 Ex: "clever_school_dev_2024"
```

---

## 🚀 Passo 6: Configurar Variáveis no Supabase

### 6.1 Adicionar Secrets

```bash
# No terminal do projeto:
supabase secrets set WHATSAPP_ACCESS_TOKEN="EAAxxxxx..."
supabase secrets set WHATSAPP_PHONE_NUMBER_ID="123456789012345"
supabase secrets set WHATSAPP_TOKEN="clever_school_dev_2024"
```

### 6.2 Verificar Secrets

```bash
supabase secrets list
# Deve mostrar as 3 variáveis configuradas
```

---

## 🧪 Passo 7: Testar Integração

### 7.1 Teste Básico do Sistema

```bash
# No terminal do projeto:
node test-whatsapp-integration.js
```

### 7.2 Teste Real via WhatsApp

```
📱 Do SEU número pessoal (que adicionou como testador)
📤 Enviar mensagem para o número de teste do Meta
📨 Ex: "Olá, tenho dúvida de matemática"
```

### 7.3 O que Deve Acontecer

```
1. 📱 Você envia mensagem → Número de teste Meta
2. 📡 Meta envia webhook → Supabase Function
3. 🤖 AI processa → Gera resposta
4. 📤 Resposta volta → Seu WhatsApp

✅ Se funcionou: Sistema operacional!
❌ Se não funcionou: Ver logs no Supabase
```

---

## 🔍 Debugging

### Verificar Logs

```bash
# Ver logs do webhook
supabase functions logs whatsapp-webhook --follow

# Ver logs da AI
supabase functions logs ai-query --follow
```

### Problemas Comuns

#### Webhook não funciona

```
❌ Problema: Webhook returning 403
🔧 Solução: Verificar WHATSAPP_TOKEN no Supabase Secrets
```

#### Token expirado

```
❌ Problema: "Invalid access token"
🔧 Solução: Gerar novo token no Meta Developers
```

#### Estudante não encontrado

```
❌ Problema: "Student not found"
🔧 Solução: Executar setup-whatsapp-students.js
```

---

## 🎉 Próximos Passos

Após configuração:

1. ✅ Testar com múltiplos estudantes fictícios
2. ✅ Simular diferentes tipos de perguntas
3. ✅ Verificar custos no Meta Business Manager
4. ✅ Preparar para migração para conta empresarial

---

## 💰 Limites de Desenvolvimento

```
📊 Conta de Desenvolvedor:
├── 💌 1.000 mensagens/mês GRÁTIS
├── 📱 1 número de teste
├── 👥 50 números testadores máximo
└── ⚠️  Não pode ser usado comercialmente
```

**Perfeito para desenvolvimento e testes!** 🚀
