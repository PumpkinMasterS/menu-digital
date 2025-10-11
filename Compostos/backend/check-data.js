const mongoose = require('mongoose');
require('dotenv').config();

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    const db = mongoose.connection.db;
    
    // Verificar usuários
    const usersCount = await db.collection('users').countDocuments();
    console.log('Usuarios:', usersCount);
    
    // Verificar robôs
    const robotsCount = await db.collection('robots').countDocuments();
    console.log('Robos:', robotsCount);
    
    // Verificar investimentos
    const investmentsCount = await db.collection('investments').countDocuments();
    console.log('Investimentos:', investmentsCount);
    
    // Verificar transações
    const transactionsCount = await db.collection('transactions').countDocuments();
    console.log('Transacoes:', transactionsCount);
    
    // Verificar referrals
    const referralsCount = await db.collection('referrals').countDocuments();
    console.log('Referrals:', referralsCount);
    
    // Verificar tarefas
    const tasksCount = await db.collection('tasks').countDocuments();
    console.log('Tarefas:', tasksCount);
    
    // Verificar ranks
    const ranksCount = await db.collection('ranks').countDocuments();
    console.log('Ranks:', ranksCount);
    
    // Verificar achievements
    const achievementsCount = await db.collection('achievements').countDocuments();
    console.log('Achievements:', achievementsCount);
    
    // Verificar notificações
    const notificationsCount = await db.collection('notifications').countDocuments();
    console.log('Notificacoes:', notificationsCount);
    
    // Verificar admins
    const adminsCount = await db.collection('admins').countDocuments();
    console.log('Admins:', adminsCount);
    
    // Verificar comissões
    const commissionsCount = await db.collection('commissions').countDocuments();
    console.log('Comissoes:', commissionsCount);
    
    console.log('Total de documentos em todas as colecoes verificado!');
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkData();

