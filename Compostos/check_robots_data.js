const mongoose = require('mongoose');
require('dotenv').config();

async function checkRobotsData() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/compostos');
    console.log('Conectado ao MongoDB');

    // Verificar se há robôs na coleção
    const Robot = require('./backend/models/Robot');
    const robots = await Robot.find({});
    
    console.log(`\n📊 Robôs encontrados no banco de dados: ${robots.length}`);
    
    if (robots.length > 0) {
      console.log('\n🤖 Lista de robôs:');
      robots.forEach(robot => {
        console.log(`- ${robot.name} (${robot._id})`);
        console.log(`  💰 Investimento: € ${robot.minInvestment} - € ${robot.maxInvestment}`);
        console.log(`  📈 Lucro diário: ${robot.dailyProfit}%`);
        console.log(`  🎯 Nível de risco: ${robot.riskLevel}`);
        console.log(`  📊 Status: ${robot.status}`);
        console.log('');
      });
    } else {
      console.log('❌ Nenhum robô encontrado no banco de dados.');
      console.log('💡 Execute o script de seed para popular o banco:');
      console.log('   node backend/scripts/seedRobots.js');
    }

    // Verificar investimentos
    const Investment = require('./backend/models/Investment');
    const investments = await Investment.find({}).populate('robot user');
    console.log(`\n📋 Investimentos encontrados: ${investments.length}`);

    await mongoose.disconnect();
    console.log('\n✅ Conexão fechada.');

  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error.message);
    process.exit(1);
  }
}

checkRobotsData();