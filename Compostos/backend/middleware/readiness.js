const healthCheckService = require('../config/health-checks');

/**
 * Middleware para readiness probe
 * Verifica se o sistema está pronto para receber tráfego
 */
const readinessMiddleware = (req, res, next) => {
  const status = healthCheckService.getStatus();
  
  // Se algum check crítico estiver falhando, retornar 503
  if (status.status === 'DOWN') {
    const failingCriticalChecks = Object.entries(status.checks)
      .filter(([name, check]) => check.status === 'DOWN')
      .map(([name]) => name);
    
    return res.status(503).json({
      status: 'NOT_READY',
      message: 'Sistema não está pronto',
      timestamp: new Date().toISOString(),
      failingChecks: failingCriticalChecks,
      details: status.checks
    });
  }
  
  next();
};

/**
 * Middleware para liveness probe
 * Verifica se o processo está vivo (mais simples que readiness)
 */
const livenessMiddleware = (req, res, next) => {
  res.status(200).json({
    status: 'ALIVE',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

/**
 * Middleware para health check completo
 * Retorna status detalhado de todos os checks
 */
const healthCheckMiddleware = async (req, res) => {
  try {
    const status = await healthCheckService.runAllChecks();
    
    res.status(status.status === 'DOWN' ? 503 : 200).json(status);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Erro ao executar health checks',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  readinessMiddleware,
  livenessMiddleware,
  healthCheckMiddleware
};