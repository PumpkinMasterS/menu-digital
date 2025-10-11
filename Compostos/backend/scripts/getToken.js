const axios = require('axios');

async function getToken() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'test@example.com',
      password: '123456'
    });

    const token = response.data.data.token;
    const userId = response.data.data.user._id;

    console.log('Login realizado com sucesso!');
    console.log('User ID:', userId);
    console.log('Token:', token);

    return { token, userId };
  } catch (error) {
    console.error('Erro ao fazer login:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Executar a função
if (require.main === module) {
  getToken();
}

module.exports = getToken;