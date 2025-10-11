const winston = require('winston');

// Criar logger para métricas
const metricsLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'metrics' },
  transports: [
    new winston.transports.File({ filename: 'logs/metrics-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/metrics.log' })
  ]
});

// Se não estiver em produção, também log no console sem cores
if (process.env.NODE_ENV !== 'production') {
  metricsLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.simple()
    )
  }));
}

module.exports = {
  metricsLogger
};
