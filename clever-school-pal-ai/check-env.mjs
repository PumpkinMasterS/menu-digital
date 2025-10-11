import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

console.log('🔍 VERIFICAÇÃO DE VARIÁVEIS DE AMBIENTE');
console.log('='.repeat(50));

const envVars = [
  'VITE_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'AI_MODEL',
  'SUPABASE_URL',
  // ✅ Novos para OpenRouter e seleção de mídia
  'OPENROUTER_API_KEY',
  'OPENROUTER_BASE_URL',
  'MEDIA_AI_MODEL',
  // Opcional: chave pública
  'VITE_SUPABASE_ANON_KEY'
];

envVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${varName}: NOT FOUND`);
  }
});

console.log('\n🔧 CONFIGURAÇÃO NECESSÁRIA:');
console.log('AI_MODEL recomendado: meta-llama/llama-3.1-70b-instruct');
console.log('OPENROUTER_BASE_URL deve ser: https://openrouter.ai/api/v1');
console.log('Configure OPENROUTER_API_KEY e OPENROUTER_BASE_URL para IA');
console.log('Para seleção de mídia via IA, configure MEDIA_AI_MODEL (ex.: openai/gpt-5-mini ou Meta-Llama-3.1-405B-Instruct)');

// Verificar se há arquivo .env
import fs from 'fs';

const envFiles = ['.env', '.env.local', 'supabase/.env'];

console.log('\n📁 ARQUIVOS DE AMBIENTE DISPONÍVEIS:');
envFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} existe`);
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('AI_MODEL')) {
      console.log(`   Contém AI_MODEL: ${content.includes('Qwen3-32B') ? 'Qwen3-32B ✅' : 'Outro modelo ⚠️'}`);
    } else {
      console.log('   Não contém AI_MODEL ❌');
    }
  } else {
    console.log(`❌ ${file} não existe`);
  }
});