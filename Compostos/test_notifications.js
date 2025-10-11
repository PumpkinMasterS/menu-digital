// Teste de conexão para notificações
const axios = require('axios');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4Y2MyMjVmYzU5MmYzMjVjYjIwNTBhOCIsImlhdCI6MTc1ODk5ODQzOCwiZXhwIjoxNzU5NjAzMjM4fQ.MRCjB1yFW4m3fB6NtVYPe4xwZG3BaSoszwmzV15eJ-Q';

async function testNotifications() {
  try {
    console.log('🚀 Testando conexão com backend...');
    
    // Teste de health check
    const healthResponse = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Health check:', healthResponse.data);
    
    // Teste de notificações
    const notificationsResponse = await axios.get('http://localhost:5000/api/notifications', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Notificações:', {
      success: notificationsResponse.data.success,
      count: notificationsResponse.data.data.notifications.length,
      unread: notificationsResponse.data.data.unreadCount
    });
    
    console.log('🎉 Tudo funcionando perfeitamente!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testNotifications();