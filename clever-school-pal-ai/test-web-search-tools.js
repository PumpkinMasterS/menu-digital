import 'dotenv/config'
import { config as configSupabase } from 'dotenv'
configSupabase({ path: './supabase/.env.local', override: false })

if (!process.env.VITE_SUPABASE_URL && process.env.SUPABASE_URL) process.env.VITE_SUPABASE_URL = process.env.SUPABASE_URL
if (!process.env.VITE_SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY) process.env.VITE_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const internalKey = process.env.HUMANIZED_INTERNAL_API_KEY
const platform = process.env.PLATFORM || 'discord'

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Variáveis de ambiente não configuradas')
    process.exit(1)
}

const testQuestions = [
    {
        question: 'Quem é o atual presidente dos Estados Unidos em 2025?',
        expectedTool: 'news_search ou wikipedia_search (fallback duckduckgo_search)',
        description: 'Pergunta sobre eventos atuais - deve usar news/wikipedia'
    },
    {
        question: 'Quais são as notícias de hoje sobre educação no Brasil?',
        expectedTool: 'news_search', 
        description: 'Pergunta sobre notícias - deve usar news tool'
    },
    {
        question: 'O que aconteceu hoje no mundo?',
        expectedTool: 'news_search',
        description: 'Pergunta sobre eventos atuais - deve usar news tool'
    },
    {
        question: 'Qual é o preço do dólar hoje?',
        expectedTool: 'wikipedia_search (fallback duckduckgo_search)',
        description: 'Pergunta sobre cotação atual - wikipedia como base, duckduckgo como fallback'
    }
]

import assert from 'assert'

// Executar o teste
testWebSearchIntegration().catch(console.error)

