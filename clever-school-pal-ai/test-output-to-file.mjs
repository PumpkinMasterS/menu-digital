import 'dotenv/config';
import fetch from 'node-fetch';
import fs from 'fs';

async function testAndLog() {
  const logFile = './connectivity-log.txt';
  let logContent = `Log gerado em: ${new Date().toISOString()}\n`;

  try {
    logContent += 'Iniciando teste de fetch com ESM...\n';
    const supabaseUrl = process.env.VITE_SUPABASE_URL;

    if (!supabaseUrl) {
      logContent += '❌ VITE_SUPABASE_URL não foi encontrada. Verifique o .env e o carregamento do dotenv.\n';
    } else {
      logContent += `Tentando fazer fetch para: ${supabaseUrl}\n`;
      try {
        const response = await fetch(supabaseUrl);
        logContent += '✅ Fetch bem-sucedido!\n';
        logContent += `Status: ${response.status}\n`;
        logContent += `Status Text: ${response.statusText}\n`;
      } catch (error) {
        logContent += '❌ O fetch falhou com o seguinte erro:\n';
        logContent += `${error.toString()}\n`;
        if (error.cause) {
          logContent += `Causa: ${JSON.stringify(error.cause, null, 2)}\n`;
        }
      }
    }
  } catch (e) {
    logContent += `❌ Ocorreu um erro inesperado no script: ${e.toString()}\n`;
  }

  fs.writeFileSync(logFile, logContent);
  console.log(`Log de diagnóstico escrito em ${logFile}`);
}

testAndLog();