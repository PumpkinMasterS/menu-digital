import 'dotenv/config'
import { config as configSupabase } from 'dotenv'
configSupabase({ path: './supabase/.env.local', override: false })

if (!process.env.VITE_SUPABASE_URL && process.env.SUPABASE_URL) process.env.VITE_SUPABASE_URL = process.env.SUPABASE_URL
if (!process.env.VITE_SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY) process.env.VITE_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const internalKey = process.env.HUMANIZED_INTERNAL_API_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY)')
  process.exit(1)
}

async function run() {
  console.log('🧪 Teste: Presidente dos EUA em 2025')
  const question = 'Quem é o presidente dos Estados Unidos atualmente em 2025?'

  try {
    const startTime = Date.now()

    const response = await fetch(`${supabaseUrl}/functions/v1/humanized-ai-tutor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        ...(internalKey ? { 'x-api-key': internalKey } : {})
      },
      body: JSON.stringify({
        phoneNumber: '+351123456789',
        question,
        aiModel: 'anthropic/claude-3.5-sonnet',
        platform: 'web'
      })
    })

    const processingTime = Date.now() - startTime

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Erro HTTP ${response.status}:`, errorText)
      return
    }

    const result = await response.json()

    console.log(`⏱️  Tempo de processamento: ${processingTime}ms`)
    console.log(`✅ Resposta recebida: ${result.canRespond ? 'SIM' : 'NÃO'}`)
    if (typeof result.webSearchRequired !== 'undefined') {
      console.log(`🌐 webSearchRequired: ${result.webSearchRequired}`)
    }

    if (result.answer) {
      console.log(`📝 Resposta (${result.answer.length} chars):`)
      console.log(result.answer.substring(0, 300) + (result.answer.length > 300 ? '...' : ''))
      
      const hasWebSearchIndicators = result.answer && (
        result.answer.includes('📚 INFORMAÇÕES ATUAIS DA WEB') ||
        result.answer.includes('🗞️ EVENTOS ATUAIS') ||
        result.answer.includes('📰 MANCHETES') ||
        result.answer.includes('📖 WIKIPEDIA') ||
        result.answer.includes('🔍 INFORMAÇÃO GERAL') ||
        result.answer.includes('Fonte:') ||
        result.answer.includes('Link:') ||
        result.answer.includes('atualizada') ||
        result.answer.includes('recente')
      )

      const usedTools = !!(result.webSearchContext || (result.toolsUsed && result.toolsUsed.length) || hasWebSearchIndicators)
      console.log(`🔧 Usou ferramentas web: ${usedTools ? '✅ SIM' : '❌ NÃO'}`)

      if (result.toolsUsed && result.toolsUsed.length) {
        console.log(`🛠️  Ferramentas utilizadas: ${result.toolsUsed.join(', ')}`)
      }
      
      if (result.webSearchContext) {
        console.log('🌐 Contexto de web search detectado')
      }
      
      if (hasWebSearchIndicators) {
        console.log('🔍 Indicadores de busca web encontrados na resposta')
      }
    }

    if (result.error) {
      console.error('❌ Erro na resposta:', result.error)
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message)
  }
}

run().catch(console.error)