const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testLeadershipBonusRoutes() {
  try {
    console.log('🧪 Testando rotas de Leadership Bonuses...');
    
    // Testar rota de estatísticas gerais
    console.log('\n1. Testando /api/leadership-bonuses/stats...');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/api/leadership-bonuses/stats`);
      console.log('✅ Stats:', statsResponse.data);
    } catch (error) {
      console.log('❌ Stats error:', error.response?.data || error.message);
    }

    // Testar listagem de bônus (requer autenticação)
    console.log('\n2. Testando /api/leadership-bonuses...');
    try {
      const listResponse = await axios.get(`${BASE_URL}/api/leadership-bonuses`);
      console.log('✅ List:', listResponse.data);
    } catch (error) {
      console.log('❌ List error (esperado sem auth):', error.response?.status, error.response?.data?.message || error.message);
    }

    // Testar estatísticas do usuário
    console.log('\n3. Testando /api/leadership-bonuses/user-stats...');
    try {
      const userStatsResponse = await axios.get(`${BASE_URL}/api/leadership-bonuses/user-stats`);
      console.log('✅ User Stats:', userStatsResponse.data);
    } catch (error) {
      console.log('❌ User Stats error (esperado sem auth):', error.response?.status, error.response?.data?.message || error.message);
    }

    console.log('\n🎯 Teste de rotas concluído!');
    
  } catch (error) {
    console.error('Erro geral:', error.message);
  }
}

testLeadershipBonusRoutes();