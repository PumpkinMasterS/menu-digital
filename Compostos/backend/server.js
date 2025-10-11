const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import security logging system
const { securityLogger, requestLogger, securityLog } = require('./config/security-logger');

// Import advanced rate limiting system
const { 
  globalRateLimiter, 
  authRateLimiter, 
  publicApiRateLimiter, 
  criticalRateLimiter, 
  uploadRateLimiter,
  smsRateLimiter,
  externalApiRateLimiter,
  getRateLimitStats,
  logRequest
} = require('./config/rate-limiting');

// Import health check system
const { 
  readinessMiddleware, 
  livenessMiddleware, 
  healthCheckMiddleware 
} = require('./middleware/readiness');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const robotRoutes = require('./routes/robots');
const investmentRoutes = require('./routes/investments');
const transactionRoutes = require('./routes/transactions');
const commissionRoutes = require('./routes/commissions');
const referralRoutes = require('./routes/referrals');
const rankRoutes = require('./routes/ranks');
const achievementRoutes = require('./routes/achievements');
const taskRoutes = require('./routes/tasks');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const bep20Routes = require('./routes/bep20'); // Nova rota BEP20
const cryptoTransferRoutes = require('./routes/crypto-transfers'); // Nova rota

// Importar jobs
const CheckPendingTransactionsJob = require('./jobs/checkPendingTransactionsJob');
const CryptoTransferJob = require('./jobs/cryptoTransferJob'); // Novo job

const app = express();

// Configurar trust proxy para rate limiting funcionar corretamente
app.set('trust proxy', 1);

// Middleware de segurança
app.use(helmet());

// Logging
app.use(morgan('combined'));

// Security request logging
app.use(requestLogger);

// Advanced rate limiting
app.use(globalRateLimiter);
app.use(logRequest);

// Middleware CORS
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:8081'];

// Em desenvolvimento, permite CORS mais permissivo
if (process.env.NODE_ENV === 'development') {
  app.use(cors({
    origin: true, // Permite qualquer origem em desenvolvimento
    credentials: true
  }));
} else {
  // Em produção, usa a configuração restritiva
  app.use(cors({
    origin: function (origin, callback) {
      // Permite requests sem origin (como mobile apps ou curl)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'A política CORS não permite acesso a partir desta origem';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true
  }));
}

// Preflight CORS para todas as rotas (inclui Authorization e métodos comuns)
app.options('*', cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'A política CORS não permite acesso a partir desta origem';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Conexão com MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/compostos', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Conectado ao MongoDB');
  securityLogger.info('DATABASE_CONNECTION', {
    message: 'Conectado ao MongoDB com sucesso',
    timestamp: new Date().toISOString()
  });
  
  // Iniciar health check apenas após conexão MongoDB estabelecida
  const { healthCheckService } = require('./config/health-checks');
  healthCheckService.startMonitoring();
  console.log('Health check iniciado após conexão MongoDB');
})
.catch(err => {
  console.error('Erro na conexão com MongoDB:', err);
  securityLogger.emergency('DATABASE_CONNECTION_FAILED', {
    message: 'Falha crítica na conexão com MongoDB',
    error: err.message,
    timestamp: new Date().toISOString()
  });
});

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/auth/admin', require('./routes/auth-admin'));
app.use('/api/users', userRoutes);
app.use('/api/robots', robotRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/ranks', rankRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bep20', bep20Routes); // Nova rota BEP20
app.use('/api/crypto-transfers', cryptoTransferRoutes); // Nova rota
app.use('/api/reports', require('./routes/reports'));
app.use('/api/cashback', require('./routes/cashback'));
app.use('/api/otp', require('./routes/otp'));
app.use('/api/trading', require('./routes/trading'));
app.use('/api/simulation', require('./routes/simulation'));
app.use('/api/audit', require('./routes/audit'));




// Health check endpoints
app.get('/api/health', healthCheckMiddleware); // Health check completo
app.get('/api/health/liveness', livenessMiddleware); // Liveness probe (simples)
app.get('/api/health/readiness', readinessMiddleware); // Readiness probe

// Aplicar readiness middleware em todas as rotas API (exceto health checks)
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/health')) {
    return next(); // Skip readiness check for health endpoints
  }
  readinessMiddleware(req, res, next);
});

// Rota padrão - lida com requisições automáticas do Flutter Web (qualquer parâmetro de query)
app.get('/', (req, res) => {
  res.json({ 
    message: 'Bem-vindo à API Compostos',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      robots: '/api/robots',
      tasks: '/api/tasks',
      referrals: '/api/referrals',
      profits: '/api/profits',
      dashboard: '/api/dashboard',
      otp: '/api/otp'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Iniciar jobs
const checkPendingTransactionsJob = new CheckPendingTransactionsJob();
const cryptoTransferJob = new CryptoTransferJob();

checkPendingTransactionsJob.start();
cryptoTransferJob.start();

// Inicializar serviços
require('./services/NotificationService');
require('./services/RobotTradingService');
require('./services/MarketSimulationService');

// Inicializar jobs agendados
const backupJob = require('./jobs/backupJob');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  
  securityLogger.info('SERVER_STARTED', {
    message: 'Servidor iniciado com sucesso',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
  
  // Iniciar jobs agendados após o servidor estar rodando
  backupJob.start();
  console.log('📅 Jobs de backup agendados iniciados');
});

// Inicializar WebSocket Server
const WebSocketServer = require('./websocket/websocketServer');
const wss = new WebSocketServer(server);

// Exportar instância do WebSocket para uso em outros módulos
global.wss = wss;

module.exports = app;