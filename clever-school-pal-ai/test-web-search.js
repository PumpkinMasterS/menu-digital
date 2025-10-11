import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'
import assert from 'assert'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testWebSearchQuestions() {
  console.log('🔍 TESTE DE FERRAMENTAS DE BUSCA WEB')
  console.log('=====================================\n')

  // Perguntas que definitivamente requerem busca web
  const testQuestions = [
    {
      question: "Quem ganhou a Liga dos Campeões este ano?",
      expectedTool: "news_search ou wikipedia_search (fallback duckduckgo_search)",
      description: "Resultado esportivo atual (deve usar web)"
    },
    {
      question: "Quem é o atual presidente de Portugal em 2025?",
      expectedTool: "news_search ou wikipedia_search (fallback duckduckgo_search)",
      description: "Pergunta factual atual"
    },
    {
      question: "Quais são as últimas notícias sobre educação em Portugal?",
      expectedTool: "news_search", 
      description: "Pergunta sobre notícias atuais"
    },
    {
      question: "O que aconteceu hoje no mundo?",
      expectedTool: "news_search",
      description: "Pergunta sobre eventos atuais"
    },
    {
      question: "Explica-me sobre a história da Revolução dos Cravos",
      expectedTool: "wikipedia_search",
      description: "Pergunta enciclopédica"
    }
  ]

  for (let i = 0; i < testQuestions.length; i++) {
    const test = testQuestions[i]
    console.log(`\n📝 TESTE ${i + 1}: ${test.description}`)
    console.log(`❓ Pergunta: "${test.question}"`)
    console.log(`🎯 Ferramenta esperada: ${test.expectedTool}`)
    console.log('─'.repeat(50))

    try {
      const startTime = Date.now()
      
      const response = await fetch(`${supabaseUrl}/functions/v1/humanized-ai-tutor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          phoneNumber: '+351123456789',
          question: test.question,
          aiModel: 'meta-llama/llama-3.3-70b-instruct:free',
          platform: 'web'
        })
      })

      const processingTime = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Erro HTTP ${response.status}:`, errorText)
        continue
      }

      const result = await response.json()
      
      console.log(`⏱️  Tempo de processamento: ${processingTime}ms`)
      console.log(`✅ Resposta recebida: ${result.canRespond ? 'SIM' : 'NÃO'}`)
      if (typeof result.webSearchRequired !== 'undefined') {
        console.log(`🌐 webSearchRequired: ${result.webSearchRequired}`)
      }
      
      if (result.answer) {
        console.log(`📝 Resposta (${result.answer.length} chars):`)
        console.log(result.answer.substring(0, 200) + (result.answer.length > 200 ? '...' : ''))
        
        // Verificar se a resposta indica uso de ferramentas
        const hasWebInfo = result.answer.includes('📚 INFORMAÇÕES ATUAIS DA WEB') || 
                          result.answer.includes('fonte') ||
                          result.answer.includes('atualizada') ||
                          result.answer.includes('recente')
        
        console.log(`🔧 Usou ferramentas web: ${hasWebInfo ? '✅ SIM' : '❌ NÃO'}`)
        
        if (result.webSearchContext) {
          console.log('🌐 Contexto de web search detectado')
        }
        
        if (result.toolsUsed) {
          console.log(`🛠️  Ferramentas utilizadas: ${result.toolsUsed.join(', ')}`)
        }
      }

      if (result.error) {
        console.error('❌ Erro na resposta:', result.error)
      }

    } catch (error) {
      console.error('❌ Erro na requisição:', error.message)
    }

    // Pausa entre testes
    if (i < testQuestions.length - 1) {
      console.log('\n⏳ Aguardando 2 segundos...')
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  console.log('\n🏁 TESTE CONCLUÍDO')
  console.log('================')
}

// Executar teste
testWebSearchQuestions().catch(console.error)


// Simulação de decisão de uso de ferramentas
function decideToolsForQuery(query) {
  const q = query.toLowerCase()
  const isCurrent = /hoje|agora|atual|recent(e|es)|202[4-9]|202\d|ontem|semana/.test(q)
  const isDefinition = /(definição|o que é|quem é|história|explica|conceito)/.test(q)
  const isPrice = /(preço|cotação|câmbio|quanto custa|valor)/.test(q)

  if (isCurrent) {
    return ['news_search', 'wikipedia_search', 'duckduckgo_search']
  }
  if (isPrice || isDefinition) {
    return ['wikipedia_search', 'duckduckgo_search']
  }
  return ['wikipedia_search', 'duckduckgo_search']
}

// Testes (executa somente se estiver num runner com describe/it)
if (typeof describe === 'function' && typeof it === 'function') {
  describe('Web search tool prioritization', () => {
    it('prioritizes news_search for current events, with wikipedia then duckduckgo as fallback', () => {
      const tools = decideToolsForQuery('Quais são as notícias de hoje sobre inflação?')
      assert.deepStrictEqual(tools, ['news_search', 'wikipedia_search', 'duckduckgo_search'])
    })
  
    it('prioritizes wikipedia_search for definitions/concepts with duckduckgo as fallback', () => {
      const tools = decideToolsForQuery('O que é inflação? Explique o conceito.')
      assert.deepStrictEqual(tools, ['wikipedia_search', 'duckduckgo_search'])
    })
  
    it('prioritizes wikipedia_search for price/quote/exchange queries, with duckduckgo as fallback', () => {
      const tools = decideToolsForQuery('Qual é a cotação do euro?')
      assert.deepStrictEqual(tools, ['wikipedia_search', 'duckduckgo_search'])
    })
  
    it('defaults to wikipedia_search first for general queries, duckduckgo as last option', () => {
      const tools = decideToolsForQuery('Quem foi Aristóteles?')
      assert.deepStrictEqual(tools, ['wikipedia_search', 'duckduckgo_search'])
    })
  })
}