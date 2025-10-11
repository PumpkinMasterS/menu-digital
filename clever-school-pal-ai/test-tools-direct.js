// 🧪 TESTE DIRETO DAS WEB SEARCH TOOLS
// Testa as tools diretamente para verificar se estão funcionando

// Simular as classes das tools (versão simplificada para teste)
class SimpleDuckDuckGoTool {
  name = "duckduckgo_search";
  
  async _call(params) {
    console.log(`🔍 Chamando DuckDuckGo com query: "${params.query}"`);
    
    try {
      const encodedQuery = encodeURIComponent(params.query);
      const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;
      
      console.log(`📡 URL da API: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CleverSchoolBot/1.0)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Resposta recebida:`, JSON.stringify(data, null, 2));
      
      return JSON.stringify({
        abstract: data.Abstract || 'Nenhum resumo disponível',
        abstractSource: data.AbstractSource || 'DuckDuckGo',
        abstractURL: data.AbstractURL || '',
        relatedTopics: (data.RelatedTopics || []).slice(0, 3).map(topic => ({
          text: topic.Text || 'Sem texto',
          firstURL: topic.FirstURL || ''
        }))
      });
      
    } catch (error) {
      console.error(`❌ Erro na busca DuckDuckGo:`, error.message);
      return JSON.stringify({
        abstract: 'Erro na busca',
        abstractSource: 'Erro',
        abstractURL: '',
        relatedTopics: []
      });
    }
  }
}

class SimpleCurrentEventsTool {
  name = "current_events";
  
  async _call(params) {
    console.log(`📰 Chamando Current Events com query: "${params.query}"`);
    
    try {
      const encodedQuery = encodeURIComponent(params.query);
      const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;
      
      console.log(`📡 URL da API: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CleverSchoolBot/1.0)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Resposta recebida:`, JSON.stringify(data, null, 2));
      
      return JSON.stringify({
        events: (data.RelatedTopics || []).slice(0, 2).map((topic, index) => ({
          title: `Evento ${index + 1}`,
          description: topic.Text || 'Sem descrição',
          source: 'DuckDuckGo',
          url: topic.FirstURL || ''
        })),
        headlines: [{
          title: data.Heading || 'Manchete Principal',
          description: data.Abstract || 'Sem descrição',
          url: data.AbstractURL || ''
        }]
      });
      
    } catch (error) {
      console.error(`❌ Erro na busca Current Events:`, error.message);
      return JSON.stringify({
        events: [],
        headlines: []
      });
    }
  }
}

// Função para testar as tools
async function testTool(tool, query) {
  console.log(`\n🧪 TESTANDO TOOL: ${tool.name}`);
  console.log(`❓ Query: "${query}"`);
  console.log('─'.repeat(50));
  
  try {
    const result = await tool._call({ query, maxResults: 3 });
    const parsedResult = JSON.parse(result);
    
    console.log(`✅ RESULTADO:`);
    console.log(JSON.stringify(parsedResult, null, 2));
    
    return parsedResult;
  } catch (error) {
    console.error(`❌ ERRO:`, error.message);
    return null;
  }
}

// Executar testes
async function runTests() {
  console.log('🧪 TESTE DIRETO DAS WEB SEARCH TOOLS');
  console.log('═'.repeat(60));
  
  const duckduckgoTool = new SimpleDuckDuckGoTool();
  const currentEventsTool = new SimpleCurrentEventsTool();
  
  // Teste 1: DuckDuckGo com pergunta sobre preço do dólar
  await testTool(duckduckgoTool, "Qual é o preço do dólar hoje?");
  
  // Teste 2: Current Events com pergunta sobre eventos atuais
  await testTool(currentEventsTool, "O que aconteceu hoje no mundo?");
  
  console.log('\n✅ TESTES CONCLUÍDOS');
}

// Executar
runTests().catch(console.error);