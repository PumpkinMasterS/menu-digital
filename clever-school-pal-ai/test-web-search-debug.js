// 🧪 TESTE DE DEBUG PARA WEB SEARCH TOOLS
// Simula o comportamento da função principal para identificar problemas

// Simular as funções de detecção
function needsWebSearch(question) {
  const webSearchPatterns = [
    /\b(hoje|agora|atualmente|neste momento|recentemente)\b/i,
    /\b(notícias?|manchetes?|últimas?|nova?s?)\s+(de\s+)?(hoje|recente|atual)/i,
    /\b(o que|que)\s+(aconteceu|está acontecendo|acontece)\s+(hoje|agora|recentemente)/i,
    /\b(preço|cotação|valor)\s+(do\s+)?(dólar|euro|bitcoin|real|usd|eur|brl)\s+(hoje|atual|agora)/i,
    /\b(câmbio|cambio)\s+(hoje|atual|agora)/i,
    /\b(2025|janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(de\s+)?2025/i,
    /\b(ontem|esta semana|este mês|semana passada|mês passado)/i,
    /\b(presidente|eleição|posse|mandato|governo)\s+(atual|novo|recente|2025)/i,
    /\b(quem é o\s+)?(presidente|ministro|líder)\s+(atual|novo|de\s+2025)/i,
    /\b(clima|tempo|temperatura)\s+(hoje|agora|atual)/i,
    /\b(resultado|placar|quem ganhou|quem venceu)\s+(hoje|ontem|recente)/i,
    /\b(descoberta|pesquisa|estudo)\s+(recente|nova|novo|2025)/i,
    /\b(últimas?\s+)?(notícias?|novidades?|informações?)\s+(do\s+)?(brasil|mundo|país)/i,
    /\b(manchetes?|headlines?)\s+(recentes?|atuais?)/i
  ];
  
  const questionLower = question.toLowerCase();
  const hasWebSearchPattern = webSearchPatterns.some(pattern => pattern.test(questionLower));
  
  const educationalPatterns = [
    /\b(como\s+(resolver|calcular|fazer|estudar|aprender))/i,
    /\b(o que é|qual é a definição|explique|conceito de)/i,
    /\b(fórmula|equação|teorema|lei de)/i,
    /\b(história de|origem de|quando foi criado)/i
  ];
  
  const isEducational = educationalPatterns.some(pattern => pattern.test(questionLower));
  return hasWebSearchPattern && !isEducational;
}

function isCurrentEventsQuery(question) {
  const currentEventsPatterns = [
    /\b(o que|que)\s+(aconteceu|está acontecendo|acontece)\s+(hoje|agora|recentemente)/i,
    /\b(notícias?|manchetes?)\s+(de\s+)?(hoje|recente|atual)/i,
    /\b(últimas?\s+)?(notícias?|novidades?)\s+(do\s+)?(brasil|mundo|país)/i,
    /\b(eventos?|acontecimentos?)\s+(recentes?|atuais?)/i,
    /\b(manchetes?|headlines?)\s+(recentes?|atuais?)/i
  ];
  
  const questionLower = question.toLowerCase();
  const hasCurrentEventsPattern = currentEventsPatterns.some(pattern => pattern.test(questionLower));
  
  // Excluir perguntas sobre preços/cotações
  const pricePatterns = [
    /\b(preço|cotação|valor)\s+(do\s+)?(dólar|euro|bitcoin|real|usd|eur|brl)/i,
    /\b(câmbio|cambio)/i
  ];
  
  const isPriceQuery = pricePatterns.some(pattern => pattern.test(questionLower));
  return hasCurrentEventsPattern && !isPriceQuery;
}

// Simular a lógica principal
function debugWebSearchLogic(question) {
  console.log(`\n🔍 DEBUGGING PERGUNTA: "${question}"`);
  console.log('─'.repeat(50));
  
  const isCurrent = isCurrentEventsQuery(question);
  const needsWeb = needsWebSearch(question);
  const shouldUseWebSearch = needsWeb || isCurrent;
  
  console.log(`📊 ANÁLISE:`);
  console.log(`  - isCurrentEventsQuery(): ${isCurrent}`);
  console.log(`  - needsWebSearch(): ${needsWeb}`);
  console.log(`  - shouldUseWebSearch: ${shouldUseWebSearch}`);
  
  if (shouldUseWebSearch) {
    console.log(`✅ DEVERIA USAR WEB SEARCH`);
    
    const questionLower = question.toLowerCase();
    
    // Determinar qual tool usar
    if (isCurrent || questionLower.includes('notícia') || questionLower.includes('atual')) {
      console.log(`🎯 TOOL RECOMENDADA: news_search ou wikipedia_search (fallback duckduckgo_search)`);
    } else if (questionLower.includes('história') || questionLower.includes('definição') || 
               questionLower.includes('conceito') || questionLower.includes('explicação')) {
      console.log(`🎯 TOOL RECOMENDADA: wikipedia_search`);
    } else if (questionLower.includes('preço') || questionLower.includes('cotação') || questionLower.includes('câmbio') || questionLower.includes('cambio')) {
      console.log(`🎯 TOOL RECOMENDADA: wikipedia_search (fallback duckduckgo_search)`);
    } else {
      console.log(`🎯 TOOL RECOMENDADA: wikipedia_search (fallback duckduckgo_search)`);
    }
  } else {
    console.log(`❌ NÃO DEVERIA USAR WEB SEARCH`);
  }
  
  return shouldUseWebSearch;
}

// Testes
const testQuestions = [
  "O que aconteceu hoje no mundo?",
  "Qual é o preço do dólar hoje?",
  "Notícias de hoje sobre política",
  "Como resolver uma equação de segundo grau?",
  "Últimas notícias do Brasil"
];

console.log('🧪 TESTE DE DEBUG - WEB SEARCH LOGIC');
console.log('═'.repeat(60));

testQuestions.forEach((question, index) => {
  debugWebSearchLogic(question);
});

console.log('\n✅ DEBUG CONCLUÍDO');