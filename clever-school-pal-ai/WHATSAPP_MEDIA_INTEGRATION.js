/**
 * INTEGRAÇÃO WHATSAPP + SUPABASE STORAGE + IA
 * Sistema completo para envio de mídia educacional via WhatsApp
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ================================================================
// 1. CLASSE PRINCIPAL DE INTEGRAÇÃO
// ================================================================

class WhatsAppMediaEducacional {
  constructor() {
    this.whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.baseURL = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`;
  }

  // ================================================================
  // 2. PESQUISA INTELIGENTE DE MÍDIA
  // ================================================================

  async pesquisarMidiaEducacional(pergunta, contextoEstudante) {
    try {
      console.log('🔍 Pesquisando mídia educacional para:', pergunta);
      
      // Extrair palavras-chave da pergunta
      const palavrasChave = pergunta.toLowerCase()
        .split(' ')
        .filter(palavra => palavra.length > 3)
        .filter(palavra => !['como', 'onde', 'quando', 'porque', 'para', 'sobre'].includes(palavra));

      console.log('🎯 Palavras-chave extraídas:', palavrasChave);

      // Detectar disciplina pela pergunta
      const disciplina = this.detectarDisciplina(pergunta);
      const ano = contextoEstudante?.classes?.grade || 5;

      console.log(`📚 Disciplina detectada: ${disciplina}, Ano: ${ano}`);

      // Buscar mídia relevante
      const { data: midias, error } = await supabase
        .rpc('pesquisar_midia_educacional', {
          consulta: palavrasChave.join(' '),
          disciplina_filtro: disciplina,
          ano_filtro: parseInt(ano),
          tipo_filtro: null
        });

      if (error) {
        console.error('❌ Erro ao pesquisar mídia:', error);
        return [];
      }

      console.log(`✅ Encontradas ${midias?.length || 0} mídias relevantes`);
      
      return midias || [];

    } catch (error) {
      console.error('❌ Erro na pesquisa de mídia:', error);
      return [];
    }
  }

  // ================================================================
  // 3. DETECÇÃO DE DISCIPLINA
  // ================================================================

  detectarDisciplina(pergunta) {
    const palavrasDisciplinas = {
      matematica: ['matemática', 'frações', 'equações', 'geometria', 'números', 'cálculo', 'algebra', 'gráfico'],
      ciencias: ['ciências', 'biologia', 'física', 'química', 'sistema solar', 'plantas', 'animais', 'corpo humano'],
      geografia: ['geografia', 'portugal', 'europa', 'continentes', 'oceanos', 'clima', 'relevo', 'rios'],
      historia: ['história', 'descobrimentos', 'império', 'guerra', 'rei', 'revolução', 'idade média'],
      portugues: ['português', 'gramática', 'literatura', 'texto', 'poema', 'romance', 'verbos']
    };

    const perguntaLower = pergunta.toLowerCase();

    for (const [disciplina, palavras] of Object.entries(palavrasDisciplinas)) {
      if (palavras.some(palavra => perguntaLower.includes(palavra))) {
        return disciplina;
      }
    }

    return null; // Retorna null se não detectar disciplina específica
  }

  // ================================================================
  // 4. GERAÇÃO DE URLs TEMPORÁRIAS
  // ================================================================

  async gerarUrlTemporaria(midiaId, duracaoMinutos = 60) {
    try {
      // Buscar dados da mídia
      const { data: midia, error } = await supabase
        .from('midia_educacional')
        .select('*')
        .eq('id', midiaId)
        .single();

      if (error || !midia) {
        throw new Error('Mídia não encontrada');
      }

      // Gerar URL temporária do Supabase Storage
      const { data: urlData, error: urlError } = await supabase.storage
        .from(midia.bucket_name)
        .createSignedUrl(midia.caminho_storage, duracaoMinutos * 60);

      if (urlError) {
        console.warn('⚠️ Erro ao gerar URL temporária, usando URL pública');
        return midia.url_publica;
      }

      console.log('✅ URL temporária gerada com sucesso');
      return urlData.signedUrl;

    } catch (error) {
      console.error('❌ Erro ao gerar URL temporária:', error);
      return null;
    }
  }

  // ================================================================
  // 5. ENVIO DE MÍDIA VIA WHATSAPP
  // ================================================================

  async enviarMidiaWhatsApp(phoneNumber, midia, contexto = {}) {
    try {
      console.log(`📤 Enviando mídia "${midia.titulo}" para ${phoneNumber}`);

      // Gerar URL temporária
      const urlTemporaria = await this.gerarUrlTemporaria(midia.id, 120); // 2 horas

      if (!urlTemporaria) {
        throw new Error('Não foi possível gerar URL para a mídia');
      }

      // Preparar payload baseado no tipo de mídia
      let payload = {
        messaging_product: "whatsapp",
        to: phoneNumber,
        type: this.mapearTipoMidia(midia.tipo_midia)
      };

      // Configurar mídia baseada no tipo
      const tipoWhatsApp = this.mapearTipoMidia(midia.tipo_midia);
      
      payload[tipoWhatsApp] = {
        link: urlTemporaria,
        caption: this.gerarLegenda(midia, contexto)
      };

      // Enviar via WhatsApp Cloud API
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.whatsappToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const resultado = await response.json();

      if (!response.ok) {
        throw new Error(`WhatsApp API Error: ${resultado.error?.message || 'Erro desconhecido'}`);
      }

      // Registrar log de sucesso
      await this.registrarLogEnvio(midia.id, contexto.student_id, phoneNumber, {
        whatsapp_message_id: resultado.messages[0]?.id,
        tipo_envio: 'url_temporaria',
        sucesso: true,
        pergunta_original: contexto.pergunta,
        resposta_ia: contexto.resposta
      });

      // Incrementar visualizações
      await supabase.rpc('incrementar_visualizacao', { midia_id: midia.id });

      console.log('✅ Mídia enviada com sucesso via WhatsApp');
      return {
        sucesso: true,
        message_id: resultado.messages[0]?.id,
        url_utilizada: urlTemporaria
      };

    } catch (error) {
      console.error('❌ Erro ao enviar mídia via WhatsApp:', error);

      // Registrar log de erro
      await this.registrarLogEnvio(midia.id, contexto.student_id, phoneNumber, {
        tipo_envio: 'url_temporaria',
        sucesso: false,
        erro_mensagem: error.message,
        pergunta_original: contexto.pergunta,
        resposta_ia: contexto.resposta
      });

      return {
        sucesso: false,
        erro: error.message
      };
    }
  }

  // ================================================================
  // 6. MAPEAMENTO DE TIPOS DE MÍDIA
  // ================================================================

  mapearTipoMidia(tipoMidia) {
    const mapeamento = {
      'imagem': 'image',
      'video': 'video',
      'audio': 'audio',
      'documento': 'document',
      'pdf': 'document'
    };

    return mapeamento[tipoMidia] || 'document';
  }

  // ================================================================
  // 7. GERAÇÃO DE LEGENDAS INTELIGENTES
  // ================================================================

  gerarLegenda(midia, contexto) {
    const emojis = {
      'matematica': '🔢',
      'ciencias': '🔬',
      'geografia': '🌍',
      'historia': '📜',
      'portugues': '📚'
    };

    const emoji = emojis[midia.disciplina] || '📖';
    
    let legenda = `${emoji} *${midia.titulo}*\n\n`;
    
    if (midia.descricao) {
      legenda += `${midia.descricao}\n\n`;
    }

    // Adicionar informações educacionais
    legenda += `📚 *Disciplina:* ${midia.disciplina.charAt(0).toUpperCase() + midia.disciplina.slice(1)}\n`;
    legenda += `🎓 *Ano:* ${midia.ano_escolar.join(', ')}º\n`;
    
    if (midia.duracao_segundos) {
      const minutos = Math.ceil(midia.duracao_segundos / 60);
      legenda += `⏱️ *Duração:* ${minutos} min\n`;
    }

    if (midia.rating_medio > 0) {
      const estrelas = '⭐'.repeat(Math.round(midia.rating_medio));
      legenda += `${estrelas} (${midia.rating_medio}/5)\n`;
    }

    legenda += `\n💡 *Tópico:* ${midia.topico}`;

    return legenda;
  }

  // ================================================================
  // 8. REGISTRO DE LOGS
  // ================================================================

  async registrarLogEnvio(midiaId, studentId, phoneNumber, dadosEnvio) {
    try {
      const { error } = await supabase
        .from('whatsapp_midia_logs')
        .insert({
          midia_id: midiaId,
          student_id: studentId,
          phone_number: phoneNumber,
          ...dadosEnvio,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.warn('⚠️ Erro ao registrar log:', error);
      }
    } catch (error) {
      console.warn('⚠️ Erro ao registrar log de envio:', error);
    }
  }

  // ================================================================
  // 9. INTEGRAÇÃO COM IA PARA SELEÇÃO INTELIGENTE
  // ================================================================

  async selecionarMidiaComIA(pergunta, midias, contextoEstudante) {
    if (!midias || midias.length === 0) return [];

    try {
      // Usar IA para ranquear as mídias por relevância
      const prompt = `
        Pergunta do estudante: "${pergunta}"
        Contexto: Estudante do ${contextoEstudante?.classes?.grade || 5}º ano
        
        Mídias disponíveis:
        ${midias.map((m, i) => `${i+1}. ${m.titulo} - ${m.descricao} (${m.tipo_midia})`).join('\n')}
        
        Selecione as 2 mídias mais relevantes para responder à pergunta.
        Responda apenas com os números das mídias, separados por vírgula.
      `;

      // Fazer chamada para IA (OpenRouter)
      const model = process.env.MEDIA_AI_MODEL || 'meta-llama/llama-3.1-70b-instruct';
      const baseUrl = (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
      const url = `${baseUrl}/chat/completions`;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://clever-school-pal-ai',
        'X-Title': 'EduBot Media Selector'
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'Você é um assistente educacional especializado em selecionar conteúdo relevante.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 100
        })
      });

      if (response.ok) {
        const data = await response.json();
        const resposta = data.choices[0]?.message?.content || '';
        
        // Extrair números da resposta da IA
        const indices = resposta.match(/\d+/g)?.map(n => parseInt(n) - 1) || [0];
        
        // Retornar mídias selecionadas
        return indices
          .filter(i => i >= 0 && i < midias.length)
          .slice(0, 2) // Máximo 2 mídias
          .map(i => midias[i]);
      }
    } catch (error) {
      console.warn('⚠️ IA OpenRouter não disponível, usando seleção por relevância:', error);
    }

    // Fallback: retornar as 2 primeiras (já ordenadas por relevância)
    return midias.slice(0, 2);
  }

  // ================================================================
  // 10. FUNÇÃO PRINCIPAL DE PROCESSAMENTO
  // ================================================================

  async processarPerguntaComMidia(pergunta, contextoEstudante, phoneNumber) {
    try {
      console.log('🚀 Processando pergunta com mídia educacional...');

      // 1. Pesquisar mídias relevantes
      const midias = await this.pesquisarMidiaEducacional(pergunta, contextoEstudante);

      if (!midias || midias.length === 0) {
        console.log('ℹ️ Nenhuma mídia encontrada para a pergunta');
        return {
          midiaEncontrada: false,
          resposta: 'Não encontrei conteúdo multimídia específico para sua pergunta, mas posso explicar o conceito de forma textual.'
        };
      }

      // 2. Selecionar melhores mídias com IA
      const midiasSelecionadas = await this.selecionarMidiaComIA(pergunta, midias, contextoEstudante);

      console.log(`📎 Selecionadas ${midiasSelecionadas.length} mídias para envio`);

      // 3. Enviar mídias selecionadas
      const resultadosEnvio = [];
      
      for (const midia of midiasSelecionadas) {
        const resultado = await this.enviarMidiaWhatsApp(phoneNumber, midia, {
          student_id: contextoEstudante?.id,
          pergunta: pergunta,
          resposta: `Enviei ${midia.tipo_midia}: ${midia.titulo}`
        });

        resultadosEnvio.push({
          midia: midia.titulo,
          tipo: midia.tipo_midia,
          sucesso: resultado.sucesso,
          erro: resultado.erro
        });
      }

      // 4. Gerar resposta textual complementar
      let respostaTexto = this.gerarRespostaComplementar(pergunta, midiasSelecionadas);

      return {
        midiaEncontrada: true,
        midiasSelecionadas: midiasSelecionadas.length,
        resultadosEnvio,
        resposta: respostaTexto
      };

    } catch (error) {
      console.error('❌ Erro no processamento:', error);
      return {
        midiaEncontrada: false,
        erro: error.message,
        resposta: 'Ocorreu um erro ao buscar conteúdo multimídia. Posso explicar o conceito de forma textual.'
      };
    }
  }

  // ================================================================
  // 11. RESPOSTA COMPLEMENTAR
  // ================================================================

  gerarRespostaComplementar(pergunta, midias) {
    if (!midias || midias.length === 0) {
      return 'Não encontrei conteúdo multimídia específico para sua pergunta.';
    }

    let resposta = `📎 Enviei ${midias.length} conteúdo(s) educacional(is) para te ajudar:\n\n`;

    midias.forEach((midia, index) => {
      const emoji = {
        'video': '🎥',
        'audio': '🔊',
        'imagem': '🖼️',
        'documento': '📄',
        'pdf': '📋'
      }[midia.tipo_midia] || '📎';

      resposta += `${emoji} **${midia.titulo}**\n`;
      if (midia.descricao) {
        resposta += `   ${midia.descricao}\n`;
      }
      resposta += '\n';
    });

    resposta += `💡 Estes recursos foram selecionados especificamente para sua pergunta: "${pergunta}"\n\n`;
    resposta += `📚 Se tiveres dúvidas após consultar o material, posso explicar mais detalhadamente!`;

    return resposta;
  }
}

// ================================================================
// 12. EXPORTAR E EXEMPLO DE USO
// ================================================================

export default WhatsAppMediaEducacional;

// Exemplo de uso:
/*
const mediaSystem = new WhatsAppMediaEducacional();

// Em uma função de webhook do WhatsApp:
const resultado = await mediaSystem.processarPerguntaComMidia(
  "Como funcionam as frações?",
  { 
    id: "student-123", 
    classes: { grade: 5 },
    phone_number: "+351912345678"
  },
  "+351912345678"
);

console.log('Resultado:', resultado);
*/