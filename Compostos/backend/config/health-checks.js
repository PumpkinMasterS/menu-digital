const mongoose = require('mongoose');
const { securityLogger } = require('./security-logger');
const { metricsLogger } = require('./metrics');

class HealthCheckService {
  constructor() {
    this.checks = new Map();
    this.status = {
      status: 'UP',
      timestamp: new Date().toISOString(),
      checks: {}
    };
  }

  // Registrar um check de saúde
  registerCheck(name, checkFunction, options = {}) {
    this.checks.set(name, {
      function: checkFunction,
      critical: options.critical || false,
      timeout: options.timeout || 5000,
      interval: options.interval || 30000
    });
  }

  // Executar todos os checks
  async runAllChecks() {
    const results = {};
    let overallStatus = 'UP';

    for (const [name, check] of this.checks) {
      try {
        const result = await Promise.race([
          check.function(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout após ${check.timeout}ms`)), check.timeout)
          )
        ]);

        results[name] = {
          status: 'UP',
          data: result,
          timestamp: new Date().toISOString()
        };

        // Log de sucesso
        metricsLogger.info('HEALTH_CHECK_SUCCESS', {
          check: name,
          status: 'UP',
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        results[name] = {
          status: 'DOWN',
          error: error.message,
          timestamp: new Date().toISOString()
        };

        // Log de falha
        metricsLogger.error('HEALTH_CHECK_FAILED', {
          check: name,
          error: error.message,
          status: 'DOWN',
          timestamp: new Date().toISOString()
        });

        if (check.critical) {
          overallStatus = 'DOWN';
          
          // Log crítico para checks críticos
          securityLogger.critical('CRITICAL_HEALTH_CHECK_FAILED', {
            check: name,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    this.status = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results
    };

    return this.status;
  }

  // Obter status atual
  getStatus() {
    return this.status;
  }

  // Iniciar monitoramento periódico
  startMonitoring() {
    // Executar checks imediatamente
    this.runAllChecks();

    // Configurar intervalo periódico
    setInterval(() => {
      this.runAllChecks();
    }, 30000); // A cada 30 segundos
  }
}

// Criar instância global
const healthCheckService = new HealthCheckService();

// Checks padrão do sistema

// 1. Check de conexão com MongoDB
healthCheckService.registerCheck('mongodb', async () => {
  const state = mongoose.connection.readyState;
  
  if (state !== 1) { // 1 = connected
    throw new Error(`MongoDB não conectado. Estado: ${state}`);
  }

  // Testar query simples
  const result = await mongoose.connection.db.admin().ping();
  if (!result.ok) {
    throw new Error('Ping falhou no MongoDB');
  }

  return {
    state: state,
    ping: result,
    connectionTime: mongoose.connection._connectionTime
  };
}, { critical: true, timeout: 10000 });

// 2. Check de memória
healthCheckService.registerCheck('memory', async () => {
  const memoryUsage = process.memoryUsage();
  const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

  if (memoryPercent > 90) {
    throw new Error(`Uso de memória crítico: ${memoryPercent.toFixed(2)}%`);
  }

  if (memoryPercent > 80) {
    console.warn(`Uso de memória alto: ${memoryPercent.toFixed(2)}%`);
  }

  return {
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    percent: Math.round(memoryPercent)
  };
});

// 3. Check de CPU
healthCheckService.registerCheck('cpu', async () => {
  const startUsage = process.cpuUsage();
  
  // Pequena carga para medir
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const endUsage = process.cpuUsage(startUsage);
  const totalCpu = (endUsage.user + endUsage.system) / 1000; // em milliseconds
  
  return {
    user: endUsage.user,
    system: endUsage.system,
    total: totalCpu
  };
});

// 4. Check de uptime
healthCheckService.registerCheck('uptime', async () => {
  return {
    uptime: process.uptime(),
    startTime: new Date(Date.now() - (process.uptime() * 1000))
  };
});

// 5. Check de event loop latency
healthCheckService.registerCheck('event_loop', async () => {
  const start = Date.now();
  
  return new Promise((resolve) => {
    setImmediate(() => {
      const latency = Date.now() - start;
      
      if (latency > 200) {
        throw new Error(`Latência alta no event loop: ${latency}ms`);
      }
      
      if (latency > 100) {
        console.warn(`Latência moderada no event loop: ${latency}ms`);
      }
      
      resolve({ latency });
    });
  });
});

// 6. Check de sistema de arquivos (escrita)
healthCheckService.registerCheck('filesystem', async () => {
  const fs = require('fs').promises;
  const testFile = '/tmp/healthcheck_test.txt';
  const testContent = `Health check test ${Date.now()}`;
  
  try {
    await fs.writeFile(testFile, testContent);
    const readContent = await fs.readFile(testFile, 'utf8');
    await fs.unlink(testFile);
    
    if (readContent !== testContent) {
      throw new Error('Teste de leitura/escrita falhou');
    }
    
    return { status: 'OK' };
  } catch (error) {
    throw new Error(`Sistema de arquivos com problemas: ${error.message}`);
  }
});

// Iniciar monitoramento automaticamente
// healthCheckService.startMonitoring(); // Removido - será iniciado após conexão MongoDB

module.exports = healthCheckService;