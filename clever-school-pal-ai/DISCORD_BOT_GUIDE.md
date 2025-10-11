# 🤖 Guia do Agente Educativo Discord

> Aviso Importante: o servidor CJS (`setup-discord-bot.cjs`) foi descontinuado.
> Utilize o servidor TypeScript (`src/services/discord/server.ts`) com o comando `npm run discord:ts`.

## ✅ Status do Sistema

**Bot Discord:** ✅ **ATIVO e FUNCIONAL**
- **Nome:** Agente Educativo#6493
- **Status:** Conectado e pronto para interações
- **Servidores:** 1 servidor ativo
- **Contexto:** Sistema hierárquico Escola → Turma → Estudante → Conteúdo

## 🚀 Como Usar o Bot

### 📚 Comandos Disponíveis

| Comando | Descrição | Exemplo |
|---------|-----------|----------|
| `!ajuda` | Mostrar lista de comandos | `!ajuda` |
| `!contexto` | Ver o teu contexto educativo atual | `!contexto` |
| `!escola` | Informações sobre a escola | `!escola` |
| `!turma` | Informações sobre a turma atual | `!turma` |
| `!materia` | Informações sobre a matéria | `!materia` |

### 💬 Interações Naturais

O bot também responde a mensagens naturais e fornece ajuda contextualizada baseada no teu perfil educativo.

**Exemplos:**
- "Olá!" → Resposta personalizada com o teu nome e contexto
- "Preciso de ajuda" → Orientação baseada na matéria atual
- Qualquer pergunta → Resposta contextualizada

## 🎓 Sistema de Contexto Hierárquico

### 🏫 Escola
- Mapeamento: **Discord Guild** → **Escola no Supabase**
- Tabela: `discord_guilds` ↔ `schools`

### 👥 Turma
- Mapeamento: **Discord Channel** → **Turma no Supabase**
- Tabela: `discord_channels` ↔ `classes`

### 👤 Estudante
- Mapeamento: **Discord User** → **Estudante no Supabase**
- Tabela: `discord_users` ↔ `students`

### 📚 Conteúdo
- Baseado na matéria da turma atual
- Tabela: `subjects` com conteúdo educativo

## 🔧 Configuração Técnica

### ✅ Variáveis de Ambiente Configuradas
```env
DISCORD_BOT_TOKEN=MTQwNjIzMjc3ODA5MzEwMTEyNg.GmjTIm.YzttVGnlGGBGc1IH6NhoFds5m7BE_dw78ntcyE
VITE_SUPABASE_URL=[configurado]
SUPABASE_SERVICE_ROLE_KEY=[configurado]
```

### ✅ Tabelas Discord Verificadas
- `discord_guilds` ✅
- `discord_channels` ✅
- `discord_users` ✅
- `discord_interactions` ✅
- `discord_bot_config` ✅

### ✅ Dependências Instaladas
- `discord.js` ✅
- `@supabase/supabase-js` ✅
- `dotenv` ✅

## 🎯 Funcionalidades Implementadas

### 🤖 Bot Inteligente
- ✅ Conexão Discord estabelecida
- ✅ Resposta a comandos específicos
- ✅ Interações naturais contextualizadas
- ✅ Sistema de fallback para contextos não mapeados

### 📊 Logging e Auditoria
- ✅ Registo de todas as interações na tabela `discord_interactions`
- ✅ Contexto completo guardado para cada mensagem
- ✅ Logs detalhados no terminal

### 🛡️ Tratamento de Erros
- ✅ Graceful handling de erros de conexão
- ✅ Fallbacks para contextos não encontrados
- ✅ Mensagens de erro amigáveis para utilizadores

## 🚀 Como Iniciar o Bot

### 🔄 Migração para o servidor TS
- O antigo script CJS (`setup-discord-bot.cjs`) não é mais suportado.
- Use o servidor TS, que suporta streaming, configuração por escola via `discord_bot_config` e seleção de LLM do painel admin.
- Logging persistente pode ser configurado no TS via `src/lib/logger.ts` (ver README).

### 1. Verificar Configuração
```bash
# (Opcional) Verificador legado de configuração
node test-discord-bot.cjs
```

### 2. Iniciar Bot (TS)
```bash
npm run discord:ts
# ou diretamente (se tiver tsx instalado):
tsx src/services/discord/server.ts
```

### 3. Verificar Status
O bot deve mostrar:
```
🤖 Bot Discord conectado como Agente Educativo#6493
📚 Agente Educativo ativo em X servidor(es)
✅ Bot pronto para receber mensagens!
```

### 4. Comandos de scripts atualizados
- `npm run discord:ts` → Inicia o servidor Discord TS (recomendado)
- `npm run discord:dev` → Legado (usa CJS) — desaconselhado
- `npm run discord:start` → Legado (usa CJS) — desaconselhado

Para produção, preferir um processo Node que execute `discord:ts` (PM2, Docker, etc.).

## 📱 Exemplo de Uso no Discord

### Conversa Típica:

**Utilizador:** `!contexto`

**Bot:** 
```
🎓 O Teu Contexto Educativo:

🏫 Escola: Escola Exemplo
👥 Turma: Turma Geral
📚 Matéria: Geral
👤 Estudante: Estudante
📊 Ano: 10º
```

**Utilizador:** `Olá, preciso de ajuda com matemática`

**Bot:**
```
Olá Estudante! 👋

Estou aqui para te ajudar com Geral. Podes fazer perguntas específicas sobre os conteúdos ou usar os comandos disponíveis.

💡 Dica: Usa !ajuda para ver todos os comandos disponíveis.
```

## 🔄 Próximos Passos (Opcionais)

### 🎯 Melhorias Futuras
1. **Mapeamento de Servidores:** Configurar guilds específicos para escolas
2. **Mapeamento de Canais:** Associar canais a turmas específicas
3. **Registo de Utilizadores:** Sistema para associar users Discord a estudantes
4. **Conteúdo Educativo:** Expandir base de conhecimento por matéria
5. **Inteligência Artificial:** Integrar com modelos de linguagem para respostas mais sofisticadas

### 📋 Configuração Avançada
1. **Discord Developer Portal:**
   - Ativar `Message Content Intent` se necessário
   - Configurar permissões específicas por servidor

2. **Supabase:**
   - Povoar tabelas `discord_guilds`, `discord_channels`, `discord_users`
   - Configurar dados educativos em `schools`, `classes`, `students`, `subjects`

## 🎉 Conclusão

O **Agente Educativo Discord** está **100% funcional** e pronto para uso!

- ✅ **Autenticação:** Sistema completo com `whiswher@gmail.com` / `admin123`
- ✅ **Discord Bot:** Ativo e respondendo a comandos
- ✅ **Contexto Educativo:** Sistema hierárquico implementado
- ✅ **Integração Supabase:** Conexão e logging funcionais
- ✅ **Tratamento de Erros:** Robusto e amigável

**🚀 O sistema está pronto para ser usado em ambiente educativo!**