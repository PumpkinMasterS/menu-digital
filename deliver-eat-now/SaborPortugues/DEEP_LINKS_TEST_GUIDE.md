# 🔗 Guia de Teste - Deep Links SaborPortuguês

## ✅ **CORREÇÕES IMPLEMENTADAS**

### 1. **AndroidManifest.xml ✅**
- ✅ Adicionados intent filters para `saborportugues://`
- ✅ Adicionados intent filters para Universal Links `https://comituga.eu`
- ✅ Configurado `android:autoVerify="true"`

### 2. **app-redirect.html ✅**
- ✅ Removido IP hardcoded `10.69.147.2:8082`
- ✅ Implementada detecção de ambiente (dev/prod)
- ✅ Fallback automático para desenvolvimento
- ✅ Melhor debugging e logs

### 3. **App.tsx ✅**
- ✅ Melhorado parsing com expo-linking
- ✅ Suporte para múltiplos schemes: `saborportugues://`, `https://`, `exp://`
- ✅ Melhor tratamento de erros e debugging

### 4. **Dependências ✅**
- ✅ Adicionado `expo-linking` ao package.json
- ✅ Dependências instaladas

---

## 🧪 **COMO TESTAR**

### **Cenário 1: Desenvolvimento Local**

1. **Iniciar App**:
   ```bash
   cd SaborPortugues
   npm start
   ```

2. **Abrir no dispositivo** (Android):
   - Escanear QR code com Expo Go
   - OU usar `npm run android` para desenvolvimento

3. **Testar Deep Link Manual**:
   ```bash
   # No dispositivo Android via adb
   adb shell am start \
     -W -a android.intent.action.VIEW \
     -d "saborportugues://confirm?token=test123&type=signup" \
     com.comituga.saborportugues
   ```

### **Cenário 2: Email Real (Produção)**

1. **Registar email** na app SaborPortuguês
2. **Verificar email** recebido do Brevo
3. **Clicar no link** do email
4. **Verificar redirecionamento** app-redirect.html → app

### **Cenário 3: Teste Manual de URLs**

**URLs de Teste**:

```bash
# Custom scheme (principal)
saborportugues://confirm?token=abc123&type=signup

# Universal link (fallback)
https://comituga.eu/app-redirect.html?token=abc123&type=signup

# Development (só funciona em dev)
exp://192.168.1.100:8082/--/confirm?token=abc123&type=signup
```

---

## 🔍 **DEBUGGING**

### **Logs a Verificar**

**No app-redirect.html** (Browser DevTools):
```javascript
// Verifique no console:
📱 SaborPortuguês Redirect Page
🔍 Token: abc123...
📲 Is Mobile: true
🤖 Is Android: true
🔗 Attempting redirect to: saborportugues://confirm?token=abc123&type=signup
```

**Na App React Native** (Metro logs):
```javascript
🔗 Deep link received: saborportugues://confirm?token=abc123&type=signup
📍 Parsed URL: {hostname: "confirm", queryParams: {token: "abc123", type: "signup"}}
✅ Processing saborportugues:// scheme
🎯 Extracted params: {token: "abc123...", type: "signup"}
🎯 Handling email confirmation: {token: "abc123...", type: "signup"}
```

### **Problemas Comuns**

| Problema | Causa | Solução |
|----------|-------|---------|
| "App não abre" | Intent filters não aplicados | Rebuild da app: `npm run android` |
| "Token não encontrado" | URL malformado | Verificar logs do Brevo/Edge Function |
| "Deep link não funciona" | Scheme não registado | Verificar AndroidManifest.xml |

---

## 📱 **TESTAR NO DISPOSITIVO**

### **Android**

1. **Build da app** (se primeira vez):
   ```bash
   npm run android
   ```

2. **Testar deep link via navegador**:
   - Abrir browser no Android
   - Navegar para: `saborportugues://confirm?token=test123&type=signup`
   - App deve abrir automaticamente

3. **Testar via email**:
   - Enviar email de teste
   - Clicar no link no email
   - Verificar redirecionamento

### **iOS**

1. **Configurar associatedDomains** (já está no app.json):
   ```json
   "associatedDomains": ["applinks:comituga.eu"]
   ```

2. **Verificar /.well-known/apple-app-site-association** no servidor

---

## 🚨 **TROUBLESHOOTING**

### **App Não Abre**

1. **Verificar intent filters**:
   ```bash
   # Verificar se app está registada para o scheme
   adb shell dumpsys package com.comituga.saborportugues | grep -A 20 "filter"
   ```

2. **Rebuild da app**:
   ```bash
   cd SaborPortugues
   npm run android
   ```

### **Universal Links Não Funcionam**

1. **Verificar assetlinks.json**:
   - URL: `https://comituga.eu/.well-known/assetlinks.json`
   - Deve conter o package `com.comituga.saborportugues`

2. **Testar domínio**:
   ```bash
   curl https://comituga.eu/.well-known/assetlinks.json
   ```

### **Debugging Avançado**

**Ver logs detalhados no Android**:
```bash
adb logcat | grep -i "saborportugues\|intent\|deep"
```

**Verificar se URL é válida**:
```javascript
// No browser console
console.log(new URL('saborportugues://confirm?token=abc123&type=signup'));
```

---

## ✅ **CHECKLIST FINAL**

- [ ] App abre com `saborportugues://confirm?token=...`
- [ ] Universal links funcionam via `https://comituga.eu/app-redirect.html?token=...`
- [ ] Emails do Brevo redirecionam corretamente
- [ ] Tokens são extraídos e processados
- [ ] Confirmação de email funciona end-to-end
- [ ] Logs mostram debugging claro

---

## 📧 **Contacto de Suporte**

- **Email**: admin@comituga.eu
- **Logs**: Sempre incluir logs do Metro e browser DevTools 