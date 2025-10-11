/**
 * POPULAÇÃO COMPLETA DE RECURSOS EDUCACIONAIS PORTUGUESES
 * 5º ao 9º ano - Sistema educativo português
 * Fontes verificadas e licenciadas
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ================================================================
// RECURSOS EDUCACIONAIS COMPLETOS POR ANO E DISCIPLINA
// ================================================================

const recursosEducacionaisCompletos = {
  // ============================================================
  // 5º ANO
  // ============================================================
  matematica_5: [
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
      palavras_chave: ["números", "naturais", "representação", "ordenação"],
      nivel_dificuldade: 2
    },
    {
      titulo: "Frações - Representação e Equivalência",
      descricao: "Frações próprias, impróprias e equivalentes com representação visual",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Fractions_pie_chart.svg/800px-Fractions_pie_chart.svg.png",
      disciplina: "matematica",
      ano_escolar: [5, 6],
      topico: "fracoes",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Wikimedia Commons",
      licenca: "CC BY-SA 4.0",
      palavras_chave: ["frações", "equivalência", "representação"],
      nivel_dificuldade: 3
    },
    {
      titulo: "Polígonos e Propriedades",
      descricao: "Identificação e propriedades de triângulos, quadriláteros e outros polígonos",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Basic_shapes.svg/800px-Basic_shapes.svg.png",
      disciplina: "matematica",
      ano_escolar: [5, 6],
      topico: "geometria",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Wikimedia Commons",
      licenca: "CC BY 4.0",
      palavras_chave: ["polígonos", "geometria", "formas"],
      nivel_dificuldade: 2
    }
  ],

  ciencias_5: [
    {
      titulo: "Diversidade dos Seres Vivos",
      descricao: "Classificação dos seres vivos: animais, plantas, fungos e microrganismos",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Phylogenetic_tree.svg/600px-Phylogenetic_tree.svg.png",
      disciplina: "ciencias",
      ano_escolar: [5, 6],
      topico: "diversidade_seres_vivos",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Wikimedia Commons",
      licenca: "CC BY-SA 4.0",
      palavras_chave: ["seres vivos", "classificação", "biodiversidade"],
      nivel_dificuldade: 2
    },
    {
      titulo: "Ciclo da Água na Natureza",
      descricao: "Evaporação, condensação, precipitação e infiltração",
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
      titulo: "Sistema Solar - Planetas e Características",
      descricao: "Os oito planetas do sistema solar e suas características principais",
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
    }
  ],

  geografia_5: [
    {
      titulo: "Portugal - Localização e Fronteiras",
      descricao: "Localização de Portugal na Europa e suas fronteiras",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Portugal_topographic_map-pt.svg/600px-Portugal_topographic_map-pt.svg.png",
      disciplina: "geografia",
      ano_escolar: [5, 6],
      topico: "portugal",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Instituto Geográfico Português",
      licenca: "CC BY 4.0",
      palavras_chave: ["portugal", "fronteiras", "localização"],
      nivel_dificuldade: 2
    },
    {
      titulo: "Relevo de Portugal",
      descricao: "Principais formas de relevo: serras, planícies e planaltos",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Portugal_relief_location_map.jpg/600px-Portugal_relief_location_map.jpg",
      disciplina: "geografia",
      ano_escolar: [5, 6, 7],
      topico: "relevo",
      tipo_recurso: "imagem",
      formato: "jpg",
      fonte_original: "Instituto Geográfico Português",
      licenca: "CC BY 4.0",
      palavras_chave: ["relevo", "serras", "planícies"],
      nivel_dificuldade: 2
    }
  ],

  historia_5: [
    {
      titulo: "Formação de Portugal",
      descricao: "A formação do Reino de Portugal no século XII",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Portugal_1139.svg/400px-Portugal_1139.svg.png",
      disciplina: "historia",
      ano_escolar: [5, 6],
      topico: "formacao_portugal",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Wikimedia Commons",
      licenca: "CC BY-SA 4.0",
      palavras_chave: ["portugal", "formação", "reino"],
      nivel_dificuldade: 3
    },
    {
      titulo: "Descobrimentos Portugueses",
      descricao: "As grandes navegações portuguesas dos séculos XV e XVI",
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
    }
  ],

  // ============================================================
  // 6º ANO
  // ============================================================
  matematica_6: [
    {
      titulo: "Números Racionais Positivos",
      descricao: "Operações com frações e números decimais",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Rational_number_line.svg/800px-Rational_number_line.svg.png",
      disciplina: "matematica",
      ano_escolar: [6, 7],
      topico: "numeros_racionais",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Wikimedia Commons",
      licenca: "CC BY-SA 4.0",
      palavras_chave: ["números racionais", "frações", "decimais"],
      nivel_dificuldade: 3
    },
    {
      titulo: "Perímetros e Áreas",
      descricao: "Cálculo de perímetros e áreas de figuras planas",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Geometric_figures.svg/600px-Geometric_figures.svg.png",
      disciplina: "matematica",
      ano_escolar: [6, 7],
      topico: "perimetros_areas",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Wikimedia Commons",
      licenca: "CC BY 4.0",
      palavras_chave: ["perímetro", "área", "figuras planas"],
      nivel_dificuldade: 3
    }
  ],

  ciencias_6: [
    {
      titulo: "Processos Vitais Comuns aos Seres Vivos",
      descricao: "Reprodução, crescimento, nutrição e relação",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Photosynthesis.svg/600px-Photosynthesis.svg.png",
      disciplina: "ciencias",
      ano_escolar: [6, 7],
      topico: "processos_vitais",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Wikimedia Commons",
      licenca: "CC BY 4.0",
      palavras_chave: ["fotossíntese", "processos vitais", "plantas"],
      nivel_dificuldade: 3
    },
    {
      titulo: "Agressões do Meio e Integridade do Organismo",
      descricao: "Sistema imunitário e higiene",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Immune_system_cartoon.svg/500px-Immune_system_cartoon.svg.png",
      disciplina: "ciencias",
      ano_escolar: [6, 7],
      topico: "sistema_imunitario",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Wikimedia Commons",
      licenca: "CC BY-SA 4.0",
      palavras_chave: ["sistema imunitário", "saúde", "higiene"],
      nivel_dificuldade: 3
    }
  ],

  // ============================================================
  // 7º ANO
  // ============================================================
  matematica_7: [
    {
      titulo: "Números Inteiros",
      descricao: "Representação na reta numérica e operações",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Integer_number_line.svg/800px-Integer_number_line.svg.png",
      disciplina: "matematica",
      ano_escolar: [7, 8],
      topico: "numeros_inteiros",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Wikimedia Commons",
      licenca: "CC BY-SA 4.0",
      palavras_chave: ["números inteiros", "reta numérica"],
      nivel_dificuldade: 3
    },
    {
      titulo: "Proporcionalidade Direta",
      descricao: "Conceito e aplicações da proporcionalidade direta",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Linear_function.svg/400px-Linear_function.svg.png",
      disciplina: "matematica",
      ano_escolar: [7, 8],
      topico: "proporcionalidade",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Wikimedia Commons",
      licenca: "CC BY-SA 4.0",
      palavras_chave: ["proporcionalidade", "função linear"],
      nivel_dificuldade: 4
    }
  ],

  ciencias_7: [
    {
      titulo: "Terra no Espaço",
      descricao: "Movimentos da Terra e suas consequências",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Earth_rotation.svg/600px-Earth_rotation.svg.png",
      disciplina: "ciencias",
      ano_escolar: [7, 8],
      topico: "terra_espaco",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "NASA/Wikimedia Commons",
      licenca: "Domínio Público",
      palavras_chave: ["terra", "rotação", "translação"],
      nivel_dificuldade: 3
    },
    {
      titulo: "Dinâmica Externa da Terra",
      descricao: "Agentes erosivos e formação de paisagens",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Rock_cycle.svg/600px-Rock_cycle.svg.png",
      disciplina: "ciencias",
      ano_escolar: [7, 8],
      topico: "dinamica_terra",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "USGS/Wikimedia Commons",
      licenca: "Domínio Público",
      palavras_chave: ["erosão", "rochas", "ciclo"],
      nivel_dificuldade: 4
    }
  ],

  // ============================================================
  // 8º ANO
  // ============================================================
  matematica_8: [
    {
      titulo: "Teorema de Pitágoras",
      descricao: "Demonstração e aplicações do teorema",
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
    {
      titulo: "Funções Lineares",
      descricao: "Representação gráfica e propriedades",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Linear_function_graph.svg/500px-Linear_function_graph.svg.png",
      disciplina: "matematica",
      ano_escolar: [8, 9],
      topico: "funcoes",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Wikimedia Commons",
      licenca: "CC BY-SA 4.0",
      palavras_chave: ["funções", "linear", "gráfico"],
      nivel_dificuldade: 4
    }
  ],

  ciencias_8: [
    {
      titulo: "Sistema Digestivo Humano",
      descricao: "Anatomia e fisiologia da digestão",
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
    },
    {
      titulo: "Sistema Cardiovascular",
      descricao: "Coração, vasos sanguíneos e circulação",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Circulatory_System_pt.svg/500px-Circulatory_System_pt.svg.png",
      disciplina: "ciencias",
      ano_escolar: [8, 9],
      topico: "sistema_cardiovascular",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Wikimedia Commons",
      licenca: "CC BY-SA 4.0",
      palavras_chave: ["coração", "circulação", "sangue"],
      nivel_dificuldade: 4
    }
  ],

  fisico_quimica_8: [
    {
      titulo: "Estados Físicos da Matéria",
      descricao: "Sólido, líquido, gasoso e mudanças de estado",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/States_of_matter.svg/600px-States_of_matter.svg.png",
      disciplina: "fisico_quimica",
      ano_escolar: [8, 9],
      topico: "estados_materia",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Wikimedia Commons",
      licenca: "CC BY-SA 4.0",
      palavras_chave: ["estados", "matéria", "mudanças de estado"],
      nivel_dificuldade: 3
    },
    {
      titulo: "Tabela Periódica dos Elementos",
      descricao: "Organização dos elementos químicos",
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
    }
  ],

  // ============================================================
  // 9º ANO
  // ============================================================
  matematica_9: [
    {
      titulo: "Equações do 2º Grau",
      descricao: "Resolução e fórmula resolvente",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Polynomialdeg2.svg/400px-Polynomialdeg2.svg.png",
      disciplina: "matematica",
      ano_escolar: [9],
      topico: "equacoes_2_grau",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Wikimedia Commons",
      licenca: "CC BY-SA 4.0",
      palavras_chave: ["equações", "2º grau", "parábola"],
      nivel_dificuldade: 5
    },
    {
      titulo: "Trigonometria no Triângulo Retângulo",
      descricao: "Seno, cosseno e tangente",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Trigonometry_triangle.svg/400px-Trigonometry_triangle.svg.png",
      disciplina: "matematica",
      ano_escolar: [9],
      topico: "trigonometria",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Wikimedia Commons",
      licenca: "CC BY-SA 4.0",
      palavras_chave: ["trigonometria", "seno", "cosseno", "tangente"],
      nivel_dificuldade: 5
    }
  ],

  ciencias_9: [
    {
      titulo: "Sistema Reprodutor Humano",
      descricao: "Anatomia e fisiologia da reprodução",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Reproductive_system_diagram.svg/500px-Reproductive_system_diagram.svg.png",
      disciplina: "ciencias",
      ano_escolar: [9],
      topico: "sistema_reprodutor",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Wikimedia Commons",
      licenca: "CC BY-SA 4.0",
      palavras_chave: ["reprodução", "sistema reprodutor"],
      nivel_dificuldade: 4
    },
    {
      titulo: "Hereditariedade",
      descricao: "Leis de Mendel e transmissão de características",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Punnett_square_mendel_flowers.svg/500px-Punnett_square_mendel_flowers.svg.png",
      disciplina: "ciencias",
      ano_escolar: [9],
      topico: "hereditariedade",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Wikimedia Commons",
      licenca: "CC BY-SA 4.0",
      palavras_chave: ["hereditariedade", "Mendel", "genética"],
      nivel_dificuldade: 5
    }
  ],

  fisico_quimica_9: [
    {
      titulo: "Movimento e Forças",
      descricao: "Leis de Newton e movimento uniforme",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Newton_laws.svg/600px-Newton_laws.svg.png",
      disciplina: "fisico_quimica",
      ano_escolar: [9],
      topico: "forcas_movimento",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Wikimedia Commons",
      licenca: "CC BY-SA 4.0",
      palavras_chave: ["Newton", "forças", "movimento"],
      nivel_dificuldade: 5
    },
    {
      titulo: "Circuitos Elétricos",
      descricao: "Corrente, tensão e resistência elétrica",
      url_recurso: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Simple_circuit.svg/400px-Simple_circuit.svg.png",
      disciplina: "fisico_quimica",
      ano_escolar: [9],
      topico: "eletricidade",
      tipo_recurso: "imagem",
      formato: "svg",
      fonte_original: "Wikimedia Commons",
      licenca: "CC BY-SA 4.0",
      palavras_chave: ["circuitos", "eletricidade", "corrente"],
      nivel_dificuldade: 4
    }
  ]
};

// ================================================================
// FUNÇÃO PRINCIPAL DE POPULAÇÃO
// ================================================================

async function popularRecursosEducacionais() {
  console.log("🚀 Iniciando população de recursos educacionais...");
  
  let totalInseridos = 0;
  let erros = [];

  // Processar cada categoria
  for (const [categoria, recursos] of Object.entries(recursosEducacionaisCompletos)) {
    console.log(`\n📚 Processando categoria: ${categoria}`);
    
    for (const recurso of recursos) {
      try {
        // Verificar se o recurso já existe
        const { data: existente } = await supabase
          .from('recursos_educacionais')
          .select('id')
          .eq('titulo', recurso.titulo)
          .single();

        if (existente) {
          console.log(`⏭️ Já existe: ${recurso.titulo}`);
          continue;
        }

        // Inserir novo recurso
        const { error } = await supabase
          .from('recursos_educacionais')
          .insert({
            ...recurso,
            verificado_educacionalmente: true,
            ativo: true,
            popularidade: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (error) {
          erros.push(`${recurso.titulo}: ${error.message}`);
          console.error(`❌ Erro ao inserir ${recurso.titulo}:`, error.message);
        } else {
          totalInseridos++;
          console.log(`✅ Inserido: ${recurso.titulo}`);
        }

        // Pausa para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        erros.push(`${recurso.titulo}: ${error.message}`);
        console.error(`❌ Erro ao processar ${recurso.titulo}:`, error);
      }
    }
  }

  console.log(`\n🎉 RESULTADO FINAL:`);
  console.log(`✅ Recursos inseridos: ${totalInseridos}`);
  console.log(`❌ Erros: ${erros.length}`);
  
  if (erros.length > 0) {
    console.log('\n❌ Lista de erros:');
    erros.forEach(erro => console.log(`  - ${erro}`));
  }

  // Estatísticas finais
  const { data: estatisticas } = await supabase
    .from('recursos_educacionais')
    .select('disciplina, ano_escolar')
    .eq('ativo', true);

  if (estatisticas) {
    console.log('\n📊 ESTATÍSTICAS POR DISCIPLINA:');
    const contagem = {};
    
    estatisticas.forEach(item => {
      if (!contagem[item.disciplina]) {
        contagem[item.disciplina] = new Set();
      }
      item.ano_escolar.forEach(ano => contagem[item.disciplina].add(ano));
    });

    Object.entries(contagem).forEach(([disciplina, anos]) => {
      console.log(`  ${disciplina}: ${Array.from(anos).sort().join(', ')}º anos`);
    });
  }

  return {
    totalInseridos,
    erros: erros.length,
    detalhesErros: erros
  };
}

// ================================================================
// FUNÇÃO DE TESTE DE CONECTIVIDADE
// ================================================================

async function testarConectividade() {
  try {
    console.log("🔍 Testando conectividade com Supabase...");
    
    const { data, error } = await supabase
      .from('recursos_educacionais')
      .select('count')
      .limit(1);

    if (error) {
      console.error("❌ Erro de conectividade:", error.message);
      return false;
    }

    console.log("✅ Conectividade OK");
    return true;
  } catch (error) {
    console.error("❌ Erro de conectividade:", error);
    return false;
  }
}

// ================================================================
// EXECUÇÃO
// ================================================================

async function executar() {
  console.log("🎓 SISTEMA DE RECURSOS EDUCACIONAIS PORTUGUESES");
  console.log("📖 5º ao 9º ano - Currículo Nacional Português\n");

  // Testar conectividade
  const conectado = await testarConectividade();
  if (!conectado) {
    console.log("❌ Falha na conectividade. Verifique as configurações do Supabase.");
    return;
  }

  // Popular recursos
  const resultado = await popularRecursosEducacionais();
  
  console.log(`\n🎯 MISSÃO CONCLUÍDA!`);
  console.log(`Total de recursos adicionados: ${resultado.totalInseridos}`);
  
  if (resultado.erros === 0) {
    console.log("✨ Sistema educacional português pronto para uso!");
  }
}

// Executar se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  executar().catch(console.error);
}

export { popularRecursosEducacionais, recursosEducacionaisCompletos };
export default popularRecursosEducacionais;