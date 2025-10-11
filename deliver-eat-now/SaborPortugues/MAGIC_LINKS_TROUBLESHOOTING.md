# 🔧 **Magic Links - Problemas e Soluções**

## ❌ **Principais Problemas dos Magic Links**

### 1. **Rate Limits do Supabase**
- **Problema:** Provider padrão tem limite de **30 emails/hora**
- **Solução:** Configurar SMTP personalizado (SendGrid, AWS SES, etc.)

### 2. **Email Scanners Corporativos**
- **Problema:** Empresas têm scanners que "consomem" os links antes do utilizador
- **Solução:** Links single-use ficam inválidos após scanner

### 3. **Spam Filters**
- **Problema:** Emails com "verification", "password reset" são bloqueados
- **Solução:** SMTP personalizado com domínio confiável

### 4. **Links Single-Use**
- **Problema:** Se o scanner abrir, o utilizador não consegue usar
- **Solução:** Template personalizado com botão em vez de link direto

## ✅ **Soluções Recomendadas**

### **Opção 1: SMTP Personalizado (Recomendado)**
1. **SendGrid** (Grátis até 100 emails/dia)
2. **AWS SES** (Muito barato)
3. **Mailgun** (Grátis até 5000 emails/mês)

### **Opção 2: Template Personalizado**
```html
<h2>Confirma a tua conta - SaborPortuguês</h2>
<p>Clica no botão abaixo para confirmares a tua conta:</p>
<a href="https://saborportugues.app/auth/confirm?token={{ .Token }}" 
   style="background: #ff6b35; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
   ✅ Confirmar Conta
</a>
<p>Se o botão não funcionar, copia este link: {{ .ConfirmationURL }}</p>
```

### **Opção 3: OTP em vez de Magic Links**
- Código de 6 dígitos
- Mais seguro contra scanners
- Melhor UX em alguns casos

## 🚀 **Próximos Passos**

1. **Configurar SendGrid SMTP**
2. **Testar Development Build**
3. **Verificar logs de entrega**
4. **Implementar fallback para OTP**

## 📊 **Status Atual**

| Componente | Status | Notas |
|------------|--------|-------|
| Google Auth | ✅ Configurado | Pronto para Development Build |
| Magic Links | ⚠️ Problemas | Rate limits + Email scanners |
| SMTP Setup | ❌ Pendente | Configurar SendGrid |
| Development Build | 🔄 Em progresso | EAS Build iniciado |