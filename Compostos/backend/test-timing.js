const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔍 Teste de Timing - MongoDB vs Health Check');

async function testConnectionTiming() {
  console.log('\n📋 Teste 1: Conexão MongoDB');
  const startTime = Date.now();
  
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    const connectionTime = Date.now() - startTime;
    console.log(`✅ Conexão estabelecida em ${connectionTime}ms`);
    console.log('📊 Estado:', mongoose.connection.readyState);
    
    // Aguarda um pouco para simular o tempo do servidor iniciar
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n📋 Teste 2: Verificar estado após delay');
    console.log('📊 Estado após delay:', mongoose.connection.readyState);
    
    // Testa o ping
    const admin = mongoose.connection.db.admin();
    const pingResult = await admin.ping();
    console.log('✅ Ping:', pingResult);
    
    // Testa o health check manualmente
    console.log('\n📋 Teste 3: Health Check Manual');
    const healthCheckStart = Date.now();
    
    const state = mongoose.connection.readyState;
    if (state !== 1) {
      console.log(`❌ Health Check falhou: MongoDB não conectado. Estado: ${state}`);
      return false;
    }
    
    const ping = await admin.ping();
    if (!ping.ok) {
      console.log('❌ Health Check falhou: Ping falhou no MongoDB');
      return false;
    }
    
    const healthCheckTime = Date.now() - healthCheckStart;
    console.log(`✅ Health Check passou em ${healthCheckTime}ms`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Conexão fechada');
  }
}

async function testHealthCheckService() {
  console.log('\n📋 Teste 4: Health Check Service');
  
  try {
    // Importar o health check service
    const { healthCheckService } = require('./config/health-checks');
    
    const startTime = Date.now();
    const results = await healthCheckService.runAllChecks();
    const endTime = Date.now();
    
    console.log(`✅ Health Check Service executado em ${endTime - startTime}ms`);
    console.log('📊 Resultados:', results);
    
    return results.status === 'UP';
    
  } catch (error) {
    console.error('❌ Erro no Health Check Service:', error.message);
    return false;
  }
}

async function runTimingTests() {
  console.log('🚀 Iniciando Testes de Timing...\n');
  
  const results = {
    connectionTiming: false,
    healthCheckService: false
  };
  
  results.connectionTiming = await testConnectionTiming();
  
  // Aguarda um pouco antes de testar o health check service
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  results.healthCheckService = await testHealthCheckService();
  
  console.log('\n📊 Resultados dos Testes:');
  Object.entries(results).forEach(([test, result]) => {
    console.log(`${result ? '✅' : '❌'} ${test}: ${result ? 'PASSOU' : 'FALHOU'}`);
  });
  
  console.log(`\n🎯 Resultado Final: ${results.connectionTiming && results.healthCheckService ? 'TUDO OK' : 'PROBLEMAS DETECTADOS'}`);
  
  process.exit(results.connectionTiming && results.healthCheckService ? 0 : 1);
}

runTimingTests();

