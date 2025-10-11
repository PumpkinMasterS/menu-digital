const axios = require('axios');

async function testCashback() {
  try {
    console.log('🧪 Testando endpoint de cashback...');
    
    // Testar diferentes cenários
    const testCases = [
      { amount: 1000, robotType: 'TC760' },
      { amount: 5000, robotType: 'TC880' },
      { amount: 10000, robotType: 'TC990' },
      { amount: 25000, robotType: 'TC760' },
      { amount: 50000, robotType: 'TC880' }
    ];

    for (const testCase of testCases) {
      console.log(`\n📊 Testando: €${testCase.amount} com robô ${testCase.robotType}`);
      
      const response = await axios.post('http://localhost:5000/api/cashback/calculate', {
        amount: testCase.amount,
        robotType: testCase.robotType
      });

      console.log('✅ Sucesso!');
      console.log('💰 Total Cashback:', response.data.totalCashback);
      console.log('📈 Taxa:', (response.data.cashbackRate * 100).toFixed(2) + '%');
      console.log('📋 Regras aplicadas:', response.data.appliedRules.length);
      
      response.data.appliedRules.forEach(rule => {
        console.log(`   - ${rule.rule}: €${rule.amount.toFixed(2)} (${(rule.rate * 100).toFixed(2)}%)`);
      });
    }

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
    console.error('Error config:', error.config);
  }
}

testCashback();