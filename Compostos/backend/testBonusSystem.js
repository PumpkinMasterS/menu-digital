const mongoose = require('mongoose');
require('dotenv').config();

async function testBonusSystem() {
    try {
        console.log('🔗 Conectando ao MongoDB Atlas...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado ao MongoDB Atlas');
        
        // Testar se os modelos existem
        const LeadershipBonus = require('./models/LeadershipBonus');
        const User = require('./models/User');
        
        // Contar bônus existentes
        const bonusCount = await LeadershipBonus.countDocuments();
        console.log(`📊 Total de bônus na base: ${bonusCount}`);
        
        // Testar busca de usuários com equipe
        const usersWithTeam = await User.countDocuments({
            $or: [
                { 'stats.directReferrals': { $gt: 0 } },
                { 'stats.totalTeam': { $gt: 0 } }
            ],
            status: 'active'
        });
        
        console.log(`👥 Usuários com equipe ativos: ${usersWithTeam}`);
        
        // Mostrar alguns usuários com equipe
        const sampleUsers = await User.find({
            $or: [
                { 'stats.directReferrals': { $gt: 0 } },
                { 'stats.totalTeam': { $gt: 0 } }
            ],
            status: 'active'
        }).limit(5).select('name email stats.directReferrals stats.totalTeam investments');
        
        console.log('\n📋 Exemplo de usuários com equipe:');
        sampleUsers.forEach((user, index) => {
            const totalInvestments = user.investments?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
            console.log(`${index + 1}. ${user.name} (${user.email})`);
            console.log(`   👥 Diretos: ${user.stats?.directReferrals || 0}, Equipe total: ${user.stats?.totalTeam || 0}`);
            console.log(`   💰 Investimentos: € ${totalInvestments.toFixed(2)}`);
        });
        
        // Verificar estrutura do modelo LeadershipBonus
        console.log('\n🔍 Estrutura do modelo LeadershipBonus:');
        const bonusFields = Object.keys(LeadershipBonus.schema.paths);
        console.log('Campos:', bonusFields.join(', '));
        
        await mongoose.disconnect();
        console.log('\n✅ Teste do sistema de bônus concluído com sucesso!');
        console.log('📈 Sistema pronto para processar bônus de liderança');
        
    } catch (error) {
        console.error('❌ Erro no teste do sistema de bônus:', error.message);
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
        }
        process.exit(1);
    }
}

testBonusSystem();