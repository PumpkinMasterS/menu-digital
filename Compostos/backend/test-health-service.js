const { healthCheckService } = require('./config/health-checks');

console.log('🔍 Teste do Health Check Service');

async function testHealthCheckService() {
  try {
    console.log('\n📋 Executando Health Check Service...');
    const startTime = Date.now();
    
    const results = await healthCheckService.runAllChecks();
    const endTime = Date.now();
    
    console.log(`✅ Health Check Service executado em ${endTime - startTime}ms`);
    console.log('📊 Status:', results.status);
    console.log('📊 Timestamp:', results.timestamp);
    
    if (results.checks) {
      console.log('\n📋 Detalhes dos Checks:');
      Object.entries(results.checks).forEach(([name, check]) => {
        console.log(`${check.status === 'UP' ? '✅' : '❌'} ${name}: ${check.status}`);
        if (check.error) {
          console.log(`   Erro: ${check.error}`);
        }
        if (check.timestamp) {
          console.log(`   Timestamp: ${check.timestamp}`);
        }
      });
    }
    
    return results.status === 'UP';
    
  } catch (error) {
    console.error('❌ Erro no Health Check Service:', error.message);
    console.error('📋 Stack:', error.stack);
    return false;
  }
}

testHealthCheckService().then(success => {
  console.log(`\n🎯 Resultado Final: ${success ? 'TUDO OK' : 'PROBLEMAS DETECTADOS'}`);
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💥 Erro fatal:', error.message);
  process.exit(1);
});

