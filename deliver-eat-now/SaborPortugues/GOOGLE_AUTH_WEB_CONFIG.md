# 🔧 Configuração Google Auth - Supabase Dashboard

## ⚠️ **IMPORTANTE: Configurar URLs de Redirecionamento**

Para o Google Sign-In funcionar na versão web, precisas configurar as URLs de redirecionamento no **Supabase Dashboard**.

### 📋 **Passos para Configurar:**

#### 1. **Aceder ao Supabase Dashboard**
- Ir para: https://supabase.com/dashboard
- Selecionar projeto: **"Sabores de Portugal"**
- ID: `misswwtaysshbnnsjhtv`

#### 2. **Configurar Google Provider**
- **Settings** → **Authentication** → **Providers**
- Clicar em **Google**
- **Enabled:** ✅ Ativar

#### 3. **URLs de Redirecionamento**
Adicionar estas URLs na secção **"Site URL"** e **"Redirect URLs"**:

```
# Para desenvolvimento local:
http://localhost:8083

# Para produção (quando fizeres deploy):
https://teu-dominio.com
```

#### 4. **Credenciais Google**
- **Client ID:** `815491836975-vsol2870hqfg6v4l82ejqmmab9k9rqc7.apps.googleusercontent.com`
- **Client Secret:** (obter do Google Cloud Console)

### 🌐 **URLs de Callback Automáticas**
O Supabase automaticamente adiciona estas URLs:
- `https://misswwtaysshbnnsjhtv.supabase.co/auth/v1/callback`

### 🔍 **Verificar Configuração Atual**

#### Magic Links (Brevo SMTP):
- ✅ **Configurado** - Brevo SMTP ativo
- ✅ **Rate Limits** - 300 emails/hora
- ✅ **Deliverability** - Excelente

#### Google Auth:
- ⚠️ **Pendente** - Configurar URLs no Dashboard
- ✅ **Credenciais** - Web Client ID configurado
- ✅ **Código** - AuthScreenWeb implementado

### 🧪 **Testar Após Configuração:**

1. **Google Sign-In:**
   - Clicar "Continuar com Google"
   - Redirecionamento para Google
   - Voltar para a aplicação autenticado

2. **Magic Links:**
   - Inserir email
   - Receber email do Brevo
   - Clicar no link → autenticação

### 🚨 **Erros Comuns:**

#### "redirect_uri_mismatch"
- **Causa:** URL não configurada no Supabase
- **Solução:** Adicionar `http://localhost:8083` nas Redirect URLs

#### "MetaMask error"
- **Causa:** Extensão do browser a interferir
- **Solução:** ✅ **RESOLVIDO** - AuthScreenWeb não usa MetaMask

#### "404 auth endpoint"
- **Causa:** URLs de callback incorretas
- **Solução:** Verificar configuração no Dashboard

### 📞 **Próximos Passos:**

1. **🔧 AGORA:** Configurar URLs no Supabase Dashboard
2. **🧪 TESTAR:** Google Sign-In na versão web
3. **📧 VERIFICAR:** Magic Links com Brevo
4. **📱 ANDROID:** Usar Expo Go temporariamente

---

**Status:** ⚠️ **Configuração Pendente** - Supabase Dashboard
**URL Teste:** http://localhost:8083