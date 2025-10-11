# Guia de Arranque dos Servidores - Projeto Compostos

## 📋 Visão Geral da Arquitetura

O projeto **Compostos** é uma aplicação full-stack composta por:

- **Frontend**: Flutter Web (porta 8087/8089)
- **Backend**: Node.js/Express (porta 5000)  
- **Base de Dados**: MongoDB Atlas
- **Autenticação**: JWT + Refresh Tokens

## 🚀 Comandos de Arranque

### 1. Servidor Backend (Node.js/Express)
```bash
cd backend
npm run dev
```

**Porta**: 5000  
**Health Check**: http://localhost:5000/api/health

**Dependências críticas**:
- Express.js
- MongoDB Driver
- JWT Authentication
- CORS configurado
- Nodemon para desenvolvimento

### 2. Frontend Flutter Web
```bash
# Porta 8087
flutter run -d chrome --web-port=8087

# Porta 8089 (alternativa)
flutter run -d chrome --web-port=8089
```

**Portas disponíveis**: 8087, 8089  
**URLs permitidas no CORS**:
- http://localhost:8087
- http://127.0.0.1:8087  
- http://localhost:8089
- http://127.0.0.1:8089

## 🔧 Configuração de Ambiente

### Variáveis de Ambiente (Backend)
Arquivo: `backend/.env`
```env
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=seu_jwt_secret
JWT_REFRESH_SECRET=seu_refresh_secret
FRONTEND_URL=http://localhost:8087,http://127.0.0.1:8087,http://localhost:8089,http://127.0.0.1:8089
NODE_ENV=development
```

### Configuração API (Frontend)
Arquivo: `lib/config/api_config.dart`
```dart
const String baseUrl = 'http://localhost:5000';
// Alternativa: 'http://10.0.2.2:5000' para Android Emulator
```

## 🧪 Testes de Funcionamento

### Backend Online
```bash
curl http://localhost:5000/api/health
# Resposta esperada: {"status":"OK","timestamp":"2024-01-01T00:00:00.000Z"}
```

### Frontend Acessível
1. Abrir http://localhost:8087
2. Verificar se carrega a aplicação Flutter
3. Testar login/registro

### Conexão MongoDB
- Backend deve logar "Conectado ao MongoDB"
- Verificar conexão no MongoDB Atlas

## 🛠️ Troubleshooting Comum

### Problema: CORS Error
**Solução**: Verificar se `FRONTEND_URL` no `.env` inclui a porta correta

### Problema: Porta já em uso  
**Solução**:
```bash
# Verificar processos na porta
netstat -ano | findstr :5000
netstat -ano | findstr :8087

# Matar processo (Windows)
taskkill /PID <PID> /F
```

### Problema: MongoDB Connection
**Solução**: Verificar URI no `.env` e conexão de internet

### Problema: Flutter Web não carrega
**Solução**:
```bash
flutter clean
flutter pub get
flutter run -d chrome --web-port=8087
```

## 📊 Status dos Servidores

### Backend (✅ Online)
- ✅ Servidor Express rodando na porta 5000
- ✅ Conexão MongoDB estabelecida  
- ✅ Health check respondendo
- ✅ CORS configurado para frontend
- ✅ Autenticação JWT funcionando

### Frontend (🔄 Iniciando)
- 🔄 Compilação Flutter Web
- 🔄 Servidor de desenvolvimento
- ✅ Configuração API apontando para backend

## 🔄 Fluxo de Desenvolvimento

1. **Iniciar Backend**: `npm run dev` no diretório `backend/`
2. **Iniciar Frontend**: `flutter run -d chrome --web-port=8087` 
3. **Testar Aplicação**: Abrir http://localhost:8087
4. **Desenvolvimento**: Alterações hot-reload automático
5. **Debug**: Logs nos terminais respectivos

## 🚨 Monitoramento

### Logs Backend
- Conexão MongoDB
- Requests HTTP
- Erros de autenticação
- Operações de base de dados

### Logs Frontend  
- Compilação Flutter
- Erros de runtime
- Requests API
- Estado da aplicação

## 📈 Próximos Passos

1. ✅ Configurar variáveis de ambiente
2. ✅ Testar conexão backend-frontend  
3. ✅ Validar autenticação JWT
4. ✅ Testar fluxo completo login→dashboard
5. 🔄 Implementar features em falta (ver lista abaixo)

---

# 📋 Lista de Macro Features em Falta

## 🔐 Autenticação & Segurança
- [ ] Reset de password por email/SMS
- [ ] Verificação de 2 fatores (2FA)
- [ ] Limite de tentativas de login
- [ ] Expiração de sessão automática
- [ ] Logs de segurança e auditoria

## 👤 Gestão de Utilizadores
- [ ] Edição de perfil completo
- [ ] Upload de foto de perfil  
- [ ] Alteração de email/telefone
- [ ] Desativação de conta
- [ ] Exportação de dados (GDPR)

## 💰 Investimentos & Finanças
- [ ] Integração com APIs de banking
- [ ] Processamento de pagamentos
- [ ] Histórico de transações completo
- [ ] Relatórios financeiros PDF
- [ ] Notificações de transações

## 🤖 Gestão de Robots
- [ ] Criação de robots personalizados
- [ ] Backtesting de estratégias  
- [ ] Monitorização em tempo real
- [ ] Alertas de performance
- [ ] Otimização automática

## 📊 Dashboard & Analytics
- [ ] Gráficos interativos
- [ ] Métricas de performance  
- [ ] Comparativos com benchmark
- [ ] Previsões e projeções
- [ ] Exportação de dados

## 📱 Funcionalidades Mobile
- [ ] Notificações push
- [ ] Biometric authentication  
- [ ] Offline functionality
- [ ] Background sync
- [ ] Gestão de bateria

## 🛠️ Admin & Moderacao
- [ ] Painel de administração
- [ ] Moderação de conteúdos
- [ ] Gestão de utilizadores
- [ ] Estatísticas de sistema
- [ ] Backup automático

## 🌐 Internacionalização
- [ ] Multi-idioma (PT, EN, ES)
- [ ] Suporte a múltiplas moedas
- [ ] Timezones automáticos
- [ ] Formatação regional

## ⚡ Performance & Scalability
- [ ] Cache de API responses
- [ ] CDN para assets estáticos
- [ ] Load balancing
- [ ] Database indexing
- [ ] Query optimization

## 🧪 Testing & Quality
- [ ] Testes unitários completos
- [ ] Testes de integração
- [ ] Testes end-to-end  
- [ ] Code coverage reports
- [ ] Performance testing

## 🔄 CI/CD & Deployment
- [ ] Pipeline de deployment automático
- [ ] Environment staging
- [ ] Rollback automático
- [ ] Monitoring production
- [ ] Error tracking

## 📋 Priorização Sugerida

### Alta Prioridade (MVP)
1. Reset de password
2. Edição de perfil  
3. Histórico de transações
4. Notificações push
5. Testes unitários

### Media Prioridade
1. 2FA authentication
2. Gráficos dashboard  
3. Internacionalização
4. Admin panel

### Baixa Prioridade  
1. Backtesting robots
2. CDN optimization
3. Multi-moeda

---

**Última Atualização**: $(date +%Y-%m-%d)  
**Estado**: Servidores online e funcionais ✅