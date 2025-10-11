const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing admin login...');
    
    // Test login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/admin/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    console.log('Login response:', loginResponse.data);
    
    if (loginResponse.data.success && loginResponse.data.data.token) {
      const token = loginResponse.data.data.token;
      console.log('Token received:', token.substring(0, 20) + '...');
      
      // Test dashboard access
      const dashboardResponse = await axios.get('http://localhost:5000/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Dashboard access successful:', dashboardResponse.data);
      
    } else {
      console.log('Login failed - no token received');
    }
    
  } catch (error) {
    console.error('API test failed:', error.response?.data || error.message);
  }
}

testLogin();