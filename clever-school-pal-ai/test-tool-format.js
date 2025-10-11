import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const openrouterApiKey = process.env.OPENROUTER_API_KEY

if (!supabaseUrl || !supabaseKey || !openrouterApiKey) {
  console.error('❌ Variáveis de ambiente não configuradas')
  process.exit(1)
}

async function testToolFormat() {
  console.log('🔧 TESTE DE FORMATO DAS FERRAMENTAS')
  console.log('==================================\n')

  // Simular o formato das ferramentas como no código
  const tools = [
    {
      type: "function",
      function: {
        name: "duckduckgo_search",
        description: "Search the web using DuckDuckGo (fallback)",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query"
            },
            maxResults: {
              type: "number",
              description: "Maximum number of results to return",
              default: 3
            }
          },
          required: ["query"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "wikipedia_search",
        description: "Search Wikipedia for information",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query"
            },
            maxResults: {
              type: "number",
              description: "Maximum number of results to return",
              default: 3
            },
            language: {
              type: "string",
              description: "Wikipedia language (e.g., 'pt', 'en')",
              default: "pt"
            }
          },
          required: ["query"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "news_search",
        description: "Search recent news headlines (lightweight via DuckDuckGo)",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query"
            },
            maxResults: {
              type: "number",
              description: "Maximum number of results to return",
              default: 5
            },
            timeframe: {
              type: "string",
              description: "Timeframe hint (e.g., 'today', 'recent')"
            },
            region: {
              type: "string",
              description: "Region hint (e.g., 'br', 'pt')"
            }
          },
          required: ["query"]
        }
      }
    }
  ];

  console.log('📋 Formato das ferramentas:')
  console.log(JSON.stringify(tools, null, 2))
  console.log('\n' + '─'.repeat(50))

  // Testar com diferentes modelos
  const modelsToTest = [
    {
      name: 'Llama 3.3 70B (free)',
      id: 'meta-llama/llama-3.3-70b-instruct:free',
      supportsTools: 'unknown'
    },
    {
      name: 'GPT-4o Mini',
      id: 'openai/gpt-4o-mini',
      supportsTools: 'yes'
    },
    {
      name: 'Claude 3.5 Haiku',
      id: 'anthropic/claude-3-5-haiku',
      supportsTools: 'yes'
    }
  ];

  for (const model of modelsToTest) {
    console.log(`\n🤖 TESTANDO: ${model.name}`)
    console.log(`📝 ID: ${model.id}`)
    console.log(`🔧 Suporte a tools: ${model.supportsTools}`)
    console.log('─'.repeat(30))

    try {
      const startTime = Date.now()
      
      const requestBody = {
        model: model.id,
        messages: [
          {
            role: "system",
            content: "Você é um assistente útil. Use as ferramentas disponíveis quando necessário para responder perguntas que requerem informações atuais ou específicas. Priorize news_search/wikipedia_search e use duckduckgo_search apenas como última opção."
          },
          {
            role: "user",
            content: "Quem é o atual presidente de Portugal em 2025?"
          }
        ],
        tools: tools,
        tool_choice: "auto",
        max_tokens: 1000,
        temperature: 0.1
      };

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://clever-school-pal-ai',
          'X-Title': 'EduBot Test'
        },
        body: JSON.stringify(requestBody)
      });

      const processingTime = Date.now() - startTime

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Erro HTTP ${response.status}:`, errorText)
        continue
      }

      const result = await response.json()
      
      console.log(`⏱️  Tempo de processamento: ${processingTime}ms`)
      
      if (result.choices && result.choices[0]) {
        const message = result.choices[0].message
        
        console.log(`📝 Tipo de resposta: ${message.content ? 'texto' : 'tool_calls'}`)
        
        if (message.tool_calls && message.tool_calls.length > 0) {
          console.log('🎉 TOOL CALLS DETECTADOS!')
          message.tool_calls.forEach((toolCall, index) => {
            console.log(`  ${index + 1}. ${toolCall.function.name}`)
            console.log(`     Argumentos: ${toolCall.function.arguments}`)
          })
        } else if (message.content) {
          console.log(`📄 Resposta em texto (${message.content.length} chars):`)
          console.log(message.content.substring(0, 200) + (message.content.length > 200 ? '...' : ''))
          console.log('❌ Nenhum tool call foi feito')
        }
        
        if (result.usage) {
          console.log(`📊 Tokens: ${result.usage.prompt_tokens} prompt + ${result.usage.completion_tokens} completion = ${result.usage.total_tokens} total`)
        }
      }

    } catch (error) {
      console.error('❌ Erro na requisição:', error.message)
    }

    // Pausa entre testes
    console.log('\n⏳ Aguardando 3 segundos...')
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  console.log('\n🏁 TESTE CONCLUÍDO')
  console.log('================')
}

// Executar teste
testToolFormat().catch(console.error)