# 🚀 Sistema de Gerenciamento de Múltiplos Projetos MongoDB

## 📋 Visão Geral

Sistema completo para gerenciar múltiplos projetos no mesmo cluster MongoDB Atlas, com ambientes isolados e configuração automática.

## 🏗️ Estrutura de Projetos

### Projetos Configurados
```
compostos_prod    → Produção (Database: compostos_prod)
compostos_dev     → Desenvolvimento (Database: compostos_dev)  
compostos_test    → Testes (Database: compostos_test)
```

### Coleções Automáticas
Cada projeto possui automaticamente:
- `users` → Usuários com índices otimizados
- `robots` → Robôs de investimento  
- `investments` → Investimentos
- `tasks` → Tarefas e missões
- `profits` → Lucros e rendimentos
- `referrals` → Sistema de indicações

## 🔧 Como Usar

### 1. Listar Projetos Disponíveis
```bash
node mongodb-manager.js list
```

### 2. Alternar Entre Projetos
```bash
# Para desenvolvimento
node mongodb-manager.js switch compostos_dev

# Para produção  
node mongodb-manager.js switch compostos_prod

# Para testes
node mongodb-manager.js switch compostos_test
```

### 3. Ver Informações do Projeto Atual
```bash
node mongodb-manager.js info
```

### 4. Configurar Coleções (Primeira Vez)
```bash
node mongodb-manager.js setup
```

### 5. Adicionar Novo Projeto
```bash
node mongodb-manager.js add novo_projeto "Meu Novo Projeto" novo_db mongodb+srv://...
```

## 📁 Estrutura de Arquivos

```
backend/
├── .env                    → Ambiente produção (compostos_prod)
├── .env.development       → Ambiente desenvolvimento (compostos_dev)
├── .env.test              → Ambiente testes (compostos_test)
├── .mongo-projects.json   → Configuração dos projetos (auto-gerado)
├── mongodb-manager.js     → Sistema de gerenciamento
└── scripts/
    └── switch-env.js      → Utilitário de troca de ambiente
```

## 🛡️ Proteção Contra Conflitos

- ✅ Cada projeto tem seu próprio database isolado
- ✅ Configuração salva em `.mongo-projects.json` 
- ✅ Conexões são gerenciadas automaticamente
- ✅ Não interfere com outros projetos no mesmo cluster
- ✅ Fail-safe: fallback para localhost se Atlas indisponível

## 🌐 URLs de Conexão

### Padrão MongoDB Atlas
```
mongodb+srv://username:password@cluster.xxxxx.mongodb.net/
```

### Para Projeto Específico
```
# Desenvolvimento
mongodb+srv://username:password@cluster.xxxxx.mongodb.net/compostos_dev

# Produção  
mongodb+srv://username:password@cluster.xxxxx.mongodb.net/compostos_prod

# Testes
mongodb+srv://username:password@cluster.xxxxx.mongodb.net/compostos_test
```

## ⚙️ Variáveis de Ambiente

### Desenvolvimento (.env.development)
```env
NODE_ENV=development
MONGODB_URI=mongodb+srv://.../compostos_dev
APP_NAME=Compostos-DEV
DEBUG=true
```

### Produção (.env)
```env  
NODE_ENV=production
MONGODB_URI=mongodb+srv://.../compostos_prod
APP_NAME=Compostos-PROD
DEBUG=false
```

### Testes (.env.test)
```env
NODE_ENV=test
MONGODB_URI=mongodb+srv://.../compostos_test
APP_NAME=Compostos-TEST
DEBUG=true
```

## 🚀 Comandos Rápidos

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento com compostos_dev |
| `npm start` | Produção com compostos_prod |
| `npm test` | Testes com compostos_test |
| `node mongodb-manager.js` | Menu interativo |

## 🔍 Monitoramento

### Ver Status das Conexões
```bash
node scripts/check-connection.js
```

### Estatísticas de Uso
```bash
node scripts/stats.js
```

## 📊 Métricas por Projeto

Cada projeto mantém estatísticas separadas:
- Contagem de documentos por coleção
- Performance de queries
- Uso de storage
- Logs de acesso

---

**📞 Suporte**: Sistema auto-gerenciado com fallback para localhost em caso de indisponibilidade do Atlas.