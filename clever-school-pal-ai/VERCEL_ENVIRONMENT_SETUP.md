# 🚀 Configuração de Variáveis de Ambiente no Vercel - Connect AI

## ❌ Problema Atual
O `vercel.json` está configurado para usar secrets (`@supabase_url`, `@supabase_anon_key`) que **precisam ser configurados** no dashboard do Vercel.

**Se essas variáveis não estiverem configuradas, a aplicação pode falhar e mostrar página padrão do Vite.**

## ✅ Solução: Configurar no Dashboard Vercel

### 1. **Acesse o Dashboard Vercel**
- Vá para [vercel.com/dashboard](https://vercel.com/dashboard)
- Encontre seu projeto `connectai-tbgk3qttq-fabio-vasoncelos-projects`
- Clique no projeto

### 2. **Configure Environment Variables**
- Vá para **Settings** > **Environment Variables**
- Adicione as seguintes variáveis:

#### **Variáveis Obrigatórias:**
```
VITE_SUPABASE_URL = https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY = sua_chave_anonima_aqui
```

#### **Variáveis Opcionais (para funcionalidades avançadas):**
```
OPENROUTER_API_KEY = sua_chave_openrouter
OPENROUTER_BASE_URL = https://openrouter.ai/api/v1
AI_MODEL = meta-llama/llama-3.1-70b-instruct
WHATSAPP_ACCESS_TOKEN = seu_token_whatsapp
WHATSAPP_PHONE_NUMBER_ID = seu_phone_id
LEONARDO_API_KEY = sua_chave_leonardo
IDEOGRAM_API_KEY = sua_chave_ideogram
```

### 3. **Onde Encontrar as Chaves Supabase**
1. **Acesse seu projeto Supabase:** [app.supabase.com](https://app.supabase.com)
2. **Vá para Settings > API**
3. **Copie:**
   - **Project URL** → use como `VITE_SUPABASE_URL`
   - **anon public** key → use como `VITE_SUPABASE_ANON_KEY`

### 4. **Aplique as Mudanças**
- Após adicionar as variáveis, clique **Save**
- Vá para **Deployments**
- Clique nos **3 pontos** do último deploy
- Selecione **Redeploy**

## 🔧 Alternativa: Usar .env Direto

Se preferir não usar secrets, edite o `vercel.json`:

```json
{
  "env": {
    "VITE_SUPABASE_URL": "https://seu-projeto.supabase.co",
    "VITE_SUPABASE_ANON_KEY": "sua_chave_anonima_aqui"
  }
}
```

## 🎯 Teste após Configuração

1. **Aguarde o redeploy** (2-3 minutos)
2. **Acesse:** `https://connectai-tbgk3qttq-fabio-vasoncelos-projects.vercel.app/`
3. **Deve mostrar:** Login da Connect AI (não mais Vite + React)
4. **Para debug:** Acesse `/debug/environment` para verificar as variáveis

## ⚠️ Pontos Importantes

- **Secrets começam com @** no vercel.json (ex: `@supabase_url`)
- **Variáveis VITE_** são expostas no frontend
- **Nunca exponha** chaves privadas como service_role keys
- **Use apenas** a chave `anon` do Supabase

## 🆘 Se Ainda Não Funcionar

Execute estas URLs para debug:
- `/debug/environment` - Verificar variáveis de ambiente
- `/debug/vite` - Verificar se há restos do template Vite

**Mais provável:** As variáveis de ambiente não estão configuradas no Vercel, fazendo a app falhar e mostrar fallback do Vite.