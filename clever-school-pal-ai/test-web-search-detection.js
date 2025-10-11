// 🧪 TESTE DE DETECÇÃO DE WEB SEARCH
// Script para testar se as funções needsWebSearch e isCurrentEventsQuery estão funcionando

const testQuestions = [
  {
    question: "O que aconteceu hoje no mundo?",
    expectedWebSearch: true,
    expectedCurrentEvents: true,
    description: "Pergunta sobre eventos atuais"
  },
  {
    question: "Qual é o preço do dólar hoje?",
    expectedWebSearch: true,
    expectedCurrentEvents: false,
    description: "Pergunta sobre informação atual específica"
  },
  {
    question: "Notícias de hoje sobre política",
    expectedWebSearch: true,
    expectedCurrentEvents: true,
    description: "Pergunta sobre notícias atuais"
  },
  {
    question: "Como resolver uma equação de segundo grau?",
    expectedWebSearch: false,
    expectedCurrentEvents: false,
    description: "Pergunta educacional básica"
  },
  {
    question: "Últimas notícias do Brasil",
    expectedWebSearch: true,
    expectedCurrentEvents: true,
    description: "Pergunta sobre notícias recentes"
  }
];

// Funções de detecção copiadas do código principal (versão corrigida)
function needsWebSearch(question) {
  // Padrões que indicam necessidade de busca web (informações atuais/dinâmicas)
  const webSearchPatterns = [
    // Eventos atuais com contexto temporal
    /\b(hoje|agora|atualmente|neste momento|recentemente)\b/i,
    /\b(notícias?|manchetes?|últimas?|nova?s?)\s+(de\s+)?(hoje|recente|atual)/i,
    /\b(o que|que)\s+(aconteceu|está acontecendo|acontece)\s+(hoje|agora|recentemente)/i,
    
    // Informações financeiras atuais
    /\b(preço|cotação|valor)\s+(do\s+)?(dólar|euro|bitcoin|real|usd|eur|brl)\s+(hoje|atual|agora)/i,
    /\b(câmbio|cambio)\s+(hoje|atual|agora)/i,
    
    // Datas específicas recentes
    /\b(2025|janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(de\s+)?2025/i,
    /\b(ontem|esta semana|este mês|semana passada|mês passado)/i,
    
    // Política atual
    /\b(presidente|eleição|posse|mandato|governo)\s+(atual|novo|recente|2025)/i,
    /\b(quem é o\s+)?(presidente|ministro|líder)\s+(atual|novo|de\s+2025)/i,
    
    // Clima e tempo atual
    /\b(clima|tempo|temperatura)\s+(hoje|agora|atual)/i,
    
    // Resultados e eventos recentes
    /\b(resultado|placar|quem ganhou|quem venceu)\s+(hoje|ontem|recente)/i,
    
    // Descobertas e pesquisas recentes
    /\b(descoberta|pesquisa|estudo)\s+(recente|nova|novo|2025)/i,
    
    // Notícias gerais (sem contexto temporal específico)
    /\b(últimas?\s+)?(notícias?|novidades?|informações?)\s+(do\s+)?(brasil|mundo|país)/i,
    /\b(manchetes?|headlines?)\s+(recentes?|atuais?)/i
  ];
  
  const questionLower = question.toLowerCase();
  
  // Verificar se algum padrão corresponde
  const hasWebSearchPattern = webSearchPatterns.some(pattern => pattern.test(questionLower));
  
  // Excluir perguntas educacionais básicas mesmo que contenham palavras-chave
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
  // Padrões específicos para eventos atuais e notícias
  const currentEventsPatterns = [
    // Notícias e eventos atuais
    /\b(notícias?|manchetes?|headlines?)\s*(de\s+)?(hoje|recente|atual|últimas?)/i,
    /\b(o que|que)\s+(aconteceu|está acontecendo|acontece)\s+(hoje|agora|recentemente|no mundo)/i,
    /\b(últimas?\s+)?(notícias?|novidades?|informações?)\s+(do\s+)?(brasil|mundo|país)/i,
    
    // Eventos urgentes
    /\b(breaking|urgente|flash|ao vivo|live)\s+(news|notícia)/i,
    /\b(aconteceu\s+hoje|hoje\s+aconteceu)/i,
    
    // Política atual
    /\b(eleição|posse|mandato)\s+(recente|nova|novo|2025)/i,
    /\b(presidente|governo)\s+(atual|novo|recente)/i,
    
    // Eventos temporais específicos
    /\b(esta\s+semana|este\s+mês|ontem|hoje)\s+.*(aconteceu|notícia|evento)/i
  ];
  
  const questionLower = question.toLowerCase();
  
  // Verificar se corresponde a padrões de eventos atuais
  const isCurrentEvents = currentEventsPatterns.some(pattern => pattern.test(questionLower));
  
  // Excluir perguntas sobre preços/cotações (não são eventos/notícias)
  const isPriceQuery = /\b(preço|cotação|valor|câmbio)\s+(do\s+)?(dólar|euro|bitcoin)/i.test(questionLower);
  
  return isCurrentEvents && !isPriceQuery;
}

console.log('🧪 TESTANDO FUNÇÕES DE DETECÇÃO DE WEB SEARCH\n');

testQuestions.forEach((test, index) => {
  console.log(`\n--- TESTE ${index + 1}: ${test.description} ---`);
  console.log(`Pergunta: "${test.question}"`);
  
  const needsWeb = needsWebSearch(test.question);
  const isCurrentEvents = isCurrentEventsQuery(test.question);
  
  console.log(`needsWebSearch(): ${needsWeb} (esperado: ${test.expectedWebSearch})`);
  console.log(`isCurrentEventsQuery(): ${isCurrentEvents} (esperado: ${test.expectedCurrentEvents})`);
  
  const webSearchOk = needsWeb === test.expectedWebSearch;
  const currentEventsOk = isCurrentEvents === test.expectedCurrentEvents;
  
  if (webSearchOk && currentEventsOk) {
    console.log('✅ PASSOU');
  } else {
    console.log('❌ FALHOU');
    if (!webSearchOk) console.log(`  - needsWebSearch falhou: retornou ${needsWeb}, esperado ${test.expectedWebSearch}`);
    if (!currentEventsOk) console.log(`  - isCurrentEventsQuery falhou: retornou ${isCurrentEvents}, esperado ${test.expectedCurrentEvents}`);
  }
});

console.log('\n🔍 ANÁLISE DETALHADA DAS PALAVRAS-CHAVE:\n');

testQuestions.forEach((test, index) => {
  console.log(`\nTeste ${index + 1}: "${test.question}"`);
  const lowerMessage = test.question.toLowerCase();
  
  // Verificar palavras-chave de web search
  const webSearchKeywords = [
    'hoje', 'agora', 'atual', 'recente', 'último', 'última', 'últimos', 'últimas',
    'notícias', 'noticia', 'news', 'aconteceu', 'acontecendo', 'preço', 'precos',
    'cotação', 'cotacao', 'valor', 'clima', 'tempo', 'temperatura', 'weather',
    'resultado', 'placar', 'jogo', 'partida', 'eleição', 'eleicao', 'política',
    'politica', 'governo', 'presidente', 'ministro', 'deputado', 'senador',
    'economia', 'inflação', 'inflacao', 'dólar', 'dolar', 'real', 'bitcoin',
    'criptomoeda', 'ação', 'acoes', 'bolsa', 'mercado', 'pandemia', 'covid',
    'coronavirus', 'vacina', 'saúde', 'saude', 'hospital', 'médico', 'medico',
    'urgente', 'breaking', 'ao vivo', 'live', 'transmissão', 'transmissao'
  ];
  
  const foundWebKeywords = webSearchKeywords.filter(keyword => lowerMessage.includes(keyword));
  console.log(`  Palavras-chave de web search encontradas: [${foundWebKeywords.join(', ')}]`);
  
  // Verificar palavras-chave de current events
  const currentEventsKeywords = [
    'notícias', 'noticia', 'news', 'aconteceu', 'acontecendo', 'hoje',
    'agora', 'atual', 'recente', 'último', 'última', 'últimos', 'últimas',
    'breaking', 'urgente', 'ao vivo', 'live', 'manchetes', 'headlines'
  ];
  
  const foundCurrentKeywords = currentEventsKeywords.filter(keyword => lowerMessage.includes(keyword));
  console.log(`  Palavras-chave de current events encontradas: [${foundCurrentKeywords.join(', ')}]`);
});

console.log('\n✅ TESTE DE DETECÇÃO CONCLUÍDO');