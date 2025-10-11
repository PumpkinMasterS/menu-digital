import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://nsaodmuqjtabfblrrdqv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zYW9kbXVxanRhYmZibHJyZHF2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY1Njc2MCwiZXhwIjoyMDYzMjMyNzYwfQ.5q7JE1V3wD2722I5b4FJ7js4P61jZ3JtnpdA5So2FhY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testToolCalls() {
  console.log('🔍 Testando integração das ferramentas de busca web...');
  
  try {
    // Mensagem via CLI ou default
    const question = process.argv.slice(2).join(' ') || 'Qual é a cotação do dólar hoje?';
    const phoneNumber = '+351999999999'; // usa caminho especial "Antonio" para evitar dependências do BD
    const aiModel = 'anthropic/claude-3.5-haiku'; // deve mapear para versão :online quando necessário
    const platform = 'web';

    console.log('❓ Pergunta:', question);

    // Chamada da função com payload esperado
    const { data, error } = await supabase.functions.invoke('humanized-ai-tutor', {
      body: {
        phoneNumber,
        question,
        aiModel,
        platform,
      }
    });

    if (error) {
      console.error('❌ Erro na chamada da função:', error);
      return;
    }

    console.log('✅ Resposta recebida:', data);
    if (data) {
      if (typeof data.answer === 'string') {
        console.log('📣 Resposta:', data.answer);
      }
      if (Array.isArray(data.toolsUsed)) {
        console.log(`🛠️  Ferramentas utilizadas: ${data.toolsUsed.join(', ')}`);
      }
      if (typeof data.modelUsed === 'string') {
        console.log(`🤖 Modelo utilizado: ${data.modelUsed}`);
      }
    }
    
    // Verificar se há tool calls na resposta
    if (data && (data.response || data.content || data.answer)) {
      const responseText = data.response || data.content || data.answer;
      console.log('📝 Conteúdo da resposta:', responseText);
      
      // Procurar por indicadores de tool calls
      if (typeof responseText === 'string' && (responseText.includes('tool_calls') || responseText.includes('web_search'))) {
        console.log('🔧 Tool calls detectados na resposta!');
      } else {
        console.log('ℹ️ Indicadores de tool calls não encontrados no texto bruto.');
      }
    } else {
      console.log('⚠️ Estrutura de resposta inesperada:', data);
    }

  } catch (err) {
    console.error('💥 Erro durante o teste:', err);
  }
}

// Executar o teste
testToolCalls();