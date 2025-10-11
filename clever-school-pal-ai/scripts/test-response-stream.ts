// Teste de streaming usando DiscordResponseService para validar conversão para :online
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { DiscordResponseService } from '../src/services/discord/response-service';

async function main() {
  // Garantir logs de info visíveis
  process.env.DISCORD_LOG_LEVEL = process.env.DISCORD_LOG_LEVEL || 'info';

  // Criar cliente Supabase dummy (não será usado sem scope)
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dummy.supabase.co';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'dummy';
  const supabase = createClient(supabaseUrl, supabaseKey);

  const service = new DiscordResponseService(supabase);

  // Contexto mínimo
  const context = {
    global: {
      personality: 'Tutor paciente e encorajador, conciso e claro.',
      language: 'pt-PT'
    }
  } as any;

  const query = process.argv.slice(2).join(' ') || 'Quem é o presidente dos EUA hoje?';
  console.log(`🚀 Teste de streaming DiscordResponseService`);
  console.log(`❓ Pergunta: ${query}`);

  const t0 = Date.now();
  let firstTokenTime: number | null = null;
  let count = 0;
  let sample = '';

  try {
    for await (const token of service.generateResponseStream(query, context)) {
      if (firstTokenTime === null) firstTokenTime = Date.now();
      process.stdout.write(token);
      sample += token;
      count++;
    }
    const totalMs = Date.now() - t0;
    console.log(`\n✅ Stream finalizado.`);
    console.log(`⏱️ TTFB: ${firstTokenTime !== null ? (firstTokenTime - t0) : 'n/a'} ms`);
    console.log(`⏳ Duração total: ${totalMs} ms`);
    console.log(`🔤 Tokens (aprox): ${count}`);
    console.log(`📝 Amostra: ${sample.slice(0, 300)}`);
  } catch (e: any) {
    console.error('❌ Falha no teste de streaming:', e?.message || e);
    process.exit(1);
  }
}

main();