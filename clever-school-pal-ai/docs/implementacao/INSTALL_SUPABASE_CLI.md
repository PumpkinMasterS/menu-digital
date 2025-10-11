# 🛠️ Instalação do Supabase CLI

## 🎯 Para que serve

O Supabase CLI permite fazer deploy das funções Edge (incluindo o webhook do WhatsApp) e gerenciar secrets.

---

## 🪟 **Windows (Recomendado)**

### Opção 1: Chocolatey (Mais Fácil)

```powershell
# 1. Instalar Chocolatey (se não tiver)
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 2. Instalar Supabase CLI
choco install supabase
```

### Opção 2: Scoop

```powershell
# 1. Instalar Scoop (se não tiver)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# 2. Instalar Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Opção 3: Download Direto

```
1. Ir para: https://github.com/supabase/cli/releases
2. Baixar: supabase_windows_amd64.zip
3. Extrair para C:\tools\supabase\
4. Adicionar C:\tools\supabase\ ao PATH
```

---

## 🐧 **Linux**

```bash
# NPM
npm install -g @supabase/supabase-js

# ou Homebrew
brew install supabase/tap/supabase
```

---

## 🍎 **macOS**

```bash
# Homebrew
brew install supabase/tap/supabase

# ou NPM
npm install -g @supabase/supabase-js
```

---

## ✅ **Verificar Instalação**

```bash
# Verificar se instalou
supabase --version

# Deve mostrar algo como:
# supabase version 1.123.4
```

---

## 🔐 **Login e Setup**

```bash
# 1. Login (será redirecionado para browser)
supabase login

# 2. Link com projeto (na pasta do projeto)
supabase link --project-ref nsaodmuqjtabfblrrdqv

# 3. Verificar funções
supabase functions list
```

---

## 🚀 **Deploy das Funções**

```bash
# Deploy função WhatsApp Webhook
supabase functions deploy whatsapp-webhook

# Deploy função AI Query
supabase functions deploy ai-query

# Deploy todas as funções
supabase functions deploy
```

---

## 🔐 **Gerenciar Secrets**

```bash
# Listar secrets existentes
supabase secrets list

# Adicionar secret
supabase secrets set NOME_SECRET="valor"

# Exemplo para WhatsApp
supabase secrets set WHATSAPP_TOKEN="clever_school_dev_2024"
```

---

## 🔍 **Ver Logs**

```bash
# Ver logs em tempo real
supabase functions logs whatsapp-webhook --follow
supabase functions logs ai-query --follow

# Ver logs específicos
supabase functions logs whatsapp-webhook --limit 50
```

---

## ❌ **Resolução de Problemas**

### "supabase command not found"

```bash
# Windows: Reinstalar e verificar PATH
where supabase

# Linux/Mac: Verificar instalação
which supabase
```

### "Project not linked"

```bash
# Na pasta do projeto
supabase link --project-ref nsaodmuqjtabfblrrdqv
```

### "Authentication failed"

```bash
# Fazer login novamente
supabase logout
supabase login
```

---

## 📋 **Comandos Essenciais para o Projeto**

```bash
# Setup inicial (apenas uma vez)
supabase login
supabase link --project-ref nsaodmuqjtabfblrrdqv

# Deploy das funções WhatsApp
supabase functions deploy whatsapp-webhook
supabase functions deploy ai-query

# Configurar secrets do WhatsApp (após obter no Meta)
supabase secrets set WHATSAPP_ACCESS_TOKEN="EAAxxxxx..."
supabase secrets set WHATSAPP_PHONE_NUMBER_ID="123456789"
supabase secrets set WHATSAPP_TOKEN="clever_school_dev_2024"

# Verificar se tudo funcionou
supabase functions list
supabase secrets list
```

**Após instalação, volte para configurar o WhatsApp!** 🚀
