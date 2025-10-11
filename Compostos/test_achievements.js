const axios = require('axios');

// Configuração da API
const BASE_URL = 'http://localhost:3000/api';

// Dados de teste
let testUser = {
  email: 'test@example.com',
  password: 'password123'
};

let authToken = '';
let userId = '';

// Função para login
async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, testUser);
    authToken = response.data.token;
    userId = response.data.user._id;
    console.log('✅ Login realizado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data || error.message);
    return false;
  }
}

// Teste 1: Buscar todas as conquistas
async function testGetAllAchievements() {
  try {
    const response = await axios.get(`${BASE_URL}/achievements`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Conquistas encontradas:', response.data.length);
    console.log('📋 Tipos de conquistas:', [...new Set(response.data.map(a => a.type))]);
    return true;
  } catch (error) {
    console.error('❌ Erro ao buscar conquistas:', error.response?.data || error.message);
    return false;
  }
}

// Teste 2: Buscar conquistas do usuário
async function testGetUserAchievements() {
  try {
    const response = await axios.get(`${BASE_URL}/achievements/user`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Conquistas do usuário:', response.data.length);
    
    const unlocked = response.data.filter(a => a.unlocked);
    const inProgress = response.data.filter(a => !a.unlocked && a.progress > 0);
    
    console.log('🔓 Desbloqueadas:', unlocked.length);
    console.log('🔄 Em progresso:', inProgress.length);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao buscar conquistas do usuário:', error.response?.data || error.message);
    return false;
  }
}

// Teste 3: Buscar conquistas não lidas
async function testGetUnreadAchievements() {
  try {
    const response = await axios.get(`${BASE_URL}/achievements/unread`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Conquistas não lidas:', response.data.length);
    return true;
  } catch (error) {
    console.error('❌ Erro ao buscar conquistas não lidas:', error.response?.data || error.message);
    return false;
  }
}

// Teste 4: Marcar conquista como lida
async function testMarkAsRead() {
  try {
    // Primeiro buscar conquistas do usuário
    const achievementsResponse = await axios.get(`${BASE_URL}/achievements/user`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const unlockedAchievements = achievementsResponse.data.filter(a => a.unlocked && !a.read);
    
    if (unlockedAchievements.length === 0) {
      console.log('⚠️ Nenhuma conquista para marcar como lida');
      return true;
    }
    
    const achievementToMark = unlockedAchievements[0];
    
    const response = await axios.post(`${BASE_URL}/achievements/${achievementToMark.achievementId}/read`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Conquista marcada como lida:', response.data.message);
    return true;
  } catch (error) {
    console.error('❌ Erro ao marcar conquista como lida:', error.response?.data || error.message);
    return false;
  }
}

// Teste 5: Resgatar recompensa
async function testClaimReward() {
  try {
    // Buscar conquistas desbloqueadas com recompensa não resgatada
    const achievementsResponse = await axios.get(`${BASE_URL}/achievements/user`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const claimableAchievements = achievementsResponse.data.filter(a => 
      a.unlocked && !a.rewardClaimed && a.rewardValue > 0
    );
    
    if (claimableAchievements.length === 0) {
      console.log('⚠️ Nenhuma recompensa para resgatar');
      return true;
    }
    
    const achievementToClaim = claimableAchievements[0];
    
    const response = await axios.post(`${BASE_URL}/achievements/${achievementToClaim.achievementId}/claim`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Recompensa resgatada:', response.data.message);
    console.log('💰 Valor:', response.data.rewardValue);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao resgatar recompensa:', error.response?.data || error.message);
    return false;
  }
}

// Teste 6: Simular trigger de conquista (investimento)
async function testTriggerInvestmentAchievement() {
  try {
    // Criar um investimento pequeno para trigger de conquista
    const investmentData = {
      robotId: '507f1f77bcf86cd799439011', // ID fictício para teste
      amount: 100,
      duration: 30
    };
    
    const response = await axios.post(`${BASE_URL}/robots/invest`, investmentData, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Investimento criado (para trigger de conquista)');
    
    // Aguardar um pouco para processamento assíncrono
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao criar investimento:', error.response?.data || error.message);
    return false;
  }
}

// Teste 7: Verificar estatísticas
async function testGetAchievementStats() {
  try {
    const response = await axios.get(`${BASE_URL}/achievements/stats`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('📊 Estatísticas de conquistas:');
    console.log('   Total desbloqueadas:', response.data.unlockedCount);
    console.log('   Pontos totais:', response.data.totalPoints);
    console.log('   Conquistas não lidas:', response.data.unreadCount);
    console.log('   Progresso geral:', response.data.overallProgress + '%');
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error.response?.data || error.message);
    return false;
  }
}

// Executar todos os testes
async function runAllTests() {
  console.log('🚀 Iniciando testes do sistema de conquistas...\n');
  
  // Login
  if (!await login()) {
    console.log('❌ Testes abortados - Falha no login');
    return;
  }
  
  const tests = [
    { name: 'Buscar todas as conquistas', fn: testGetAllAchievements },
    { name: 'Buscar conquistas do usuário', fn: testGetUserAchievements },
    { name: 'Buscar conquistas não lidas', fn: testGetUnreadAchievements },
    { name: 'Marcar como lida', fn: testMarkAsRead },
    { name: 'Resgatar recompensa', fn: testClaimReward },
    { name: 'Simular trigger (investimento)', fn: testTriggerInvestmentAchievement },
    { name: 'Verificar estatísticas', fn: testGetAchievementStats }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    console.log(`\n📋 Executando: ${test.name}`);
    console.log('─'.repeat(50));
    
    const result = await test.fn();
    
    if (result) {
      passed++;
      console.log('✅ PASS');
    } else {
      failed++;
      console.log('❌ FAIL');
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESULTADO FINAL DOS TESTES');
  console.log('✅ Passados:', passed);
  console.log('❌ Falhados:', failed);
  console.log('📈 Taxa de sucesso:', ((passed / tests.length) * 100).toFixed(1) + '%');
  console.log('='.repeat(50));
  
  if (failed === 0) {
    console.log('🎉 Todos os testes passaram! Sistema de conquistas está funcionando perfeitamente.');
  } else {
    console.log('⚠️ Alguns testes falharam. Verifique os logs acima.');
  }
}

// Executar os testes
runAllTests().catch(console.error);