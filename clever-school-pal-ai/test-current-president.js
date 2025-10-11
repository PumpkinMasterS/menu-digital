import 'dotenv/config'
import { config as configSupabase } from 'dotenv'
configSupabase({ path: './supabase/.env.local', override: false })

// Garantir mapeamento para variáveis usadas nos testes
if (!process.env.VITE_SUPABASE_URL && process.env.SUPABASE_URL) process.env.VITE_SUPABASE_URL = process.env.SUPABASE_URL
if (!process.env.VITE_SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY) process.env.VITE_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const internalKey = process.env.HUMANIZED_INTERNAL_API_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não configuradas')
  process.exit(1)
}

// Novo: permitir forçar o modelo via variável de ambiente AI_MODEL ou argumento CLI
const forcedAiModel = process.env.AI_MODEL || process.argv[2]

async function testCurrentPresident() {
  console.log('🧪 Testando pergunta sobre presidente atual dos EUA...\n')
  
  const testQuestion = 'Quem é o presidente dos Estados Unidos atualmente em 2025?'
  
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
        question: testQuestion,
        platform: 'web',
        // Enviar aiModel somente se fornecido
        ...(forcedAiModel ? { aiModel: forcedAiModel } : {})
      })
    })

    const processingTime = Date.now() - startTime
    
    if (!response.ok) {
      console.log(`❌ ERRO HTTP: ${response.status} - ${response.statusText}`)
      const errorText = await response.text()
      console.log(`📄 Detalhes do erro: ${errorText}`)
      return
    }
    
    const result = await response.json()
    
    console.log(`⏱️  Tempo de processamento: ${processingTime}ms`)
    if (forcedAiModel) {
      console.log(`🎯 Modelo forçado enviado: ${forcedAiModel}`)
    }
    console.log('✅ RESPOSTA RECEBIDA:')
    console.log(result)

    // Logs resumidos úteis para verificação rápida
    if (result) {
      console.log('— Resumo —')
      console.log('Modelo usado:', result.modelUsed || '(não informado)')
      console.log('Ferramentas usadas:', Array.isArray(result.toolsUsed) ? result.toolsUsed.join(', ') : '(nenhuma)')
    }
    
  } catch (error) {
    console.log(`❌ ERRO NA REQUISIÇÃO: ${error.message}`)
  }
}

// Executar o teste
testCurrentPresident().catch(console.error)