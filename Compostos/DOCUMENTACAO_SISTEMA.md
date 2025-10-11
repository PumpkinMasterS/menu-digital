# 📋 Documentação do Sistema Compostos - MLM

## 🏗️ Arquitetura do Sistema

### Backend (Node.js + Express + MongoDB)
- **Servidor principal**: `backend/server.js`
- **Modelos**: MongoDB com Mongoose
- **Autenticação**: JWT + Middleware
- **WebSocket**: Comunicação em tempo real

### Frontend (Flutter)
- **App móvel**: Flutter com estrutura modular
- **Admin Dashboard**: React.js separado

## ✅ SISTEMA JÁ IMPLEMENTADO

### 1. 🎯 Sistema de Comissões em 5 Níveis
- **Nível 1**: 10% do valor gerado
- **Nível 2**: 8% do valor gerado  
- **Nível 3**: 5% do valor gerado
- **Nível 4**: 3% do valor gerado
- **Nível 5**: 2% do valor gerado

**Fontes de comissão**:
- Investimentos
- Tarefas concluídas
- Trading
- Assinaturas
- Cashback
- Manuais

### 2. 👑 Sistema de Ranks (7 Níveis)

| Rank | Nível | Bônus Comissão | Requisitos |
|------|-------|----------------|------------|
| Iniciante | 0 | 0% | Entrada no sistema |
| Bronze | 1 | 5% | Investimento pessoal: € 100 |
| Prata | 2 | 10% | Investimento: € 500, 5 diretos |
| Ouro | 3 | 15% | Investimento: € 2.000, 10 diretos |
| Platina | 4 | 20% | Investimento: € 5.000, 20 diretos |
| Diamante | 5 | 25% | Investimento: € 10.000, 50 diretos |
| Coroa | 6 | 30% | Investimento: € 25.000, 100 diretos |

### 3. 📊 Dashboard de Rede
- Visualização hierárquica
- Estatísticas de membros por nível
- Comissões totais
- Membros ativos/inativos

### 4. 🔔 Sistema de Notificações
- Notificações de comissões recebidas
- Alertas de qualificações
- Promoções de rank

### 5. 💰 Sistema de Cashback
- Cashback automático em investimentos
- Bônus extra por achievements

## 🛠️ TECNOLOGIAS UTILIZADAS

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- WebSocket (Socket.io)
- Cron Jobs

### Frontend (Mobile)
- Flutter
- Provider (State Management)
- HTTP/Dio para APIs

### Admin Dashboard
- React.js
- Hooks personalizados
- Pages modulares

## 📁 ESTRUTURA DE ARQUIVOS

### Backend Principal
```
backend/
├── models/
│   ├── User.js          # Usuários + campos de rank
│   ├── Rank.js          # Definição dos ranks
│   ├── Commission.js   # Comissões
│   └── ...
├── services/
│   ├── RankService.js   # Lógica de ranks
│   ├── CommissionService.js # Cálculo de comissões
│   └── ...
├── routes/
│   ├── ranks.js         # API de ranks
│   ├── commissions.js   # API de comissões
│   └── ...
└── scripts/
    └── seedRanks.js     # Dados iniciais de ranks
```

### Frontend Flutter
```
lib/
├── models/
│   ├── commission_model.dart
│   ├── referral_model.dart
│   └── user_model.dart
├── providers/
│   ├── commission_provider.dart
│   ├── referral_provider.dart
│   └── dashboard_provider.dart
├── screens/
│   ├── commissions/
│   ├── referrals/
│   └── dashboard/
└── widgets/
    ├── commission_list/
    ├── referral_dashboard/
    └── ...
```

## 🔄 FLUXOS PRINCIPAIS

### 1. Fluxo de Comissões
1. Usuário realiza ação geradora (investimento/tarefa)
2. Sistema calcula comissões para 5 níveis acima
3. Distribui valores conforme porcentagens definidas
4. Cria registros de comissão com status "pending"
5. Notifica usuários beneficiados

### 2. Fluxo de Promoção de Rank
1. Sistema verifica qualificações periodicamente
2. Compara estatísticas do usuário com requisitos do rank
3. Se qualificado, promove automaticamente
4. Atualiza campos no modelo User
5. Notifica usuário sobre promoção

### 3. Fluxo de Dashboard
1. Usuário acessa dashboard
2. Sistema constrói árvore de rede
3. Calcula estatísticas em tempo real
4. Exibe visualização hierárquica
5. Mostra comissões e performance

## 🚀 PRÓXIMAS IMPLEMENTAÇÕES

1. **Sistema de Bônus de Liderança** ✅ EM ANDAMENTO
2. Dashboard Avançado de Rede
3. Sistema de Premiação por Performance
4. Relatórios Analíticos
5. Gamificação e Conquistas

---
*Documentação atualizada em: ${new Date().toLocaleDateString('pt-BR')}*
*Sistema Compostos - Multi-Level Marketing*