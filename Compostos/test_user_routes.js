const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Token de autenticação (usuário de teste)
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4Y2MyMjVmYzU5MmYzMjVjYjIwNTBhOCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTc1ODY2MzkyMCwiZXhwIjoxNzU4NjY3NTIwfQ.633SZ9q_kuXyEcmERjweCxxr2Iruurtrqd2uKekFLdA';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

async function testUserRoutes() {
  console.log('🧪 Testando rotas do UserService...\n');

  try {
    // 1. Testar rota de perfil
    console.log('1. Testando GET /users/profile');
    const profileResponse = await api.get('/users/profile');
    console.log('✅ Sucesso:', profileResponse.status);
    console.log('Dados:', JSON.stringify(profileResponse.data, null, 2));
    console.log('---\n');

    // 2. Testar rota de estatísticas
    console.log('2. Testando GET /users/stats');
    const statsResponse = await api.get('/users/stats');
    console.log('✅ Sucesso:', statsResponse.status);
    console.log('Dados:', JSON.stringify(statsResponse.data, null, 2));
    console.log('---\n');

    // 3. Testar rota de transações
    console.log('3. Testando GET /users/transactions');
    const transactionsResponse = await api.get('/users/transactions?page=1&limit=5');
    console.log('✅ Sucesso:', transactionsResponse.status);
    console.log('Dados:', JSON.stringify(transactionsResponse.data, null, 2));
    console.log('---\n');

    // 4. Testar rota de referrals
    console.log('4. Testando GET /users/referrals');
    const referralsResponse = await api.get('/users/referrals');
    console.log('✅ Sucesso:', referralsResponse.status);
    console.log('Dados:', JSON.stringify(referralsResponse.data, null, 2));
    console.log('---\n');

    // 5. Testar rota de investimentos
    console.log('5. Testando GET /users/investments');
    const investmentsResponse = await api.get('/users/investments');
    console.log('✅ Sucesso:', investmentsResponse.status);
    console.log('Dados:', JSON.stringify(investmentsResponse.data, null, 2));
    console.log('---\n');

    // 6. Testar atualização de perfil
    console.log('6. Testando PUT /users/profile');
    const updateData = {
      name: 'Nome Teste Atualizado',
      phone: '+55 (11) 99999-9999'
    };
    const updateResponse = await api.put('/users/profile', updateData);
    console.log('✅ Sucesso:', updateResponse.status);
    console.log('Dados:', JSON.stringify(updateResponse.data, null, 2));
    console.log('---\n');

    console.log('🎉 Todos os testes concluídos com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante os testes:');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Mensagem:', error.response.data?.message);
      console.log('Dados:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('Erro de conexão:', error.message);
    } else {
      console.log('Erro:', error.message);
    }
  }
}

// Executar testes
testUserRoutes();