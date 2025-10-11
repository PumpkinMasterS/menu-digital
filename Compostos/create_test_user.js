const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function createTestUser() {
  try {
    // Verificar se o usuário já existe
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'test_achievements@example.com',
        password: 'test123'
      });
      
      console.log('✅ Usuário de teste já existe');
      console.log('Token:', loginResponse.data?.data?.token);
      console.log('User ID:', loginResponse.data?.data?.user?._id);
      return loginResponse.data?.data;
    } catch (loginError) {
      // Se não existir, criar novo usuário
      console.log('Criando novo usuário de teste...');
      
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Test User',
        email: 'test_achievements@example.com',
        password: 'test123',
        phone: '+5511999999999'
      });
      
      console.log('✅ Usuário de teste criado com sucesso');
      console.log('Token:', registerResponse.data?.data?.token);
      console.log('User ID:', registerResponse.data?.data?.user?._id);
      return registerResponse.data?.data;
    }
  } catch (error) {
    console.error('❌ Erro ao criar/verificar usuário de teste:', error.response?.data || error.message);
    throw error;
  }
}

createTestUser().catch(console.error);