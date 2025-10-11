# 🚦 Pipeline Hierárquico de Contexto – Visão Unificada

Este documento descreve o pipeline hierárquico de contextos utilizado para gerar respostas de IA coerentes e personalizadas. É o ponto único de referência para futuros devs de IA compreenderem como o sistema está montado, onde refinar contextos e como manter alta performance.

## 🧠 Modelo Hierárquico de Contexto

- Global: personalidade e idioma base do sistema
- Escola: diretrizes e características institucionais (mapeadas por guild/server)
- Turma: disciplina, nível e regras da turma (mapeadas por canal)
- Aluno: preferências, estilo de aprendizagem e tópicos atuais
- Educacional: materiais e tópicos disponíveis (conteúdos ativos relacionados)

## 🔌 Consumidores do Pipeline

### Discord (Frontend/Node)
- `src/services/discord/context-service.ts`: constrói `buildHierarchicalContext` e `buildDMContext`
- `src/services/discord/response-service.ts`: `buildHierarchicalPrompt` e chamada à LLM (OpenRouter)
- `src/services/discord/context-pipeline.ts`: orquestração do carregamento de camadas e metadata
- `src/services/discord/bot.ts`: integra serviços acima para responder mensagens

### WhatsApp (Supabase Edge Functions)
- `supabase/functions/ai-query/index.ts`: carrega personalidade global, contexto escolar/turma/aluno e gera resposta
- `supabase/functions/humanized-ai-tutor/index.ts`: `getStudentHierarchicalContext` com pipeline completo
- `supabase/functions/whatsapp-integration/index.ts`: integração de envio/recebimento (armazenamento, PMP), não constrói prompt
- `supabase/functions/whatsapp-webhook/index.ts`: webhook e CORS, não constrói prompt
- `DEPLOY-HIERARCHICAL-AI.ts`: função Deno com contexto hierárquico para tutor IA

Resumo: Discord e WhatsApp seguem o mesmo modelo hierárquico, mas o código do pipeline está duplicado entre Node (Discord) e Deno (Supabase). Há oportunidade de centralização.

## 🧩 Pontos de Dados e Tabelas

- `discord_guilds`, `discord_channels`, `discord_users`: mapeamentos para escola/turma/aluno
- `schools`, `classes`, `students`: dados base do contexto
- `context_hierarchy`: personalidade/diretrizes e conteúdos por nível
- `educational_materials` e `contents`: materiais e tópicos ativos

## 🛠️ Plano Incremental de Centralização

1) Extrair um "Context Registry" comum
- Objetivo: API única para obter contexto global/escola/turma/aluno/educacional
- Sugerido: `supabase/shared/context-registry.ts` (compatível com Deno) e `src/services/context/registry.ts` (Node)
- Interface idêntica para ambos ambientes, diferenças resolvidas por adapters

2) Extrair um "Prompt Builder" único
- Objetivo: montagem de prompts hierárquicos consistente
- Sugerido: `supabase/shared/prompt-builder.ts` e `src/services/llm/prompt-builder.ts`
- Parametrizar idioma, persona, formato de saída e instruções pedagógicas

3) Ajustar consumidores para usar a camada comum
- Discord: trocar uso direto de `context-service` e `response-service` para usar registry/prompt
- WhatsApp (ai-query/humanized-ai-tutor): migrar construção de prompt para o builder

4) Cache e Performance
- Cache em memória (Node) e KV/DB (Deno) para global/escola/turma
- TTL curto e invalidação por mudanças administrativas
- Índices DB: garantir `schools`, `classes`, `students`, `contents` com indexes compostos

## ⚡ Checklist de Performance (Respostas Rápidas e Fluídas)

- Modelos rápidos: usar `Gemini 2.0 Flash`, `Llama 3.1 8B/70B` conforme caso
- Streaming: habilitar respostas token-by-token para UX imediata
- Prompt enxuto: remover campos vazios e duplicados; instruções objetivas
- Cache leve: global/escola/turma com TTL e chave por ID
- Timeouts e fallback: degradar para persona global se contexto faltar
- Índices DB: GIN/BTREE para relações e busca por `school_id`, `class_id`, `student_id`
- Observabilidade: logs de latência por camada, alertas de lentidão

## 🔍 Onde Refinar Contextos

- Escola: ajustar `personality` e `guidelines` em `context_hierarchy`
- Turma: garantir `subject`, `level` e `guidelines` úteis pedagogicamente
- Aluno: manter `preferences`, `learningStyle` e `currentTopics` atualizados
- Educacional: relacionar materiais ativos aos IDs de escola/turma/estudante

## 🧭 Fluxo Padrão (conceitual)

1. Receber mensagem (Discord/WhatsApp)
2. Resolver IDs: guild/channel/user ou phone/student
3. Carregar contexto hierárquico via Registry
4. Montar prompt com Prompt Builder
5. Chamar LLM (OpenRouter) com parâmetros de performance
6. Stream/finalizar resposta e registrar analytics

## 📎 Referências

- Discord: `src/services/discord/context-service.ts`, `response-service.ts`, `context-pipeline.ts`, `bot.ts`
- WhatsApp: `supabase/functions/ai-query/index.ts`, `humanized-ai-tutor/index.ts`, `whatsapp-integration/index.ts`, `whatsapp-webhook/index.ts`
- DB: `supabase/migrations/*` com tabelas de WhatsApp e conteúdos

---

Mantido por: Equipa de IA Educacional. Atualize este documento sempre que alterar o pipeline, o builder ou o registry.