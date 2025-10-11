const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGU0MjNmNjg5NmI5MmY3NzFkMjcwOGUiLCJlbWFpbCI6ImFkbWluQHRlc3QuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzU5NzgxODc5LCJleHAiOjE3NTk4NjgyNzl9.J2fSD4rc3hN9t5ojLHDMMj6moX8s7pwiVRmiWALskho';

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testRoutes() {
  console.log('🚀 Testando rotas do sistema de bônus de liderança...\n');

  // Teste 1: Rotas do Usuário
  console.log('=== ROTAS DO USUÁRIO ===');
  
  try {
    console.log('1. Testando GET /api/leadership-bonuses (listar bônus do usuário)');
    const userBonuses = await axios.get(`${BASE_URL}/api/leadership-bonuses`, { headers });
    console.log('✅ Status:', userBonuses.status);
    console.log('📊 Dados:', userBonuses.data);
  } catch (error) {
    console.log('❌ Erro:', error.response?.status, error.response?.data || error.message);
  }

  try {
    console.log('\n2. Testando GET /api/leadership-bonuses/stats (estatísticas do usuário)');
    const userStats = await axios.get(`${BASE_URL}/api/leadership-bonuses/stats`, { headers });
    console.log('✅ Status:', userStats.status);
    console.log('📊 Dados:', userStats.data);
  } catch (error) {
    console.log('❌ Erro:', error.response?.status, error.response?.data || error.message);
  }

  // Teste 2: Rotas Administrativas
  console.log('\n=== ROTAS ADMINISTRATIVAS ===');
  
  try {
    console.log('3. Testando GET /api/leadership-bonuses/admin/stats (estatísticas gerais)');
    const adminStats = await axios.get(`${BASE_URL}/api/leadership-bonuses/admin/stats`, { headers });
    console.log('✅ Status:', adminStats.status);
    console.log('📊 Dados:', adminStats.data);
  } catch (error) {
    console.log('❌ Erro:', error.response?.status, error.response?.data || error.message);
  }

  try {
    console.log('\n4. Testando GET /api/leadership-bonuses/admin/list (listar todos os bônus)');
    const adminList = await axios.get(`${BASE_URL}/api/leadership-bonuses/admin/list`, { headers });
    console.log('✅ Status:', adminList.status);
    console.log('📊 Dados:', adminList.data);
  } catch (error) {
    console.log('❌ Erro:', error.response?.status, error.response?.data || error.message);
  }

  try {
    console.log('\n5. Testando POST /api/leadership-bonuses/admin/calculate (calcular bônus)');
    const calculateData = {
      period: '2025-01',
      bonusType: 'all'
    };
    const calculate = await axios.post(`${BASE_URL}/api/leadership-bonuses/admin/calculate`, calculateData, { headers });
    console.log('✅ Status:', calculate.status);
    console.log('📊 Dados:', calculate.data);
  } catch (error) {
    console.log('❌ Erro:', error.response?.status, error.response?.data || error.message);
  }

  // Teste 3: Rotas de Aprovação (usando ID de bônus existente se houver)
  console.log('\n=== ROTAS DE APROVAÇÃO ===');
  
  try {
    // Primeiro, vamos buscar um bônus para testar aprovação
    const bonusList = await axios.get(`${BASE_URL}/api/leadership-bonuses/admin/list?limit=1`, { headers });
    
    if (bonusList.data && bonusList.data.bonuses && bonusList.data.bonuses.length > 0) {
      const bonusId = bonusList.data.bonuses[0]._id;
      
      console.log(`6. Testando PUT /api/leadership-bonuses/admin/approve/${bonusId} (aprovar bônus)`);
      const approve = await axios.put(`${BASE_URL}/api/leadership-bonuses/admin/approve/${bonusId}`, {}, { headers });
      console.log('✅ Status:', approve.status);
      console.log('📊 Dados:', approve.data);
      
      console.log(`\n7. Testando PUT /api/leadership-bonuses/admin/mark-paid/${bonusId} (marcar como pago)`);
      const markPaid = await axios.put(`${BASE_URL}/api/leadership-bonuses/admin/mark-paid/${bonusId}`, {}, { headers });
      console.log('✅ Status:', markPaid.status);
      console.log('📊 Dados:', markPaid.data);
      
    } else {
      console.log('⚠️ Nenhum bônus encontrado para testar aprovação');
    }
  } catch (error) {
    console.log('❌ Erro nas rotas de aprovação:', error.response?.status, error.response?.data || error.message);
  }

  console.log('\n🎉 Testes concluídos!');
}

testRoutes().catch(console.error);