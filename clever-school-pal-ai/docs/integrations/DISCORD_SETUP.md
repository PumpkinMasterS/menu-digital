# 🤖 Configuração da Integração Discord

Este guia explica como configurar a integração do Agente Educativo com o Discord.

## 📋 Pré-requisitos

- Conta no Discord
- Acesso ao [Discord Developer Portal](https://discord.com/developers/applications)
- Permissões de administrador no servidor Discord onde o bot será usado
- Projeto já configurado com Supabase

## 🔧 1. Criar Aplicação Discord

### 1.1 Aceder ao Developer Portal
1. Vá para [Discord Developer Portal](https://discord.com/developers/applications)
2. Clique em "New Application"
3. Nome: `Agente Educativo`
4. Descrição: `Bot educativo inteligente para apoio pedagógico`

### 1.2 Configurar Bot
1. Na sidebar, clique em "Bot"
2. Clique em "Add Bot"
3. Configure as seguintes opções:
   - **Public Bot**: Desativado (apenas para a sua escola)
   - **Requires OAuth2 Code Grant**: Desativado
   - **Message Content Intent**: Ativado ✅
   - **Server Members Intent**: Ativado ✅
   - **Presence Intent**: Ativado ✅

### 1.3 Copiar Credenciais
1. **Bot Token**: Clique em "Reset Token" e copie o token
2. **Application ID**: Copie da página "General Information"
3. **Public Key**: Copie da página "General Information"

## 🔑 2. Configurar Variáveis de Ambiente

Adicione ao seu arquivo `.env`:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=seu_bot_token_aqui
DISCORD_APPLICATION_ID=seu_application_id_aqui
DISCORD_PUBLIC_KEY=sua_public_key_aqui
DISCORD_SERVER_PORT=3001

# Opcional: OpenAI para respostas mais avançadas
OPENAI_API_KEY=sua_openai_key_aqui
```

## 🏫 3. Configurar Base de Dados

### 3.1 Executar SQL de Criação
Execute o ficheiro SQL no Supabase:
```sql
-- O ficheiro create_discord_integration_tables.sql já foi criado
-- Execute-o no SQL Editor do Supabase
```

### 3.2 Verificar Tabelas Criadas
As seguintes tabelas devem estar criadas:
- `discord_guilds` - Mapear servidores Discord → Escolas
- `discord_channels` - Mapear canais Discord → Turmas
- `discord_users` - Mapear utilizadores Discord → Estudantes
- `discord_interactions` - Histórico de interações
- `discord_bot_config` - Configurações por servidor

## 🔗 4. Convidar Bot para o Servidor

### 4.1 Gerar Link de Convite
1. No Developer Portal, vá para "OAuth2" > "URL Generator"
2. **Scopes**: Selecione `bot`
3. **Bot Permissions**: Selecione:
   - Send Messages
   - Read Message History
   - Use Slash Commands
   - Embed Links
   - Attach Files
   - Read Messages
   - Add Reactions

### 4.2 Convidar Bot
1. Copie o URL gerado
2. Abra numa nova aba
3. Selecione o servidor da escola
4. Autorize as permissões

## ⚙️ 5. Configurar no Painel Admin

### 5.1 Aceder à Gestão Discord
1. Faça login como `super_admin`
2. Vá para `/admin/discord`
3. Configure os mapeamentos:

### 5.2 Mapear Servidor → Escola
1. Na aba "Servidores"
2. Clique "Adicionar Servidor"
3. Insira:
   - **Guild ID**: ID do servidor Discord
   - **Nome**: Nome do servidor
   - **Escola**: Selecione a escola correspondente

### 5.3 Mapear Canais → Turmas
1. Na aba "Canais"
2. Para cada canal de turma:
   - **Channel ID**: ID do canal Discord
   - **Nome**: Nome do canal
   - **Turma**: Selecione a turma correspondente

### 5.4 Mapear Utilizadores → Estudantes
1. Na aba "Utilizadores"
2. Para cada estudante:
   - **User ID**: ID do utilizador Discord
   - **Username**: Nome de utilizador Discord
   - **Estudante**: Selecione o estudante correspondente

## 🚀 6. Iniciar o Bot

### 6.1 Desenvolvimento (Servidor TS)
```bash
# Instalar dependências
npm install

# Iniciar servidor Discord (TS)
npm run discord:ts

# Opcional: iniciar app web
npm run dev
```

### 6.2 Produção (Servidor TS)
```bash
# Build do projeto
npm run build

# Iniciar servidor Discord (TS)
npm run discord:ts

# Sugestão: use PM2, Docker ou serviço de processo para manter o bot ativo
```

### 🗒️ Notas sobre scripts legados
- `discord:dev` e `discord:start` usam o script CJS `setup-discord-bot.cjs`, que foi descontinuado.
- Prefira sempre `discord:ts`, que integra-se com o painel admin e suporta streaming.

## 📝 7. Como Obter IDs do Discord

### 7.1 Ativar Modo Desenvolvedor
1. Discord → Configurações → Avançado
2. Ativar "Modo de Desenvolvedor"

### 7.2 Obter IDs
- **Guild ID**: Clique direito no servidor → "Copiar ID"
- **Channel ID**: Clique direito no canal → "Copiar ID"
- **User ID**: Clique direito no utilizador → "Copiar ID"

## 🔄 8. Pipeline de Contextos

O bot utiliza a seguinte hierarquia de contextos:

1. **Contexto Global** - Personalidade base do agente
2. **Contexto Escola** - Informações específicas da escola
3. **Contexto Turma** - Informações da turma/disciplina
4. **Contexto Estudante** - Perfil individual do estudante
5. **Contexto Educacional** - Conteúdos e recursos pedagógicos

## 🛠️ 9. Comandos Disponíveis

### 9.1 Comandos de Texto
- Qualquer mensagem no canal será processada pelo agente
- O bot responde com base no contexto hierárquico

### 9.2 Comandos Slash (Futuros)
- `/ajuda` - Mostrar comandos disponíveis
- `/perfil` - Ver perfil do estudante
- `/recursos` - Listar recursos educacionais

## 🔍 10. Resolução de Problemas

### 10.1 Bot Não Responde
- Verificar se o token está correto
- Confirmar permissões no servidor
- Verificar logs do servidor Discord

### 10.2 Contexto Incorreto
- Verificar mapeamentos no painel admin
- Confirmar IDs do Discord
- Verificar dados na base de dados

### 10.3 Erros de Permissão
- Verificar permissões do bot no servidor
- Confirmar que o bot tem acesso ao canal
- Verificar hierarquia de roles

## 📊 11. Monitorização

### 11.1 Painel Admin
- Aceder `/admin/discord` para estatísticas
- Ver interações recentes
- Monitorizar estado dos servidores

### 11.2 Logs
- Logs configuráveis via `src/lib/logger.ts`
- Opcional: transporte de ficheiro com rotação em `logs/discord.log`
- Interações guardadas na tabela `discord_interactions`

## 🔒 12. Segurança

### 12.1 Tokens
- **NUNCA** partilhe o bot token
- Use variáveis de ambiente
- Regenere tokens se comprometidos

### 12.2 Permissões
- Conceda apenas permissões necessárias
- Revise permissões regularmente
- Use roles para controlar acesso

## 📚 13. Recursos Adicionais

- [Discord.js Documentation](https://discord.js.org/)
- [Discord Developer Portal](https://discord.com/developers/docs/)
- [Discord Bot Best Practices](https://discord.com/developers/docs/topics/community-resources#bots-and-apps)

---

**✅ Integração Completa!**

O Discord agora funciona como mais um canal de entrada/saída para o Agente Educativo, reutilizando todo o sistema de hierarquia já implementado.