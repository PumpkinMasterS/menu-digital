# 🍽️ SaborPortuguês Android - Guia de Configuração Rápida

## ✅ **O QUE FOI IMPLEMENTADO**

### 🎨 **Design Moderno 2025**
- ✅ **Cores Laranja**: Design inspirado no Too Good To Go com gradientes modernos
- ✅ **UI 2025**: Interface clean com sombras, bordas arredondadas e tipografia moderna
- ✅ **Responsivo**: Adaptado para diferentes tamanhos de ecrã

### 🔐 **Autenticação Email-First**
- ✅ **Fluxo como Too Good To Go**: Email → Aceitar Termos → Confirmar Email → Login
- ✅ **Deep Links**: Links do email abrem diretamente a app
- ✅ **Políticas GDPR**: Termos e Privacidade completos em português
- ✅ **Edge Function**: `send-signup-confirmation` já deployada e funcional

### 📧 **Integração Brevo (Email)**
- ✅ **Template Profissional**: Email HTML com branding SaborPortuguês
- ✅ **Cores Laranja**: Gradientes e elementos visuais consistentes
- ✅ **Personalização**: Placeholders para URL, device info, etc.

---

## 🚀 **COMO USAR**

### **1. Executar a App**
```bash
cd SaborPortugues
npm install
npx expo start
```

### **2. Testar no Dispositivo**
- **Expo Go**: Escanear QR code com a app Expo Go
- **Emulador**: Pressionar 'a' para Android ou 'i' para iOS
- **Dispositivo**: Usar Expo CLI tunnel

### **3. Fluxo de Autenticação**
1. **Tela Inicial**: "SABORES AUTÊNTICOS DE PORTUGAL" 🇵🇹
2. **Clicar**: "Continuar com e-mail" (botão laranja)
3. **Email**: Inserir email + aceitar termos
4. **Confirmar**: Receber email via Brevo
5. **Deep Link**: Clicar no link do email
6. **Login**: Automático após confirmação

---

## ⚙️ **CONFIGURAÇÃO BREVO**

### **1. Criar Template no Brevo**
1. Ir para Brevo Dashboard → Templates → Criar Template
2. Copiar o código de `brevo-templates/signup-confirmation-saborportugues.html`
3. Configurar placeholders:
   - `{{CONFIRMATION_URL}}` - URL de confirmação
   - `{{DEVICE_TYPE}}` - Android/iOS 
   - `{{COUNTRY}}` - Portugal
   - `{{IP_ADDRESS}}` - Endereço IP

### **2. Configurar Edge Function**
A função `send-signup-confirmation` já está deployada. Para configurar:

```bash
# No projeto principal (não no SaborPortugues)
supabase secrets set BREVO_API_KEY=your_brevo_api_key
supabase secrets set BREVO_TEMPLATE_ID=your_template_id
```

### **3. Testar Email**
```bash
# Testar a Edge Function
curl -L -X POST 'https://misswwtaysshbnnsjhtv.supabase.co/functions/v1/send-signup-confirmation' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json' \
  --data '{"email":"teste@exemplo.com"}'
```

---

## 📱 **FUNCIONALIDADES IMPLEMENTADAS**

### **AuthScreen.tsx**
- ✅ Design inspirado no Too Good To Go
- ✅ Ecrã inicial com hero section
- ✅ Botão email laranja com gradiente
- ✅ Modal de Termos e Privacidade completos
- ✅ Validação de email português
- ✅ Integração com Edge Function

### **App.tsx**
- ✅ Gestão de sessão automatizada
- ✅ Loading state com cores laranja
- ✅ Welcome screen após login
- ✅ Logout funcional

### **Supabase Integration**
- ✅ Cliente configurado com AsyncStorage
- ✅ Auth state management
- ✅ Environment variables support

---

## 🎯 **PRÓXIMOS PASSOS**

### **Para Produção:**
1. **Configurar Brevo API Key** (secrets do Supabase)
2. **Testar fluxo completo** email → confirmação → login
3. **Build Android** (`expo build:android`)
4. **Deploy na Play Store**

### **Para Desenvolvimento:**
1. **Adicionar navegação** (React Navigation)
2. **Ecrãs principais** (Home, Menu, Carrinho)
3. **Integração completa** com backend SaborPortuguês

---

## 📞 **SUPORTE**

- **Email**: admin@comituga.eu
- **Edge Function**: `send-signup-confirmation` já deployada
- **Supabase Project**: `misswwtaysshbnnsjhtv`
- **Domain**: comituga.eu

---

## 🎨 **Paleta de Cores**

```css
/* Cores Principais */
--laranja-principal: #FF6B35
--laranja-secundario: #F7931E
--gradiente: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)

/* Cores de Suporte */
--fundo: #f8f9fa
--texto-escuro: #333333
--texto-medio: #666666
--sucesso: #10b981
```

---

**🇵🇹 Feito com ❤️ para Portugal | Estilo UberEats 2025** 