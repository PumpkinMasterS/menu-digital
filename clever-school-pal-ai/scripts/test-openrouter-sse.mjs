// Teste genérico de streaming SSE do OpenRouter, compatível com múltiplos modelos
import 'dotenv/config';
// Uso:
//   node scripts/test-openrouter-sse.mjs --model anthropic/claude-3-5-sonnet --query "Resumo das notícias de hoje em Portugal" --web
//   node scripts/test-openrouter-sse.mjs --model deepseek/deepseek-chat --query "Explica a fotossíntese para 7º ano"
// Requisitos:
//   - OPENROUTER_API_KEY definido no ambiente
//   - Opcional: OPENROUTER_BASE_URL (default: https://openrouter.ai/api/v1)

import fs from 'fs';
import path from 'path';

// Helper: obter fetch compatível
const getFetch = async () => {
  if (typeof globalThis.fetch === 'function') return globalThis.fetch;
  const mod = await import('node-fetch');
  return mod.default;
};

// Carregar mapeamento de modelos :online
const mappingPath = path.resolve(process.cwd(), 'supabase/functions/_shared/online-models.json');
let ONLINE_MODEL_MAP = {};
try {
  const raw = fs.readFileSync(mappingPath, 'utf-8');
  ONLINE_MODEL_MAP = JSON.parse(raw);
} catch (e) {
  console.warn('⚠️ Não foi possível carregar online-models.json, prosseguindo sem conversão automática:', e?.message || e);
}

const toOnlineIfNeeded = (model, needsWebSearch) => {
  try {
    if (!needsWebSearch || !model || typeof model !== 'string') return model;
    if (model.includes(':online')) return model;
    return ONLINE_MODEL_MAP[model] || model;
  } catch {
    return model;
  }
};

// Parse de argumentos simples
const args = process.argv.slice(2);
const argMap = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--')) {
    const key = a.replace(/^--/, '');
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      argMap[key] = next;
      i++;
    } else {
      argMap[key] = true;
    }
  }
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
if (!OPENROUTER_API_KEY) {
  console.error('❌ OPENROUTER_API_KEY não configurada no ambiente.');
  process.exit(1);
}

const modelInput = argMap.model || process.env.AI_MODEL || 'deepseek/deepseek-chat';
const query = argMap.query || 'Teste de streaming: explique rapidamente o que é fotossíntese.';
const forceWeb = !!argMap.web; // se presente, força conversão para :online quando possível

// Heurística simples para consultas temporais
const temporalRegex = /\b(hoje|agora|atual|recente|último|ultima|última|nova|notícia|preço|cotação|tempo|clima|2024|2025|presidente|eleições|guerra|inflação|bitcoin|dólar|euro|bolsa|mercado|stock|news|weather|current|latest|recent|today|now|price|rate|exchange|valor|custo)\b/i;
const needsWebSearch = forceWeb || temporalRegex.test(String(query).toLowerCase());

let finalModel = toOnlineIfNeeded(modelInput, needsWebSearch);
if (finalModel !== modelInput) {
  console.log(`🌐 Modelo convertido para versão :online: ${modelInput} → ${finalModel}`);
} else if (needsWebSearch && !String(finalModel).includes(':online')) {
  console.warn('ℹ️ Consulta sugere web search, mas modelo não possui variante :online mapeada. Mantendo modelo original.');
}

const run = async () => {
  const fetch = await getFetch();
  const url = `${OPENROUTER_BASE_URL}/chat/completions`;
  const messages = [
    { role: 'system', content: 'És um agente educativo. Responde SEMPRE em português claro e encorajador. Evita tags de raciocínio como <think>.' },
    { role: 'user', content: query }
  ];
  const body = {
    model: finalModel,
    messages,
    stream: true,
    temperature: 0.3,
    provider: { sort: 'latency' }
  };

  const t0 = Date.now();
  let firstTokenTime = null;
  let content = '';
  let tokens = 0;
  let buffer = '';

  console.log(`🚀 Iniciando teste SSE com modelo: ${finalModel}`);
  console.log(`❓ Query: ${query}`);

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://clever-school-pal-ai',
      'X-Title': 'SSE Test Script'
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error('❌ Erro na API OpenRouter:', resp.status, errText);
    process.exit(1);
  }

  // Compatível com streams do node-fetch e web streams
  const reader = resp.body?.getReader ? resp.body.getReader() : null;
  if (reader) {
    // Web streams
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += new TextDecoder().decode(value);
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = String(line).trim();
        if (!trimmed) continue;
        if (!trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.replace(/^data:\s*/, '');
        if (dataStr === '[DONE]') {
          const totalMs = Date.now() - t0;
          console.log('✅ Stream finalizado.');
          console.log(`⏱️ TTFB: ${firstTokenTime !== null ? firstTokenTime - t0 : 'n/a'} ms`);
          console.log(`⏳ Duração total: ${totalMs} ms`);
          console.log(`🔤 Tokens (aprox): ${tokens}`);
          console.log('📝 Amostra de saída:', content.slice(0, 300));
          process.exit(0);
        }
        try {
          const json = JSON.parse(dataStr);
          const choice = json?.choices?.[0] || {};
          const token = (choice?.delta?.content ?? choice?.message?.content ?? '').toString();
          if (token) {
            if (firstTokenTime === null) firstTokenTime = Date.now();
            // Filtrar tags de raciocínio
            const clean = token.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');
            if (clean) {
              process.stdout.write(clean);
              content += clean;
              tokens += 1;
            }
          }
        } catch {}
      }
    }
  } else {
    // Node stream (node-fetch)
    for await (const chunk of resp.body) {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = String(line).trim();
        if (!trimmed) continue;
        if (!trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.replace(/^data:\s*/, '');
        if (dataStr === '[DONE]') {
          const totalMs = Date.now() - t0;
          console.log('\n✅ Stream finalizado.');
          console.log(`⏱️ TTFB: ${firstTokenTime !== null ? firstTokenTime - t0 : 'n/a'} ms`);
          console.log(`⏳ Duração total: ${totalMs} ms`);
          console.log(`🔤 Tokens (aprox): ${tokens}`);
          console.log('📝 Amostra de saída:', content.slice(0, 300));
          process.exit(0);
        }
        try {
          const json = JSON.parse(dataStr);
          const choice = json?.choices?.[0] || {};
          const token = (choice?.delta?.content ?? choice?.message?.content ?? '').toString();
          if (token) {
            if (firstTokenTime === null) firstTokenTime = Date.now();
            const clean = token.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');
            if (clean) {
              process.stdout.write(clean);
              content += clean;
              tokens += 1;
            }
          }
        } catch {}
      }
    }
  }
};

run().catch((e) => {
  console.error('❌ Falha no teste SSE:', e);
  process.exit(1);
});