# [DEPRECATED] Guia de Integração com SambaNova Cloud

Este guia foi descontinuado. O provedor padrão de IA do projeto agora é o OpenRouter.

Use os seguintes recursos atualizados para configuração e operação:
- `docs/deployment/ENVIRONMENT_SETUP.md` para variáveis de ambiente e passos de setup
- `supabase/env.example` como referência de configuração do backend
- `docs/README.md` e `README.md` (raiz) para arquitetura e modelos recomendados

Modelos recomendados (OpenRouter):
- `AI_MODEL=meta-llama/llama-3.1-70b-instruct`
- `EMBEDDING_MODEL=snowflake/snowflake-arctic-embed-l`

Observação: As funções Edge (`ai-query` e `generate-content-embedding`) e toda a arquitetura de IA estão integradas ao OpenRouter. Qualquer menção, variável ou URL do SambaNova deve ser removida do ambiente.

Se você chegou até aqui por documentação antiga, por favor migre para o OpenRouter conforme os guias acima.