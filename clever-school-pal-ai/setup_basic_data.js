// Setup basic data and insert educational content
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://nsaodmuqjtabfblrrdqv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zYW9kbXVxanRhYmZibHJyZHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NTY3NjAsImV4cCI6MjA2MzIzMjc2MH0.UpuMCwfwPs33g8dG60DU0kXmJqu2DoVrhXvL0igRPyE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupBasicData() {
  console.log('🚀 Setting up basic school data...');

  // 1. Check if school exists
  let { data: schools } = await supabase.from('schools').select('id, name').limit(1);
  
  let schoolId;
  if (!schools?.length) {
    console.log('🏫 Creating school...');
    const { data: newSchool, error } = await supabase
      .from('schools')
      .insert({
        name: 'Escola Teste EduConnect',
        address: 'Rua da Educação, 123',
        phone: '+351234567890',
        email: 'contato@escola.edu',
        settings: {
          ai_enabled: true,
          max_students: 1000
        }
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('❌ Error creating school:', error);
      return;
    }
    schoolId = newSchool.id;
    console.log(`✅ School created with ID: ${schoolId}`);
  } else {
    schoolId = schools[0].id;
    console.log(`✅ Using existing school: ${schools[0].name} (${schoolId})`);
  }

  // 2. Check and create subjects
  const requiredSubjects = ['Matemática', 'Português', 'Ciências'];
  const { data: existingSubjects } = await supabase.from('subjects').select('id, name');
  
  const subjectIds = {};
  for (const subjectName of requiredSubjects) {
    let subject = existingSubjects?.find(s => s.name === subjectName);
    
    if (!subject) {
      console.log(`📘 Creating subject: ${subjectName}`);
      const { data: newSubject, error } = await supabase
        .from('subjects')
        .insert({
          name: subjectName,
          description: `Disciplina de ${subjectName} para ensino fundamental`,
          school_id: schoolId
        })
        .select('id, name')
        .single();
      
      if (error) {
        console.error(`❌ Error creating subject ${subjectName}:`, error);
        continue;
      }
      subject = newSubject;
      console.log(`✅ Subject ${subjectName} created`);
    } else {
      console.log(`✅ Using existing subject: ${subjectName}`);
    }
    
    subjectIds[subjectName] = subject.id;
  }

  // 3. Check and create class
  let { data: classes } = await supabase.from('classes').select('id, grade').eq('grade', '9º ano');
  
  let classId;
  if (!classes?.length) {
    console.log('🎓 Creating 9º ano class...');
    const { data: newClass, error } = await supabase
      .from('classes')
      .insert({
        name: '9º A',
        grade: '9º ano',
        school_year: '2024',
        school_id: schoolId
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('❌ Error creating class:', error);
    } else {
      classId = newClass.id;
      console.log(`✅ Class created with ID: ${classId}`);
    }
  } else {
    classId = classes[0].id;
    console.log(`✅ Using existing class: 9º ano (${classId})`);
  }

  // 4. Create test student
  const { data: existingStudent } = await supabase
    .from('students')
    .select('id')
    .eq('phone_number', '+351999999999')
    .single();

  if (!existingStudent) {
    console.log('👨‍🎓 Creating test student...');
    const { data: newStudent, error } = await supabase
      .from('students')
      .insert({
        name: 'Aluno Teste',
        phone_number: '+351999999999',
        email: 'aluno.teste@escola.edu',
        class_id: classId,
        school_id: schoolId,
        status: 'ativo'
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('❌ Error creating student:', error);
    } else {
      console.log(`✅ Test student created with ID: ${newStudent.id}`);
    }
  } else {
    console.log('✅ Test student already exists');
  }

  console.log('\n📚 Inserting educational content...');
  
  // 5. Educational content
  const educationalContents = [
    {
      title: 'Equações do Segundo Grau - Teoria Completa',
      description: 'Material completo sobre equações quadráticas para 9º ano',
      content_data: `EQUAÇÕES DO SEGUNDO GRAU

DEFINIÇÃO:
Uma equação do segundo grau é uma equação polinomial da forma ax² + bx + c = 0, onde:
- a, b e c são números reais
- a ≠ 0 (coeficiente principal)
- x é a incógnita

ELEMENTOS:
- a: coeficiente do termo quadrático (x²)
- b: coeficiente do termo linear (x)
- c: termo independente

EXEMPLOS:
1) x² - 5x + 6 = 0 (a=1, b=-5, c=6)
2) 2x² + 3x - 1 = 0 (a=2, b=3, c=-1)
3) x² - 9 = 0 (a=1, b=0, c=-9)

FÓRMULA DE BHASKARA:
x = (-b ± √(b²-4ac)) / 2a

DISCRIMINANTE (Δ):
Δ = b² - 4ac

ANÁLISE DO DISCRIMINANTE:
- Se Δ > 0: duas raízes reais e distintas
- Se Δ = 0: duas raízes reais e iguais
- Se Δ < 0: não há raízes reais

EXEMPLO RESOLVIDO:
Resolver x² - 5x + 6 = 0

Identificação: a=1, b=-5, c=6
Discriminante: Δ = (-5)² - 4(1)(6) = 25 - 24 = 1
Como Δ > 0, temos duas raízes distintas.

Aplicando Bhaskara:
x = (5 ± √1) / 2 = (5 ± 1) / 2

x₁ = (5 + 1) / 2 = 3
x₂ = (5 - 1) / 2 = 2

Verificação: 3² - 5(3) + 6 = 9 - 15 + 6 = 0 ✓
            2² - 5(2) + 6 = 4 - 10 + 6 = 0 ✓

RELAÇÕES DE VIETA:
Para uma equação ax² + bx + c = 0 com raízes x₁ e x₂:
- Soma das raízes: x₁ + x₂ = -b/a
- Produto das raízes: x₁ × x₂ = c/a

EXERCÍCIOS:
1) Resolva: x² - 7x + 12 = 0
2) Resolva: 2x² - 8x + 6 = 0
3) Determine k para que x² - 4x + k = 0 tenha duas raízes iguais.`,
      content_type: 'pdf',
      subject_name: 'Matemática'
    },
    {
      title: 'Figuras de Linguagem - Guia Completo',
      description: 'Estudo completo das principais figuras de linguagem para 9º ano',
      content_data: `FIGURAS DE LINGUAGEM

DEFINIÇÃO:
As figuras de linguagem são recursos expressivos da língua portuguesa que conferem maior beleza, expressividade e originalidade aos textos.

CLASSIFICAÇÃO:

1. FIGURAS DE PALAVRAS (SEMÂNTICAS)

METÁFORA:
Comparação implícita entre dois elementos.
Exemplo: "Seus olhos são duas estrelas brilhantes."

COMPARAÇÃO (SÍMILE):
Comparação explícita usando conectivos (como, tal qual, assim como).
Exemplo: "Ela é linda como uma flor."

METONÍMIA:
Substituição de uma palavra por outra com relação de proximidade.
Tipos:
- Autor pela obra: "Li Machado de Assis" (li obras de Machado)
- Continente pelo conteúdo: "Tomei um copo" (tomei o líquido do copo)
- Causa pelo efeito: "Vive do seu trabalho" (vive do dinheiro ganho)

PERSONIFICAÇÃO (PROSOPOPEIA):
Atribuição de características humanas a seres inanimados.
Exemplo: "O vento sussurrava entre as árvores."

HIPÉRBOLE:
Exagero intencional para dar ênfase.
Exemplo: "Chorei rios de lágrimas."

2. FIGURAS DE CONSTRUÇÃO (SINTÁTICAS)

ELIPSE:
Omissão de termos facilmente identificáveis.
Exemplo: "Na gaveta, apenas papéis velhos." (havia apenas)

ZEUGMA:
Omissão de termo já mencionado anteriormente.
Exemplo: "Ele gosta de futebol; eu, de basquete." (gosto)

ANÁFORA:
Repetição da mesma palavra no início de versos ou frases.
Exemplo: "Amor é fogo que arde sem se ver;
         Amor é ferida que dói e não se sente."

POLISSÍNDETO:
Repetição intencional de conjunções.
Exemplo: "E ri, e grita, e pula de alegria."

3. FIGURAS DE PENSAMENTO

ANTÍTESE:
Aproximação de palavras ou expressões de sentidos opostos.
Exemplo: "Era o melhor dos tempos, era o pior dos tempos."

PARADOXO (OXÍMORO):
Aparente contradição que revela uma verdade profunda.
Exemplo: "É ferida que dói e não se sente."

IRONIA:
Expressão do contrário do que se pensa, com intenção crítica.
Exemplo: "Que belo presente!" (referindo-se a algo ruim)

EUFEMISMO:
Suavização de expressões desagradáveis ou chocantes.
Exemplo: "Ele partiu desta para melhor." (morreu)

4. FIGURAS DE SOM

ALITERAÇÃO:
Repetição de sons consonantais.
Exemplo: "Três tristes tigres comiam trigo."

ASSONÂNCIA:
Repetição de sons vocálicos.
Exemplo: "Sou Ana, da cama, da cana, vidrada, virgem."

ONOMATOPEIA:
Reprodução de sons ou ruídos.
Exemplo: "O tic-tac do relógio."

EXERCÍCIOS DE IDENTIFICAÇÃO:
1. "A cidade é um coração pulsante." - Que figura?
2. "O silêncio falava mais que palavras." - Que figura?
3. "Li três Shakespeares hoje." - Que figura?
4. "Morreu de tanto viver." - Que figura?

DICAS PARA ANÁLISE:
- Observe o contexto da frase
- Identifique se há comparação, exagero, repetição, etc.
- Considere o efeito expressivo pretendido pelo autor`,
      content_type: 'pdf',
      subject_name: 'Português'
    },
    {
      title: 'Sistema Circulatório Humano',
      description: 'Estudo completo do sistema circulatório para ciências do 9º ano',
      content_data: `SISTEMA CIRCULATÓRIO HUMANO

FUNÇÃO PRINCIPAL:
O sistema circulatório é responsável pelo transporte de substâncias pelo corpo, incluindo:
- Oxigênio e nutrientes para as células
- Gás carbônico e resíduos das células
- Hormônios e anticorpos

COMPONENTES PRINCIPAIS:

1. CORAÇÃO
Órgão muscular dividido em 4 cavidades:

ÁTRIOS (câmaras superiores):
- Átrio direito: recebe sangue venoso do corpo
- Átrio esquerdo: recebe sangue arterial dos pulmões

VENTRÍCULOS (câmaras inferiores):
- Ventrículo direito: bombeia sangue para os pulmões
- Ventrículo esquerdo: bombeia sangue para o corpo

VÁLVULAS CARDÍACAS:
- Tricúspide: entre átrio e ventrículo direitos
- Mitral (bicúspide): entre átrio e ventrículo esquerdos
- Pulmonar: saída do ventrículo direito
- Aórtica: saída do ventrículo esquerdo

2. VASOS SANGUÍNEOS

ARTÉRIAS:
- Levam sangue do coração para os órgãos
- Paredes espessas e elásticas
- Principais: aorta, pulmonares, carótidas

VEIAS:
- Trazem sangue dos órgãos para o coração
- Paredes mais finas que as artérias
- Possuem válvulas para evitar refluxo
- Principais: cavas, pulmonares, jugulares

CAPILARES:
- Vasos microscópicos
- Permitem troca de substâncias entre sangue e células
- Conectam artérias a veias

3. SANGUE
Tecido líquido composto por:

PLASMA (55%):
- Parte líquida
- Contém água, proteínas, sais, glicose

ELEMENTOS FIGURADOS (45%):
- Hemácias (glóbulos vermelhos): transportam oxigênio
- Leucócitos (glóbulos brancos): defesa do organismo
- Plaquetas: coagulação sanguínea

CIRCULAÇÃO SANGUÍNEA:

GRANDE CIRCULAÇÃO (sistêmica):
Ventrículo esquerdo → Aorta → Corpo → Veias cavas → Átrio direito

PEQUENA CIRCULAÇÃO (pulmonar):
Ventrículo direito → Artéria pulmonar → Pulmões → Veias pulmonares → Átrio esquerdo

CARACTERÍSTICAS DO SANGUE:
- Sangue arterial: rico em oxigênio (vermelho vivo)
- Sangue venoso: rico em gás carbônico (vermelho escuro)

BATIMENTOS CARDÍACAS:
- Sístole: contração (bombeamento)
- Diástole: relaxamento (enchimento)
- Frequência normal: 60-100 bpm em repouso

DOENÇAS COMUNS:
- Hipertensão: pressão arterial elevada
- Infarto: morte de células cardíacas
- AVC: problema circulatório no cérebro
- Anemia: deficiência de hemácias

CUIDADOS COM O SISTEMA CIRCULATÓRIO:
1. Exercícios físicos regulares
2. Alimentação equilibrada
3. Não fumar
4. Controlar o estresse
5. Manter peso adequado
6. Exames médicos regulares

CURIOSIDADES:
- O coração bate cerca de 100.000 vezes por dia
- Temos aproximadamente 5 litros de sangue
- Os capilares, se esticados, dariam 2,5 voltas na Terra
- O sangue faz o percurso completo em cerca de 1 minuto`,
      content_type: 'pdf',
      subject_name: 'Ciências'
    }
  ];

  // Insert each content
  for (const content of educationalContents) {
    console.log(`\n📚 Inserting: ${content.title}`);
    
    // Check if content already exists
    const { data: existingContent } = await supabase
      .from('contents')
      .select('id')
      .eq('title', content.title)
      .single();

    if (existingContent) {
      console.log(`⚠️ Content "${content.title}" already exists, skipping...`);
      continue;
    }

    // Insert content
    const { data: insertedContent, error } = await supabase
      .from('contents')
      .insert({
        title: content.title,
        description: content.description,
        content_data: content.content_data,
        content_type: content.content_type,
        subject_id: subjectIds[content.subject_name],
        school_id: schoolId,
        status: 'publicado'
      })
      .select('id')
      .single();

    if (error) {
      console.error(`❌ Error inserting ${content.title}:`, error.message);
      continue;
    }

    console.log(`✅ Content inserted with ID: ${insertedContent.id}`);

    // Associate with class if it exists
    if (classId && insertedContent.id) {
      const { error: classError } = await supabase
        .from('content_classes')
        .insert({
          content_id: insertedContent.id,
          class_id: classId
        });

      if (!classError) {
        console.log(`🔗 Associated with class: 9º ano`);
      }
    }
  }

  console.log('\n🎉 All setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Run: node generate_embeddings.js');
  console.log('2. Go to http://localhost:8081');
  console.log('3. Navigate to Bot IA → Testes');
  console.log('4. Test with phone: +351999999999');
}

// Run the script
setupBasicData().catch(console.error); 