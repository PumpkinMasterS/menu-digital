// 🧪 TESTE DE HANDLING DE TOOL CALLS
// Simula como o modelo de IA deve processar e responder a tool calls

const { createWebSearchTools } = require('./supabase/functions/shared/tools/index.ts');

// Simular uma resposta do modelo com tool calls
function simulateAIResponseWithToolCalls() {
  console.log('🧪 SIMULANDO RESPOSTA DO MODELO COM TOOL CALLS');
  console.log('═'.repeat(60));
  
  // Exemplo de resposta que o modelo deveria dar quando tools estão disponíveis
  const mockAIResponse = {
    choices: [{
      message: {
        role: "assistant",
        content: null,
        tool_calls: [{
          id: "call_123",
          type: "function",
          function: {
            name: "duckduckgo_search",
            arguments: JSON.stringify({
              query: "preço do dólar hoje",
              maxResults: 3
            })
          }
        }]
      }
    }]
  };
  
  console.log('📤 RESPOSTA SIMULADA DO MODELO:');
  console.log(JSON.stringify(mockAIResponse, null, 2));
  
  return mockAIResponse;
}

// Simular o processamento de tool calls
async function processToolCalls(toolCalls) {
  console.log('\n🔧 PROCESSANDO TOOL CALLS...');
  console.log('─'.repeat(50));
  
  const tools = createWebSearchTools();
  const toolResults = [];
  
  for (const toolCall of toolCalls) {
    const { function: func } = toolCall;
    const tool = tools.find(t => t.name === func.name);
    
    if (tool) {
      console.log(`🔍 Executando tool: ${func.name}`);
      console.log(`📝 Argumentos: ${func.arguments}`);
      
      try {
        const args = JSON.parse(func.arguments);
        const result = await tool._call(args);
        
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: func.name,
          content: result
        });
        
        console.log(`✅ Resultado: ${result.substring(0, 200)}...`);
      } catch (error) {
        console.error(`❌ Erro na tool ${func.name}:`, error.message);
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: func.name,
          content: JSON.stringify({ error: error.message })
        });
      }
    } else {
      console.error(`❌ Tool não encontrada: ${func.name}`);
    }
  }
  
  return toolResults;
}

// Simular segunda chamada ao modelo com resultados das tools
function simulateSecondAICall(toolResults) {
  console.log('\n🔄 SIMULANDO SEGUNDA CHAMADA AO MODELO COM RESULTADOS DAS TOOLS');
  console.log('─'.repeat(50));
  
  const messages = [
    {
      role: "user",
      content: "Qual é o preço do dólar hoje?"
    },
    {
      role: "assistant",
      content: null,
      tool_calls: [{
        id: "call_123",
        type: "function",
        function: {
          name: "duckduckgo_search",
          arguments: JSON.stringify({
            query: "preço do dólar hoje",
            maxResults: 3
          })
        }
      }]
    },
    ...toolResults
  ];
  
  console.log('📤 MENSAGENS PARA SEGUNDA CHAMADA:');
  console.log(JSON.stringify(messages, null, 2));
  
  // Simular resposta final do modelo
  const finalResponse = {
    choices: [{
      message: {
        role: "assistant",
        content: "Com base nas informações mais recentes obtidas através da busca, o preço do dólar hoje está em torno de R$ 5,20. Este valor pode variar ao longo do dia devido às flutuações do mercado financeiro. Para informações mais precisas e atualizadas, recomendo consultar sites especializados em cotações financeiras."
      }
    }]
  };
  
  console.log('\n✅ RESPOSTA FINAL SIMULADA:');
  console.log(JSON.stringify(finalResponse, null, 2));
  
  return finalResponse;
}

// Executar teste completo
async function runCompleteTest() {
  console.log('🧪 TESTE COMPLETO DE TOOL HANDLING');
  console.log('═'.repeat(60));
  
  try {
    // 1. Simular primeira resposta do modelo com tool calls
    const aiResponse = simulateAIResponseWithToolCalls();
    
    // 2. Processar tool calls
    const toolResults = await processToolCalls(aiResponse.choices[0].message.tool_calls);
    
    // 3. Simular segunda chamada com resultados
    const finalResponse = simulateSecondAICall(toolResults);
    
    console.log('\n🎉 TESTE COMPLETO CONCLUÍDO!');
    console.log('✅ Este é o fluxo esperado quando tools funcionam corretamente');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar
runCompleteTest();