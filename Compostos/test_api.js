const http = require('http');

function testAPI() {
  console.log('🧪 Testando API Compostos...\n');
  
  // Testar health check
  const healthOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET'
  };
  
  const healthReq = http.request(healthOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('✅ Health Check Test:');
      console.log('Status:', res.statusCode);
      console.log('Data:', JSON.parse(data));
      
      // Testar forgot password
      testForgotPassword();
    });
  });
  
  healthReq.on('error', (error) => {
    console.log('❌ Health Check Test Failed:');
    console.log('Error:', error.message);
  });
  
  healthReq.end();
}

function testForgotPassword() {
  const postData = JSON.stringify({ email: 'test@test.com' });
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/forgot-password',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('\n✅ Forgot Password Test:');
      console.log('Status:', res.statusCode);
      console.log('Data:', JSON.parse(data));
    });
  });
  
  req.on('error', (error) => {
    console.log('\n❌ Forgot Password Test Failed:');
    console.log('Error:', error.message);
  });
  
  req.write(postData);
  req.end();
}

testAPI();