const fs = require('fs');

// Carregar .env
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key] = value;
});

// Usar fetch nativo do Node.js 18+
const fetch = globalThis.fetch || require('node-fetch');

const test = async () => {
  try {
    const endpoint = `${env.SUPABASE_URL}/functions/v1/ai-query`;
    console.log('🧪 Testando integração das tools modernas...');
    console.log(`📍 Endpoint: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber: '+351999999999',
        question: 'Quem é o atual presidente dos Estados Unidos?',
        schoolId: '550e8400-e29b-41d4-a716-446655440000',
        streaming: false
      })
    });
    
    console.log('✅ Status HTTP:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro HTTP:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('📊 Resposta completa:');
    console.log(JSON.stringify(data, null, 2));
    
    // Verificar se usou web search
    if (data.answer && data.answer.includes('INFORMAÇÕES ATUAIS DA WEB')) {
      console.log('✅ Web search moderno funcionando!');
    } else {
      console.log('⚠️ Web search pode não ter sido ativado');
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    console.error('Stack:', error.stack);
  }
};

test();