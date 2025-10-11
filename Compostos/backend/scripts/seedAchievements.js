const mongoose = require('mongoose');
const Achievement = require('../models/Achievement');

// Usar a mesma URI do servidor principal
const MONGODB_URI = 'mongodb+srv://whiswher_db_user:KgvXln6lckWmgGgB@cluster0.nrsrh8h.mongodb.net/compostos?retryWrites=true&w=majority';

const achievements = [
  // Conquistas de Investimento
  {
    name: 'Primeiro Investimento',
    description: 'Realize seu primeiro investimento na plataforma',
    type: 'investment',
    criteria: {
      field: 'investmentsCount',
      operator: '>=',
      value: 1
    },
    reward: {
      type: 'cashback_bonus',
      value: 50,
      description: 'Bônus de €50 para seu próximo investimento'
    },
    icon: '💰',
    category: 'bronze',
    points: 10
  },
  {
    name: 'Investidor Iniciante',
    description: 'Realize 5 investimentos',
    type: 'investment',
    criteria: {
      field: 'investmentsCount',
      operator: '>=',
      value: 5
    },
    reward: {
      type: 'extra_cashback',
      value: 0.5,
      description: '+0.5% de cashback em todos os investimentos'
    },
    icon: '📈',
    category: 'silver',
    points: 25
  },
  {
    name: 'Investidor Experiente',
    description: 'Realize 25 investimentos',
    type: 'investment',
    criteria: {
      field: 'investmentsCount',
      operator: '>=',
      value: 25
    },
    reward: {
      type: 'extra_cashback',
      value: 1.0,
      description: '+1% de cashback em todos os investimentos'
    },
    icon: '💼',
    category: 'gold',
    points: 50
  },
  {
    name: 'Grande Investidor',
    description: 'Invista mais de €10.000',
    type: 'investment',
    criteria: {
      field: 'totalInvested',
      operator: '>=',
      value: 10000
    },
    reward: {
      type: 'cashback_bonus',
      value: 200,
      description: 'Bônus de €200 para seu próximo investimento'
    },
    icon: '🏦',
    category: 'gold',
    points: 75
  },
  {
    name: 'Investidor Premium',
    description: 'Invista mais de €50.000',
    type: 'investment',
    criteria: {
      field: 'totalInvested',
      operator: '>=',
      value: 50000
    },
    reward: {
      type: 'extra_cashback',
      value: 1.5,
      description: '+1.5% de cashback em todos os investimentos'
    },
    icon: '👑',
    category: 'platinum',
    points: 100
  },

  // Conquistas de Cashback
  {
    name: 'Primeiro Cashback',
    description: 'Receba seu primeiro cashback',
    type: 'cashback',
    criteria: {
      field: 'totalCashbackReceived',
      operator: '>=',
      value: 1
    },
    reward: {
      type: 'cashback_bonus',
      value: 25,
      description: 'Bônus extra de €25'
    },
    icon: '💸',
    category: 'bronze',
    points: 15
  },
  {
    name: 'Caçador de Cashback',
    description: 'Receba mais de €500 em cashback',
    type: 'cashback',
    criteria: {
      field: 'totalCashbackReceived',
      operator: '>=',
      value: 500
    },
    reward: {
      type: 'extra_cashback',
      value: 0.3,
      description: '+0.3% de cashback em todos os investimentos'
    },
    icon: '🎯',
    category: 'silver',
    points: 40
  },
  {
    name: 'Mestre do Cashback',
    description: 'Receba mais de €2.000 em cashback',
    type: 'cashback',
    criteria: {
      field: 'totalCashbackReceived',
      operator: '>=',
      value: 2000
    },
    reward: {
      type: 'extra_cashback',
      value: 0.7,
      description: '+0.7% de cashback em todos os investimentos'
    },
    icon: '🏆',
    category: 'gold',
    points: 80
  },

  // Conquistas de Indicação
  {
    name: 'Primeira Indicação',
    description: 'Indique seu primeiro amigo',
    type: 'referral',
    criteria: {
      field: 'referralCount',
      operator: '>=',
      value: 1
    },
    reward: {
      type: 'cashback_bonus',
      value: 30,
      description: 'Bônus de €30 por sua primeira indicação'
    },
    icon: '👥',
    category: 'bronze',
    points: 20
  },
  {
    name: 'Networker',
    description: 'Indique 5 amigos',
    type: 'referral',
    criteria: {
      field: 'referralCount',
      operator: '>=',
      value: 5
    },
    reward: {
      type: 'cashback_bonus',
      value: 100,
      description: 'Bônus de €100 por construir sua rede'
    },
    icon: '🌐',
    category: 'silver',
    points: 45
  },
  {
    name: 'Embaixador',
    description: 'Indique 15 amigos',
    type: 'referral',
    criteria: {
      field: 'referralCount',
      operator: '>=',
      value: 15
    },
    reward: {
      type: 'extra_cashback',
      value: 0.4,
      description: '+0.4% de cashback em todos os investimentos'
    },
    icon: '🎖️',
    category: 'gold',
    points: 90
  },

  // Conquistas de Milestone
  {
    name: 'Primeiros €1.000',
    description: 'Alcance €1.000 em investimentos totais',
    type: 'milestone',
    criteria: {
      field: 'totalInvested',
      operator: '>=',
      value: 1000
    },
    reward: {
      type: 'badge',
      value: 'first_1000',
      description: 'Badge exclusiva de Primeiros €1.000'
    },
    icon: '🎯',
    category: 'bronze',
    points: 15
  },
  {
    name: 'Meta dos €5.000',
    description: 'Alcance €5.000 em investimentos totais',
    type: 'milestone',
    criteria: {
      field: 'totalInvested',
      operator: '>=',
      value: 5000
    },
    reward: {
      type: 'title',
      value: 'Investidor Dedicado',
      description: 'Título exclusivo de Investidor Dedicado'
    },
    icon: '⭐',
    category: 'silver',
    points: 35
  },
  {
    name: 'Clube dos €25.000',
    description: 'Alcance €25.000 em investimentos totais',
    type: 'milestone',
    criteria: {
      field: 'totalInvested',
      operator: '>=',
      value: 25000
    },
    reward: {
      type: 'feature_unlock',
      value: 'premium_support',
      description: 'Acesso ao suporte premium prioritário'
    },
    icon: '🚀',
    category: 'gold',
    points: 70
  }
];

const seedAchievements = async () => {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Conectado ao MongoDB');

    // Limpar conquistas existentes
    await Achievement.deleteMany({});
    console.log('Conquistas existentes removidas');

    // Inserir novas conquistas
    await Achievement.insertMany(achievements);
    console.log(`${achievements.length} conquistas inseridas com sucesso!`);

    // Listar conquistas inseridas
    const insertedAchievements = await Achievement.find({});
    console.log('\nConquistas disponíveis:');
    insertedAchievements.forEach(ach => {
      console.log(`- ${ach.icon} ${ach.name} (${ach.category}) - ${ach.points} pontos`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Erro ao popular conquistas:', error);
    process.exit(1);
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  seedAchievements();
}

module.exports = seedAchievements;