# 📱 Guia de Produção: WhatsApp Cloud API + LLMs (OpenRouter)

Este guia leva você do ambiente de testes para produção real usando a WhatsApp Cloud API integrada às nossas Edge Functions e LLMs via OpenRouter.

## ✅ Visão Geral
- Backend: Supabase Edge Functions (`whatsapp-webhook`, `whatsapp-integration`, `ai-query`, `ai-query-with-context`).
- IA: OpenRouter (`OPENROUTER_API_KEY`, `AI_MODEL`, `EMBEDDING_MODEL`).
- WhatsApp: Graph API (`/v20.0/{phone_number_id}/messages`) e Webhook verificado.

## 🔑 Pré-requisitos
- Conta Meta Developers: https://developers.facebook.com/
- Meta Business Manager: https://business.facebook.com/
- App com o produto WhatsApp adicionado: https://developers.facebook.com/apps/
- Número de telefone (teste ou produção) no WhatsApp Manager.

## 1) Criar Conta e App na Meta
1. Acesse https://developers.facebook.com/ e crie sua conta de desenvolvedor.
2. Acesse https://business.facebook.com/ e crie ou selecione sua Business.
3. Vá em https://developers.facebook.com/apps/ → “Create App” → tipo “Business”.
4. Dentro do App, adicione o produto “WhatsApp”.
5. No “WhatsApp Manager”, associe um número (teste ou produção) e obtenha:
   - `WhatsApp Business Account ID`
   - `Phone Number ID`
   - `Access Token` (inicialmente temporário; em produção use System User + token de longa duração)

Referências oficiais:
- Get Started: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/
- Webhooks: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/

## 2) Credenciais Necessárias
- `WHATSAPP_ACCESS_TOKEN`: token Bearer para chamadas ao Graph.
- `WHATSAPP_PHONE_NUMBER_ID`: ID do número no WhatsApp Cloud.
- `WHATSAPP_TOKEN`: token de verificação do webhook (valor que você escolhe).
- Opcional (produção): criar “System User” com permissão WhatsApp e gerar token longo.

## 3) Configurar o Webhook
No App da Meta → WhatsApp → “Configuration”:
- Callback URL: `https://SEU_PROJETO.supabase.co/functions/v1/whatsapp-webhook`
- Verify Token: o mesmo valor de `WHATSAPP_TOKEN` configurado nas variáveis.
- Subscribe aos eventos: `messages` e `message_status`.

Nosso webhook (`supabase/functions/whatsapp-webhook/index.ts`) já valida:
- Query `hub.verify_token` (GET) e retorna o `hub.challenge`.
- Assinatura `X-Hub-Signature-256` (se ativada).
- CORS estrito opcional via `WHATSAPP_CORS_STRICT` e `WHATSAPP_ALLOWED_ORIGINS`.

## 4) Variáveis de Ambiente
Crie/atualize `supabase/.env` (backend) e `.env` (frontend quando aplicável):

Backend (Supabase Edge Functions):
```
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=... (NUNCA exponha no frontend)

# OpenRouter
OPENROUTER_API_KEY=sua_chave_openrouter
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=deepseek/deepseek-chat
EMBEDDING_MODEL=mistral/mistral-embed

# WhatsApp
WHATSAPP_TOKEN=seu_webhook_verify_token
WHATSAPP_ACCESS_TOKEN=seu_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=seu_phone_id

# Opcional: CORS para webhook
WHATSAPP_CORS_STRICT=false
WHATSAPP_ALLOWED_ORIGINS=https://connectai.pt,https://admin.connectai.pt

# Opcional: Modelo de visão (para mensagens com imagem)
WHATSAPP_VISION_MODEL=qwen/qwen3-vl-235b-a22b-instruct
```

Frontend (Vite):
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
VITE_WHATSAPP_ENABLED=true
```

## 5) Deploy das Funções
No diretório `supabase/`:
```
cp env.example .env
# edite .env com seus valores reais

supabase functions deploy whatsapp-webhook --env-file .env
supabase functions deploy whatsapp-integration --env-file .env
supabase functions deploy ai-query --env-file .env
supabase functions deploy ai-query-with-context --env-file .env
```

## 6) Testes End-to-End
1. Adicione números de teste no WhatsApp Manager.
2. Envie uma mensagem para o número configurado.
3. Acompanhe logs:
```
supabase functions logs whatsapp-webhook --follow
supabase functions logs ai-query --follow
```
4. Verifique inserts nas tabelas (ex.: `whatsapp_incoming_messages`, `whatsapp_messages`).

## 7) Produção Real
- Verifique domínio e SSL do Supabase.
- Use token de longa duração (System User) para evitar expiração.
- Aprove as “Message Templates” necessárias (Customer Care / Utility / Marketing).
- Configure limites e monitoramento de custos no Business Manager.
- Defina `WHATSAPP_CORS_STRICT=true` e `WHATSAPP_ALLOWED_ORIGINS` para apertar segurança.

## 8) Integração com LLMs (OpenRouter)
- As funções `ai-query` e `ai-query-with-context` usam `OPENROUTER_API_KEY` e `AI_MODEL`.
- Ajuste `AI_MODEL` conforme necessidade (ex.: `deepseek/deepseek-chat`, `meta-llama/llama-3.1-70b-instruct`).
- O webhook encaminha mensagens e pode chamar a IA conforme a lógica definida (contexto de estudante, disciplinas).

## 🔧 Troubleshooting
- 403 no webhook: verifique `WHATSAPP_TOKEN` e Callback URL.
- `Invalid access token`: gere um novo token ou migre para System User.
- CORS bloqueando: ajuste `WHATSAPP_CORS_STRICT`/`WHATSAPP_ALLOWED_ORIGINS`.
- Mensagens não chegam: confira `phone_number_id`, templates e categorias.

## 🔒 Segurança
- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Rotacione tokens periodicamente.
- Use RLS no banco (já habilitado) e monitore logs.

## 📎 Links Úteis
- WhatsApp Manager: https://business.facebook.com/wa/manage/
- Phone numbers: https://business.facebook.com/wa/manage/phone-numbers/
- Graph API docs: https://developers.facebook.com/docs/graph-api/

---

Sistema pronto para produção com WhatsApp + IA. 🎓📱🚀