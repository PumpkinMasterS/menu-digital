# Security Hardening – Itens Pendentes

Este documento acompanha os itens ainda por fazer no hardening de segurança (Edge Functions, Frontend e Base de Dados).

Última atualização: automática por assistente

## Fase 0 – Preparação e observabilidade
- [ ] Ativar logs detalhados e métricas nas Edge Functions críticas (humanized-ai-tutor, whatsapp-webhook)
- [ ] Definir janela de rollout/rollback e plano de monitorização

## Fase 1 – Frontend
- [x] Remover exposição do Service Role do bundle (src/lib/env.ts)
- [ ] Validar que não há outros usos/referências ao Service Role no frontend (grep por VITE_SUPABASE_SERVICE_ROLE_KEY / serviceRoleKey)
- [ ] Executar build e smoke tests do frontend

## Fase 2 – humanized-ai-tutor
- [ ] Adicionar verificação de autenticação: (a) JWT do utilizador OU (b) header x-api-key validado na tabela api_keys
- [ ] Manter compatibilidade temporária com Authorization atual e registar aviso de depreciação

### Fase 2.1 – CORS
- [ ] Restringir CORS a domínios permitidos (app.connectai.pt, connectai.pt) e implementar OPTIONS robusto

### Fase 2.2 – Rate limiting e sanitização
- [ ] Limitar consumo de provedores de IA (rate limit básico e máximos por request)
- [ ] Sanitizar prompts/inputs

## Fase 3 – whatsapp-webhook
- [ ] Verificar assinatura X-Hub-Signature-256 com WHATSAPP_APP_SECRET e rejeitar POST inválido

### Fase 3.1 – Chamada interna
- [ ] Trocar chamada interna para humanized-ai-tutor de Authorization: Service Role para x-api-key dedicada (interno) e remover SRK do header

### Fase 3.2 – CORS e Content-Type
- [ ] Endurecer CORS (quando aplicável) e validar Content-Type

## Fase 4 – Base de dados
- [ ] Criar migração RLS para tabela api_keys: apenas super_admin lê/escreve; apps públicas não acedem; service role bypassa

### Fase 4.1 – Revisão RLS sensível
- [ ] Rever RLS de tabelas sensíveis (students, classes, contents, school_context, chat_logs) para minimizar acessos diretos do frontend e garantir escopo por tenant/escola

## Fase 5 – Frontend
- [ ] Ajustar chamadas a humanized-ai-tutor (src/pages/BotConfig.tsx) para usar JWT (Authorization: Bearer <session.access_token>) e remover qualquer dependência de SRK

## Fase 6 – Testes
- [ ] Executar suite de regressão (incluindo teste remoto test-current-president.js) com verificação de JWT ativa
- [ ] Simular chamadas WhatsApp assinadas e validar fluxo end-to-end

## Fase 7 – Configuração
- [ ] Definir SUPABASE Auth Redirect URLs para app.connectai.pt e connectai.pt (OAuth, Magic Link, Reset)

## Fase 8 – Operação
- [ ] Criar chave interna (api_keys) rotativa para comunicação entre funções e configurar rotação periódica

## Fase 9 – Rollback
- [ ] Documentar fallback e rollback: como reverter para comportamento anterior em produção