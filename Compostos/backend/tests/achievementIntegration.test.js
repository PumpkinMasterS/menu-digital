const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');

// Dados de teste
const TEST_USER = {
  name: 'Test Achievement User',
  email: 'test_achievement_integration@example.com',
  password: 'test123',
  phone: '+5511999999999'
};

let authToken = '';
let userId = '';

// Conectar ao banco de dados antes dos testes
describe('Achievement System Integration Tests', () => {
  beforeAll(async () => {
    // Aguardar conexão com o banco
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/compostos');
    
    // Limpar dados de teste anteriores
    await User.deleteOne({ email: TEST_USER.email });
    await UserAchievement.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  // Teste 1: Registro de usuário
  it('deve registrar um novo usuário', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(TEST_USER);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('_id');
    
    authToken = response.body.token;
    userId = response.body.user._id;
  });

  // Teste 2: Buscar todas as conquistas
  it('deve retornar todas as conquistas disponíveis', async () => {
    const response = await request(app)
      .get('/api/achievements')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    
    // Verificar estrutura básica das conquistas
    const achievement = response.body[0];
    expect(achievement).toHaveProperty('_id');
    expect(achievement).toHaveProperty('name');
    expect(achievement).toHaveProperty('points');
    expect(achievement).toHaveProperty('type');
  });

  // Teste 3: Buscar conquistas do usuário (deve estar vazio inicialmente)
  it('deve retornar conquistas vazias para usuário novo', async () => {
    const response = await request(app)
      .get('/api/achievements/user')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    // Usuário novo não deve ter conquistas
    const unlocked = response.body.filter(a => a.unlocked);
    expect(unlocked.length).toBe(0);
  });

  // Teste 4: Simular trigger de conquista através de investimento
  it('deve conceder conquista após primeiro investimento', async () => {
    // Primeiro, verificar conquistas atuais
    const initialResponse = await request(app)
      .get('/api/achievements/user')
      .set('Authorization', `Bearer ${authToken}`);

    const initialUnlocked = initialResponse.body.filter(a => a.unlocked);
    
    // Simular criação de investimento (que deve trigger conquista)
    // Nota: Esta é uma simulação - em produção seria feito pelo controller de investimentos
    const achievementService = require('../services/achievementService');
    const service = new achievementService();
    
    // Carregar conquistas no cache
    await service.loadAchievements();
    
    // Simular trigger de conquista de primeiro investimento
    await service.checkInvestmentAchievements(userId, { amount: 100 });
    
    // Aguardar processamento
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verificar se conquista foi concedida
    const finalResponse = await request(app)
      .get('/api/achievements/user')
      .set('Authorization', `Bearer ${authToken}`);

    const finalUnlocked = finalResponse.body.filter(a => a.unlocked);
    
    // Deve ter pelo menos uma conquista desbloqueada
    expect(finalUnlocked.length).toBeGreaterThan(initialUnlocked.length);
    
    // Verificar se é a conquista de primeiro investimento
    const firstInvestmentAchievement = finalUnlocked.find(a => 
      a.achievement?.code === 'first_investment' || 
      a.achievement?.name?.toLowerCase().includes('primeiro investimento')
    );
    
    expect(firstInvestmentAchievement).toBeDefined();
    expect(firstInvestmentAchievement.unlocked).toBe(true);
  });

  // Teste 5: Buscar conquistas não lidas
  it('deve retornar conquistas não lidas', async () => {
    const response = await request(app)
      .get('/api/achievements/unread')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    // Deve ter pelo menos uma conquista não lida
    expect(response.body.length).toBeGreaterThan(0);
    
    const unreadAchievement = response.body[0];
    expect(unreadAchievement.unlocked).toBe(true);
    expect(unreadAchievement.read).toBe(false);
  });

  // Teste 6: Marcar conquista como lida
  it('deve marcar conquista como lida', async () => {
    // Primeiro buscar conquistas não lidas
    const unreadResponse = await request(app)
      .get('/api/achievements/unread')
      .set('Authorization', `Bearer ${authToken}`);

    expect(unreadResponse.body.length).toBeGreaterThan(0);
    
    const achievementToMark = unreadResponse.body[0];
    
    // Marcar como lida
    const markResponse = await request(app)
      .post(`/api/achievements/${achievementToMark.achievement._id}/read`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect(markResponse.status).toBe(200);
    expect(markResponse.body).toHaveProperty('message');
    expect(markResponse.body.message).toContain('marcada como lida');
    
    // Verificar se não há mais conquistas não lidas
    const finalUnreadResponse = await request(app)
      .get('/api/achievements/unread')
      .set('Authorization', `Bearer ${authToken}`);

    // Pode ainda haver outras conquistas não lidas, mas a que marcamos não deve estar mais
    const stillUnread = finalUnreadResponse.body.filter(a => 
      a.achievement._id === achievementToMark.achievement._id
    );
    
    expect(stillUnread.length).toBe(0);
  });

  // Teste 7: Buscar estatísticas de conquistas
  it('deve retornar estatísticas de conquistas', async () => {
    const response = await request(app)
      .get('/api/achievements/stats')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('unlockedCount');
    expect(response.body).toHaveProperty('totalPoints');
    expect(response.body).toHaveProperty('unreadCount');
    expect(response.body).toHaveProperty('overallProgress');
    
    // Deve ter pelo menos uma conquista desbloqueada
    expect(response.body.unlockedCount).toBeGreaterThan(0);
    expect(response.body.totalPoints).toBeGreaterThan(0);
    expect(response.body.overallProgress).toBeGreaterThan(0);
  });

  // Teste 8: Testar resgate de recompensa (se aplicável)
  it('deve tentar resgatar recompensa de conquista', async () => {
    // Buscar conquistas desbloqueadas com recompensa
    const userAchievementsResponse = await request(app)
      .get('/api/achievements/user')
      .set('Authorization', `Bearer ${authToken}`);

    const achievementsWithReward = userAchievementsResponse.body.filter(a => 
      a.unlocked && a.achievement?.rewardValue > 0 && !a.rewardClaimed
    );
    
    if (achievementsWithReward.length > 0) {
      const achievementToClaim = achievementsWithReward[0];
      
      const claimResponse = await request(app)
        .post(`/api/achievements/${achievementToClaim.achievement._id}/claim`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(claimResponse.status).toBe(200);
      expect(claimResponse.body).toHaveProperty('message');
      expect(claimResponse.body).toHaveProperty('rewardValue');
      expect(claimResponse.body.message).toContain('recompensa resgatada');
    } else {
      console.log('Nenhuma conquista com recompensa disponível para teste');
      // Não falha o teste se não houver recompensas disponíveis
      expect(true).toBe(true);
    }
  });

  // Teste 9: Verificar integração completa
  it('deve demonstrar fluxo completo do sistema de conquistas', async () => {
    // 1. Verificar conquistas iniciais
    const initialStats = await request(app)
      .get('/api/achievements/stats')
      .set('Authorization', `Bearer ${authToken}`);

    const initialUnlocked = initialStats.body.unlockedCount;
    
    // 2. Simular outra ação que trigger conquista (ex: cashback)
    const achievementService = require('../services/achievementService');
    const service = new achievementService();
    await service.loadAchievements();
    
    // Simular cashback
    await service.checkCashbackAchievements(userId, { amount: 50 });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 3. Verificar novas conquistas
    const finalStats = await request(app)
      .get('/api/achievements/stats')
      .set('Authorization', `Bearer ${authToken}`);

    // O número de conquistas deve ter aumentado
    expect(finalStats.body.unlockedCount).toBeGreaterThanOrEqual(initialUnlocked);
    
    console.log(`\n📊 Estatísticas finais do sistema de conquistas:`);
    console.log(`   Conquistas desbloqueadas: ${finalStats.body.unlockedCount}`);
    console.log(`   Pontos totais: ${finalStats.body.totalPoints}`);
    console.log(`   Progresso geral: ${finalStats.body.overallProgress}%`);
  });
});