const mongoose = require('mongoose');
require('dotenv').config();

const Robot = require('../models/Robot');

const sampleRobots = [
  {
    name: 'TC990 - Nível S',
    description: 'Robô de alta performance com algoritmo avançado de trading. Ideal para investidores experientes que buscam retornos elevados.',
    dailyProfit: 8.0, // 8% ao dia
    minInvestment: 1000,
    maxInvestment: 5000,
    duration: 30,
    riskLevel: 'high',
    imageUrl: '/assets/robots/tc990.png',
    tags: ['high-performance', 'advanced', 'premium'],
    isFeatured: true
  },
  {
    name: 'TC880 - Nível A', 
    description: 'Robô de performance intermediária com equilíbrio entre risco e retorno. Perfeito para investidores moderados.',
    dailyProfit: 6.0, // 6% ao dia
    minInvestment: 500,
    maxInvestment: 3000,
    duration: 45,
    riskLevel: 'medium',
    imageUrl: '/assets/robots/tc880.png',
    tags: ['balanced', 'moderate', 'reliable'],
    isFeatured: true
  },
  {
    name: 'TC760 - Nível B',
    description: 'Robô conservador com foco em segurança e estabilidade. Ideal para iniciantes e investidores cautelosos.',
    dailyProfit: 4.0, // 4% ao dia
    minInvestment: 100,
    maxInvestment: 2000,
    duration: 60,
    riskLevel: 'low',
    imageUrl: '/assets/robots/tc760.png',
    tags: ['conservative', 'safe', 'beginner-friendly'],
    isFeatured: true
  },
  {
    name: 'Quantum X1',
    description: 'Robô quântico com machine learning avançado para análise preditiva de mercados.',
    dailyProfit: 9.5, // 9.5% ao dia
    minInvestment: 2000,
    maxInvestment: 10000,
    duration: 15,
    riskLevel: 'high',
    imageUrl: '/assets/robots/quantum-x1.png',
    tags: ['quantum', 'ai', 'cutting-edge'],
    isFeatured: false
  },
  {
    name: 'StablePro 500',
    description: 'Robô focado em estabilidade com estratégias de arbitragem de baixo risco.',
    dailyProfit: 3.2, // 3.2% ao dia
    minInvestment: 200,
    maxInvestment: 1500,
    duration: 90,
    riskLevel: 'low',
    imageUrl: '/assets/robots/stablepro-500.png',
    tags: ['stable', 'low-risk', 'arbitrage'],
    isFeatured: false
  }
];

async function seedRobots() {
  try {
    console.log('🌱 Iniciando seed de robôs...');
    
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/compostos');
    console.log('✅ Conectado ao MongoDB');

    // Limpar robôs existentes
    await Robot.deleteMany({});
    console.log('🧹 Robôs existentes removidos');

    // Inserir robôs de exemplo
    const robots = await Robot.insertMany(sampleRobots);
    console.log(`✅ ${robots.length} robôs inseridos com sucesso!`);

    // Exibir robôs inseridos
    console.log('\n🤖 Robôs disponíveis:');
    robots.forEach(robot => {
      console.log(`- ${robot.name}`);
      console.log(`  💰 Investimento: €${robot.minInvestment} - €${robot.maxInvestment}`);
      console.log(`  📈 Lucro diário: ${robot.dailyProfit}%`);
      console.log(`  🎯 Risco: ${robot.riskLevel}`);
      console.log(`  📅 Duração: ${robot.duration} dias`);
      console.log('');
    });

    await mongoose.disconnect();
    console.log('✅ Conexão fechada');
    console.log('\n🎉 Seed de robôs concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante o seed:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  seedRobots();
}

module.exports = seedRobots;