const axios = require('axios');

async function testAdminLogin() {
  console.log('🔐 Testando login de administrador...');
  
  try {
    const response = await axios.post('http://localhost:5000/api/auth/admin/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    console.log('✅ LOGIN BEM-SUCEDIDO!');
    console.log('📧 Email:', response.data.data.admin.email);
    console.log('👤 Nome:', response.data.data.admin.name);
    console.log('🔑 Token:', response.data.data.token.substring(0, 50) + '...');
    console.log('📋 Permissões:', response.data.data.admin.permissions);
    
  } catch (error) {
    console.log('❌ Erro:', error.response?.data?.message || error.message);
    if (error.response?.status === 404) {
      console.log('💡 Administrador não encontrado. Execute o script createAdminUser.js primeiro.');
    }
  }
}

testAdminLogin();