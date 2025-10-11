const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function createTestUser() {
  console.log('👤 Criando usuário de teste...');
  
  try {
    // Tentar registrar novo usuário
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Teste Conquistas',
      email: 'test_achievements@example.com',
      password: 'test123',
      phone: '+5511999999999',
      acceptTerms: true
    });
    
    console.log('✅ Usuário criado com sucesso:', registerResponse.data.message);
    if (registerResponse.data.user && registerResponse.data.user._id) {
      console.log('User ID:', registerResponse.data.user._id);
    }
    
    return {
      success: true,
      user: registerResponse.data.user,
      token: registerResponse.data.token
    };
    
  } catch (error) {
    if (error.response?.status === 400 && 
        (error.response.data.message === 'Usuário já existe' || 
         error.response.data.message === 'Usuário já existe com este email.')) {
      console.log('ℹ️  Usuário já existe, tentando login...');
      
      // Tentar login
      try {
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
          email: 'test_achievements@example.com',
          password: 'test123'
        });
        
        console.log('✅ Login realizado com sucesso');
        if (loginResponse.data.data.user && loginResponse.data.data.user._id) {
          console.log('User ID:', loginResponse.data.data.user._id);
        }
        console.log('Token:', loginResponse.data.data.token);
        
        return {
          success: true,
          user: loginResponse.data.user,
          token: loginResponse.data.token
        };
        
      } catch (loginError) {
        console.error('❌ Erro no login:', loginError.response?.data || loginError.message);
        return { success: false, error: loginError };
      }
    } else {
      console.error('❌ Erro ao criar usuário:', error.response?.data || error.message);
      return { success: false, error: error };
    }
  }
}

// Executar criação de usuário
createTestUser()
  .then(result => {
    if (result.success) {
      console.log('\n🎯 PRÓXIMOS PASSOS:');
      console.log('1. Executar teste de conquistas');
      console.log('2. Verificar integração com frontend');
      console.log('3. Testar triggers de conquistas');
    } else {
      console.log('\n⚠️  Falha ao criar/autenticar usuário de teste');
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(console.error);