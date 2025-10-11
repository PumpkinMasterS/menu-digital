const axios = require('axios');

async function testCashbackWithAuth() {
  try {
    console.log('🔐 Testando autenticação e cashback...');
    
    // 1. Primeiro fazer login
    console.log('\n📝 Fazendo login com usuário de teste...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test@example.com',
      password: '123456'
    });

    const token = loginResponse.data.data.token;
    console.log('✅ Login bem-sucedido!');
    console.log('🔑 Token obtido:', token.substring(0, 50) + '...');

    // Configurar axios com o token de autenticação
    const authAxios = axios.create({
      baseURL: 'http://localhost:5000/api',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // 2. Testar diferentes cenários de cashback
    console.log('\n🧪 Testando diferentes cenários de cashback...');
    
    const testCases = [
      { amount: 1000, robotType: 'TC760', description: 'Pequeno investimento com TC760' },
      { amount: 5000, robotType: 'TC880', description: 'Médio investimento com TC880' },
      { amount: 10000, robotType: 'TC990', description: 'Grande investimento com TC990' },
      { amount: 25000, robotType: 'TC760', description: 'Investimento premium com TC760' },
      { amount: 50000, robotType: 'TC880', description: 'Investimento máximo com TC880' }
    ];

    for (const testCase of testCases) {
      console.log(`\n📊 ${testCase.description}:`);
      console.log(`   💰 Investimento: €${testCase.amount}`);
      console.log(`   🤖 Robô: ${testCase.robotType}`);
      
      const response = await authAxios.post('/cashback/calculate', {
        amount: testCase.amount,
        robotType: testCase.robotType
      });

      const data = response.data.data;
      console.log('   ✅ Cashback calculado com sucesso!');
      console.log(`   💵 Total Cashback: €${data.totalCashback.toFixed(2)}`);
      console.log(`   📈 Taxa: ${(data.cashbackRate * 100).toFixed(2)}%`);
      console.log(`   📋 Regras aplicadas: ${data.appliedRules.length}`);
      
      data.appliedRules.forEach(rule => {
        console.log(`     - ${rule.rule}: €${rule.amount.toFixed(2)} (${(rule.rate * 100).toFixed(2)}%)`);
      });
    }

    console.log('\n🎉 Todos os testes de cashback foram bem-sucedidos!');
    console.log('✅ Sistema de cashback está funcionando corretamente!');

  } catch (error) {
    console.error('❌ Erro no teste:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
  }
}

testCashbackWithAuth();