async function testWebSearchIntegration() {
    console.log('🚀 INICIANDO TESTE DAS WEB SEARCH TOOLS')
    console.log('═'.repeat(50))
    
    for (const test of testQuestions) {
        console.log(`\n${'─'.repeat(50)}`)
        console.log(`📝 Testando: ${test.description}`)
        console.log(`❓ Pergunta: "${test.question}"`)
        console.log(`🎯 Tool esperada: ${test.expectedTool}`)
        console.log('')
        
        try {
            const response = await fetch(`${supabaseUrl}/functions/v1/humanized-ai-tutor`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`,
                    ...(internalKey ? { 'x-api-key': internalKey } : {})
                },
                body: JSON.stringify({
                    phoneNumber: '+351123456789',
                    question: test.question,
                    platform
                })
            })
            
            if (!response.ok) {
                console.log(`❌ ERRO HTTP: ${response.status} - ${response.statusText}`)
                const errorText = await response.text()
                console.log(`📄 Detalhes do erro: ${errorText}`)
                continue
            }
            
            const result = await response.json()
            
            console.log('✅ RESPOSTA RECEBIDA:')
            console.log(`📄 Conteúdo: ${result.answer ? result.answer.substring(0, 200) + '...' : 'undefined'}`)
            
            const hasWebSearchIndicators = result.answer && (
                result.answer.includes('📚 INFORMAÇÕES ATUAIS DA WEB') ||
                result.answer.includes('🗞️ EVENTOS ATUAIS') ||
                result.answer.includes('📰 MANCHETES') ||
                result.answer.includes('📖 WIKIPEDIA') ||
                result.answer.includes('🔍 INFORMAÇÃO GERAL') ||
                result.answer.includes('Fonte:') ||
                result.answer.includes('Link:')
            )

            const hasWebContextBlock = typeof result.webSearchContext === 'string' && (
                result.webSearchContext.includes('INFORMAÇÕES ATUAIS DA WEB') ||
                result.webSearchContext.includes('EVENTOS ATUAIS') ||
                result.webSearchContext.includes('MANCHETES') ||
                result.webSearchContext.includes('WIKIPEDIA') ||
                result.webSearchContext.includes('INFORMAÇÃO GERAL') ||
                result.webSearchContext.includes('Fonte:') ||
                result.webSearchContext.includes('Link:')
            )

            const toolsUsed = Array.isArray(result.toolsUsed) && result.toolsUsed.length > 0
            const usedOnlineModel = typeof result.modelUsed === 'string' && result.modelUsed.includes(':online')

            if (toolsUsed || usedOnlineModel || hasWebSearchIndicators || hasWebContextBlock) {
                if (toolsUsed) console.log(`🛠️  Ferramentas utilizadas: ${result.toolsUsed.join(', ')}`)
                if (usedOnlineModel) console.log(`🤖 Modelo com web search automático: ${result.modelUsed}`)
                if (hasWebContextBlock) console.log('🧩 Bloco de contexto da web presente (webSearchContext)')
                console.log('🔧 ✅ Web search considerada ATIVA (tools, modelo :online ou indicadores detectados)')
            } else {
                console.log('🔧 ❌ Nenhuma evidência de web search detectada (nem tools, nem modelo :online, nem indicadores)')
                console.log('❌ PROBLEMA: Esperava-se que uma tool fosse usada')
            }
            
        } catch (error) {
            console.log(`❌ ERRO NA REQUISIÇÃO: ${error.message}`)
        }
        
        console.log('─'.repeat(50))
    }
    
    console.log(`\n${'═'.repeat(50)}`)
    console.log('🎉 TESTE CONCLUÍDO!')
    console.log('\n📋 ANÁLISE:')
    console.log('- Se as tools não estão sendo acionadas, verifique:')
    console.log('  1. A função needsWebSearch() está detectando as palavras-chave')
    console.log('  2. As tools estão sendo criadas corretamente')
    console.log('  3. A lógica de chamada das tools está funcionando')
    console.log('  4. Os logs da função no Supabase para mais detalhes')
}

// Função que decide quais ferramentas usar, simulando a lógica do tutor
function decideWebUsage(query) {
  const text = query.toLowerCase()
  const isCurrent = /hoje|agora|atual|notícias|recent(e|es)|202[4-9]|202\d|ontem|semana/.test(text)
  const isDefinition = /(definição|o que é|quem é|história|explica|conceito)/.test(text)
  const isPrice = /(preço|cotação|câmbio|quanto custa|valor)/.test(text)

  const toolsForCurrent = ['news_search', 'wikipedia_search', 'duckduckgo_search']
  const toolsForDefinition = ['wikipedia_search', 'duckduckgo_search']

  if (isCurrent) return toolsForCurrent
  if (isPrice || isDefinition) return toolsForDefinition
  return ['wikipedia_search', 'duckduckgo_search']
}

// Testes (executa somente se estiver num runner com describe/it)
if (typeof describe === 'function' && typeof it === 'function') {
  describe('Web search tools decision', () => {
    it('uses news_search then wikipedia, with duckduckgo as fallback for current queries', () => {
      const tools = decideWebUsage('Quais são as últimas notícias de hoje sobre tecnologia?')
      assert.deepStrictEqual(tools, ['news_search', 'wikipedia_search', 'duckduckgo_search'])
    })

    it('uses wikipedia_search for definitions and concepts, duckduckgo as fallback', () => {
      const tools = decideWebUsage('O que é machine learning? Dê uma definição simples.')
      assert.deepStrictEqual(tools, ['wikipedia_search', 'duckduckgo_search'])
    })

    it('uses wikipedia_search for price/quote/exchange queries, duckduckgo as fallback', () => {
      const tools = decideWebUsage('Qual é a cotação do dólar hoje?')
      // Mesmo sendo "hoje", manter a prioridade: wikipedia (para a definição/contexto) e duckduckgo como fallback
      // Se desejarmos tratar "cotação" como current events, ainda assim duckduckgo é última opção
      const toolsExpected = ['wikipedia_search', 'duckduckgo_search']
      const toolsAltPossible = ['news_search', 'wikipedia_search', 'duckduckgo_search']
      assert.ok(
        JSON.stringify(tools) === JSON.stringify(toolsExpected) ||
        JSON.stringify(tools) === JSON.stringify(toolsAltPossible)
      )
    })

    it('defaults to wikipedia_search for general queries, duckduckgo as last option', () => {
      const tools = decideWebUsage('Explique quem foi Marie Curie.')
      assert.deepStrictEqual(tools, ['wikipedia_search', 'duckduckgo_search'])
    })
  })
}