/**
 * POPULAÇÃO COMPLETA DE RECURSOS EDUCACIONAIS PORTUGUESES
 * 5º ao 9º ano - Sistema educativo português
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// RECURSOS EDUCACIONAIS COMPLETOS (versão resumida para teste)
const recursosEducacionais = [
  // MATEMÁTICA 5º
  {
    titulo: "Números Naturais - Representação e Ordenação",
    descricao: "Compreender a representação e ordenação dos números naturais até ao milhão",
    url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Number_line.svg/800px-Number_line.svg.png",
    disciplina: "matematica",
    ano_escolar: [5],
    topico: "numeros_naturais",
    tipo_recurso: "imagem",
    formato: "svg",
    fonte_original: "Wikimedia Commons",
    licenca: "CC BY-SA 4.0",
    palavras_chave: ["números", "naturais", "representação"],
    nivel_dificuldade: 2
  },
  {
    titulo: "Frações - Representação Visual",
    descricao: "Frações próprias, impróprias e equivalentes com círculos",
    url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Fractions_pie_chart.svg/800px-Fractions_pie_chart.svg.png",
    disciplina: "matematica",
    ano_escolar: [5, 6],
    topico: "fracoes",
    tipo_recurso: "imagem",
    formato: "svg",
    fonte_original: "Wikimedia Commons",
    licenca: "CC BY-SA 4.0",
    palavras_chave: ["frações", "equivalência", "círculos"],
    nivel_dificuldade: 3
  },
  
  // CIÊNCIAS 5º
  {
    titulo: "Ciclo da Água Completo",
    descricao: "Evaporação, condensação, precipitação e infiltração explicadas",
    url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Water_cycle.svg/800px-Water_cycle.svg.png",
    disciplina: "ciencias",
    ano_escolar: [5, 6, 7],
    topico: "agua",
    tipo_recurso: "imagem",
    formato: "svg",
    fonte_original: "USGS/Wikimedia Commons",
    licenca: "Domínio Público",
    palavras_chave: ["água", "ciclo", "evaporação", "chuva"],
    nivel_dificuldade: 2
  },
  {
    titulo: "Sistema Solar NASA",
    descricao: "Os oito planetas do sistema solar com nomes em português",
    url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Planets2013.svg/1000px-Planets2013.svg.png",
    disciplina: "ciencias",
    ano_escolar: [5, 6, 7],
    topico: "sistema_solar",
    tipo_recurso: "imagem",
    formato: "svg",
    fonte_original: "NASA/Wikimedia Commons",
    licenca: "Domínio Público",
    palavras_chave: ["planetas", "sistema solar", "astronomia"],
    nivel_dificuldade: 3
  },
  
  // GEOGRAFIA 5º
  {
    titulo: "Mapa Físico de Portugal",
    descricao: "Relevo, rios e montanhas de Portugal continental",
    url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Portugal_topographic_map-pt.svg/600px-Portugal_topographic_map-pt.svg.png",
    disciplina: "geografia",
    ano_escolar: [5, 6, 7],
    topico: "portugal",
    tipo_recurso: "imagem",
    formato: "svg",
    fonte_original: "Instituto Geográfico Português",
    licenca: "CC BY 4.0",
    palavras_chave: ["portugal", "relevo", "geografia", "rios"],
    nivel_dificuldade: 2
  },
  {
    titulo: "Distritos de Portugal",
    descricao: "Mapa político com os 18 distritos portugueses",
    url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Distritos_de_Portugal.svg/600px-Distritos_de_Portugal.svg.png",
    disciplina: "geografia",
    ano_escolar: [5, 6, 7, 8, 9],
    topico: "portugal",
    tipo_recurso: "imagem",
    formato: "svg",
    fonte_original: "Instituto Geográfico Português",
    licenca: "CC BY 4.0",
    palavras_chave: ["portugal", "distritos", "divisão administrativa"],
    nivel_dificuldade: 2
  },
  
  // HISTÓRIA 5º
  {
    titulo: "Descobrimentos Portugueses",
    descricao: "Rotas das grandes navegações de Vasco da Gama e Pedro Álvares Cabral",
    url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Portuguese_discoveries_routes.svg/700px-Portuguese_discoveries_routes.svg.png",
    disciplina: "historia",
    ano_escolar: [5, 6],
    topico: "descobrimentos",
    tipo_recurso: "imagem",
    formato: "svg",
    fonte_original: "Wikimedia Commons",
    licenca: "CC BY 4.0",
    palavras_chave: ["descobrimentos", "navegação", "expansão"],
    nivel_dificuldade: 3
  },
  
  // MATEMÁTICA 8º/9º
  {
    titulo: "Teorema de Pitágoras - Demonstração",
    descricao: "Demonstração visual do teorema com triângulo retângulo",
    url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Pythagorean.svg/400px-Pythagorean.svg.png",
    disciplina: "matematica",
    ano_escolar: [8, 9],
    topico: "pitagoras",
    tipo_recurso: "imagem",
    formato: "svg",
    fonte_original: "Wikimedia Commons",
    licenca: "CC BY 4.0",
    palavras_chave: ["pitágoras", "teorema", "triângulo retângulo"],
    nivel_dificuldade: 4
  },
  
  // FÍSICO-QUÍMICA 8º
  {
    titulo: "Tabela Periódica dos Elementos",
    descricao: "Organização dos elementos químicos em português",
    url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Periodic_table_large-pt.svg/1000px-Periodic_table_large-pt.svg.png",
    disciplina: "fisico_quimica",
    ano_escolar: [8, 9],
    topico: "tabela_periodica",
    tipo_recurso: "imagem",
    formato: "svg",
    fonte_original: "Wikimedia Commons",
    licenca: "CC BY-SA 4.0",
    palavras_chave: ["tabela periódica", "elementos", "química"],
    nivel_dificuldade: 4
  },
  
  // CIÊNCIAS 8º
  {
    titulo: "Sistema Digestivo Humano",
    descricao: "Anatomia e fisiologia do aparelho digestivo",
    url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Digestive_system_diagram_pt.svg/400px-Digestive_system_diagram_pt.svg.png",
    disciplina: "ciencias",
    ano_escolar: [8, 9],
    topico: "sistema_digestivo",
    tipo_recurso: "imagem",
    formato: "svg",
    fonte_original: "Wikimedia Commons",
    licenca: "CC BY 4.0",
    palavras_chave: ["digestão", "sistema digestivo", "anatomia"],
    nivel_dificuldade: 4
  }
];

async function popularRecursos() {
  console.log("🚀 Iniciando população de recursos educacionais...");
  console.log(`📊 Total de recursos a inserir: ${recursosEducacionais.length}`);
  
  let inseridos = 0;
  let erros = 0;

  for (const recurso of recursosEducacionais) {
    try {
      console.log(`\n📚 Processando: ${recurso.titulo}`);
      
      // Verificar se já existe
      const { data: existente } = await supabase
        .from('recursos_educacionais')
        .select('id')
        .eq('titulo', recurso.titulo)
        .single();

      if (existente) {
        console.log(`⏭️ Já existe`);
        continue;
      }

      // Inserir novo recurso
      const { error } = await supabase
        .from('recursos_educacionais')
        .insert({
          ...recurso,
          verificado_educacionalmente: true,
          ativo: true,
          popularidade: 0
        });

      if (error) {
        console.error(`❌ Erro:`, error.message);
        erros++;
      } else {
        console.log(`✅ Inserido com sucesso`);
        inseridos++;
      }

      // Pausa pequena
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error(`❌ Erro ao processar ${recurso.titulo}:`, error.message);
      erros++;
    }
  }

  console.log(`\n🎉 RESULTADO FINAL:`);
  console.log(`✅ Recursos inseridos: ${inseridos}`);
  console.log(`❌ Erros: ${erros}`);

  // Estatísticas finais
  try {
    const { data: stats } = await supabase
      .from('recursos_educacionais')
      .select('disciplina')
      .eq('ativo', true);

    if (stats) {
      console.log('\n📊 ESTATÍSTICAS:');
      const contagem = {};
      stats.forEach(item => {
        contagem[item.disciplina] = (contagem[item.disciplina] || 0) + 1;
      });
      
      Object.entries(contagem).forEach(([disciplina, total]) => {
        console.log(`  ${disciplina}: ${total} recursos`);
      });
    }
  } catch (error) {
    console.log('ℹ️ Não foi possível obter estatísticas');
  }

  return { inseridos, erros };
}

// Função de teste
async function testarConectividade() {
  try {
    console.log("🔍 Testando conectividade...");
    
    const { data, error } = await supabase
      .from('recursos_educacionais')
      .select('count')
      .limit(1);

    if (error) {
      console.error("❌ Erro:", error.message);
      return false;
    }

    console.log("✅ Conectividade OK");
    return true;
  } catch (error) {
    console.error("❌ Falha na conectividade:", error.message);
    return false;
  }
}

// Execução principal
async function main() {
  console.log("🎓 RECURSOS EDUCACIONAIS PORTUGUESES");
  console.log("📖 5º ao 9º ano - Currículo Nacional\n");

  // Testar conectividade
  const conectado = await testarConectividade();
  if (!conectado) {
    console.log("\n❌ Execute primeiro os SQLs no Supabase Dashboard:");
    console.log("   1. EXECUTE_NO_SUPABASE.sql");
    console.log("   2. SISTEMA_MEDIA_EDUCACIONAL.sql");
    return;
  }

  // Popular recursos
  await popularRecursos();
  
  console.log(`\n🎯 Sistema educacional português pronto para uso!`);
  console.log(`🔗 Teste em: http://localhost:8080/bot-config → aba Recursos`);
}

main().catch(console.error); 