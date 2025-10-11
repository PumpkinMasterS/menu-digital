const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testBonusRoutes() {
  try {
    console.log('🧪 Testando rotas de bônus...');
    
    // Testar rota de estatísticas
    console.log('\n1. Testando /api/admin/bonus/stats...');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/api/admin/bonus/stats`);
      console.log('✅ Stats:', statsResponse.data);
    } catch (error) {
      console.log('❌ Stats error:', error.response?.data || error.message);
    }

    // Testar listagem de bônus
    console.log('\n2. Testando /api/admin/bonus...');
    try {
      const listResponse = await axios.get(`${BASE_URL}/api/admin/bonus`);
      console.log('✅ List:', listResponse.data);
    } catch (error) {
      console.log('❌ List error:', error.response?.data || error.message);
    }

    console.log('\n🎯 Teste de rotas concluído!');
    
  } catch (error) {
    console.error('Erro geral:', error.message);
  }
}

testBonusRoutes();