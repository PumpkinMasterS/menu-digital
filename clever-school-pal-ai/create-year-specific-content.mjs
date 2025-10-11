#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nsaodmuqjtabfblrrdqv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zYW9kbXVxanRhYmZibHJyZHF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NTY3NjAsImV4cCI6MjA2MzIzMjc2MH0.UpuMCwfwPs33g8dG60DU0kXmJqu2DoVrhXvL0igRPyE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Currículo Português de Matemática por ano
const MATH_CURRICULUM = {
  "5": {
    grade: "5º ano",
    topics: [
      {
        title: "Números Naturais",
        description: "Representação, leitura e escrita de números naturais até ao milhão",
        content: `# Números Naturais - 5º Ano

## O que são números naturais?
Os números naturais são os números que usamos para contar: 0, 1, 2, 3, 4, 5, ...

## Representação até ao milhão:
- **Unidades**: 0 a 9
- **Dezenas**: 10, 20, 30... 90  
- **Centenas**: 100, 200, 300... 900
- **Milhares**: 1.000, 2.000... 9.000
- **Dezenas de milhar**: 10.000, 20.000...
- **Centenas de milhar**: 100.000, 200.000...
- **Milhão**: 1.000.000

## Como ler números grandes:
**Exemplo: 234.567**
- Duzentos e trinta e quatro mil, quinzentos e sessenta e sete

## Exercícios práticos:
1. Escreve por extenso: 45.832
2. Representa em algarismos: Oitenta e seis mil e quinze
3. Ordena por ordem crescente: 12.500, 125.000, 1.250

**Queres que explique mais sobre algum tópico específico?**`
      },
      {
        title: "Operações com Números Naturais",
        description: "Adição, subtração, multiplicação e divisão de números naturais",
        content: `# Operações com Números Naturais - 5º Ano

## As quatro operações básicas:

### 1. ADIÇÃO (+)
- **Termos**: parcelas + parcelas = soma
- **Propriedades**: comutativa, associativa
- **Exemplo**: 1.245 + 678 = 1.923

### 2. SUBTRAÇÃO (-)
- **Termos**: aditivo - subtrativo = diferença  
- **Exemplo**: 5.000 - 1.234 = 3.766

### 3. MULTIPLICAÇÃO (×)
- **Termos**: fator × fator = produto
- **Propriedades**: comutativa, associativa, distributiva
- **Exemplo**: 125 × 8 = 1.000

### 4. DIVISÃO (÷)
- **Termos**: dividendo ÷ divisor = quociente (resto)
- **Exemplo**: 1.000 ÷ 8 = 125 (resto 0)

## Ordem das operações:
1. Parênteses ()
2. Multiplicação e Divisão (×, ÷)
3. Adição e Subtração (+, -)

**Exemplo**: 10 + 5 × 2 = 10 + 10 = 20

**Queres praticar com exercícios específicos?**`
      },
      {
        title: "Frações",
        description: "Conceito de fração, frações equivalentes e operações simples",
        content: `# Frações - 5º Ano

## O que é uma fração?
Uma fração representa **partes de um todo**.

**Fração = Numerador / Denominador**

### Exemplo: 3/4
- **Numerador**: 3 (partes que temos)
- **Denominador**: 4 (partes do todo)
- **Significado**: 3 partes de 4

## Tipos de frações:
- **Própria**: numerador < denominador (1/2, 3/5)
- **Imprópria**: numerador ≥ denominador (5/3, 4/4)
- **Aparente**: divisão exata (6/3 = 2)

## Frações equivalentes:
Frações que representam a mesma quantidade:
- 1/2 = 2/4 = 3/6 = 4/8

## Como encontrar frações equivalentes:
Multiplica ou divide numerador e denominador pelo mesmo número:
- 1/2 × 3/3 = 3/6

## Operações básicas:
### Adição (denominadores iguais):
2/5 + 1/5 = 3/5

### Subtração (denominadores iguais):
4/7 - 2/7 = 2/7

**Queres aprender sobre frações com denominadores diferentes?**`
      }
    ]
  },
  "6": {
    grade: "6º ano", 
    topics: [
      {
        title: "Números Inteiros",
        description: "Números positivos, negativos e operações com números inteiros",
        content: `# Números Inteiros - 6º Ano

## O que são números inteiros?
Os números inteiros incluem:
- **Positivos**: +1, +2, +3... (ou 1, 2, 3...)
- **Negativos**: -1, -2, -3...
- **Zero**: 0

**Conjunto**: ..., -3, -2, -1, 0, +1, +2, +3, ...

## Reta numérica:
... -3 -- -2 -- -1 -- 0 -- +1 -- +2 -- +3 ...

## Operações com números inteiros:

### ADIÇÃO:
- **(+) + (+) = (+)**: 3 + 5 = 8
- **(-) + (-) = (-)**: (-3) + (-5) = -8  
- **(+) + (-) ou (-) + (+)**: 7 + (-3) = 4

### SUBTRAÇÃO:
Subtrair é o mesmo que somar o oposto:
- 5 - 3 = 5 + (-3) = 2
- 2 - 7 = 2 + (-7) = -5

### MULTIPLICAÇÃO:
- **(+) × (+) = (+)**: 3 × 4 = 12
- **(-) × (-) = (+)**: (-3) × (-4) = 12
- **(+) × (-) = (-)**: 3 × (-4) = -12
- **(-) × (+) = (-)**: (-3) × 4 = -12

**Regra**: Sinais iguais = resultado positivo; Sinais diferentes = resultado negativo

**Queres praticar com mais exercícios?**`
      },
      {
        title: "Proporcionalidade Direta",
        description: "Grandezas diretamente proporcionais e regra de três simples",
        content: `# Proporcionalidade Direta - 6º Ano

## O que é proporcionalidade direta?
Duas grandezas são **diretamente proporcionais** quando:
- Uma aumenta, a outra também aumenta
- Uma diminui, a outra também diminui  
- Na mesma proporção

## Exemplos do dia a dia:
- **Velocidade constante**: mais tempo → mais distância
- **Compras**: mais produtos → mais preço
- **Receitas**: mais ingredientes → mais porções

## Como reconhecer:
Se y = k × x (k = constante)

**Exemplo**: 
- 2 kg de maçãs custam 4€
- 4 kg de maçãs custam 8€  
- 6 kg de maçãs custam 12€

Razão constante: 4€/2kg = 2€/kg

## Regra de três simples:
**Problema**: Se 3 cadernos custam 9€, quanto custam 5 cadernos?

**Resolução**:
3 cadernos ---- 9€
5 cadernos ---- x€

x = (5 × 9) ÷ 3 = 45 ÷ 3 = 15€

## Método prático:
1. Organiza os dados em tabela
2. Multiplica em cruz (diagonal)
3. Divide pelo valor conhecido

**Queres resolver mais problemas de proporcionalidade?**`
      }
    ]
  },
  "7": {
    grade: "7º ano",
    topics: [
      {
        title: "Equações do 1º Grau",
        description: "Resolução de equações lineares com uma incógnita",
        content: `# Equações do 1º Grau - 7º Ano

## O que é uma equação?
Uma equação é uma **igualdade matemática** com pelo menos uma **incógnita** (geralmente x).

**Exemplo**: 2x + 5 = 11

## Elementos de uma equação:
- **1º membro**: parte antes do =
- **2º membro**: parte depois do = 
- **Incógnita**: letra que representa o valor desconhecido
- **Solução**: valor que torna a equação verdadeira

## Princípios para resolver equações:

### 1. Princípio da adição:
Posso somar ou subtrair o mesmo valor aos dois membros
**Exemplo**: x + 3 = 7
x + 3 - 3 = 7 - 3
x = 4

### 2. Princípio da multiplicação:
Posso multiplicar ou dividir os dois membros pelo mesmo valor (≠0)
**Exemplo**: 3x = 12
3x ÷ 3 = 12 ÷ 3  
x = 4

## Método de resolução:
1. **Simplificar** cada membro
2. **Isolar** termos com x num membro
3. **Isolar** termos sem x no outro membro
4. **Calcular** o valor de x
5. **Verificar** substituindo na equação original

## Exemplo completo:
**2x + 5 = 11**
2x = 11 - 5    (subtraí 5 aos dois membros)
2x = 6
x = 6 ÷ 2      (dividi por 2)
x = 3

**Verificação**: 2(3) + 5 = 6 + 5 = 11 ✓

**Queres resolver equações mais complexas?**`
      },
      {
        title: "Funções",
        description: "Conceito de função, representação gráfica e função linear",
        content: `# Funções - 7º Ano

## O que é uma função?
Uma função é uma **relação especial** entre dois conjuntos onde:
- A cada elemento do 1º conjunto corresponde **um e apenas um** elemento do 2º conjunto

## Notação:
**f(x) = y** ou **y = f(x)**
- **x**: variável independente (entrada)
- **y**: variável dependente (saída)  
- **f**: nome da função

## Exemplo prático:
**Função**: "O preço a pagar por x quilos de maçãs a 2€/kg"
**f(x) = 2x**

- f(1) = 2×1 = 2€
- f(3) = 2×3 = 6€
- f(5) = 2×5 = 10€

## Representação gráfica:
Usamos um **sistema de coordenadas**:
- **Eixo horizontal (x)**: variável independente
- **Eixo vertical (y)**: variável dependente

## Função linear:
**Forma geral**: y = mx + b
- **m**: declive (taxa de variação)
- **b**: ordenada na origem

### Exemplo: y = 2x + 1
- **Declive**: 2 (por cada unidade que x aumenta, y aumenta 2)
- **Ordenada na origem**: 1 (quando x=0, y=1)

## Como desenhar o gráfico:
1. Fazer tabela de valores
2. Marcar pontos no plano
3. Ligar os pontos (linha reta para função linear)

**Queres aprender a interpretar gráficos de funções?**`
      }
    ]
  },
  "8": {
    grade: "8º ano",
    topics: [
      {
        title: "Teorema de Pitágoras",
        description: "Relações métricas no triângulo retângulo",
        content: `# Teorema de Pitágoras - 8º Ano

## O que diz o Teorema de Pitágoras?
**"Num triângulo retângulo, o quadrado da hipotenusa é igual à soma dos quadrados dos catetos"**

## Fórmula:
**a² + b² = c²**
- **a, b**: catetos (lados que formam o ângulo reto)
- **c**: hipotenusa (lado oposto ao ângulo reto - o maior)

## Como identificar:
- **Triângulo retângulo**: tem um ângulo de 90°
- **Hipotenusa**: sempre o lado maior
- **Catetos**: os outros dois lados

## Aplicações práticas:

### 1. Calcular a hipotenusa:
**Problema**: Triângulo com catetos 3 e 4. Qual a hipotenusa?
**Resolução**:
a² + b² = c²
3² + 4² = c²
9 + 16 = c²
25 = c²
c = √25 = 5

### 2. Calcular um cateto:
**Problema**: Hipotenusa = 10, um cateto = 6. Qual o outro cateto?
**Resolução**:
6² + b² = 10²
36 + b² = 100
b² = 100 - 36 = 64
b = √64 = 8

## Ternos pitagóricos famosos:
- (3, 4, 5)
- (5, 12, 13)  
- (8, 15, 17)
- (7, 24, 25)

## Aplicações no dia a dia:
- **Construção**: verificar se cantos estão em esquadria
- **Navegação**: calcular distâncias
- **Arquitetura**: desenhar plantas

**Queres resolver problemas práticos com o Teorema de Pitágoras?**`
      },
      {
        title: "Volumes e Áreas",
        description: "Cálculo de áreas e volumes de sólidos geométricos",
        content: `# Volumes e Áreas - 8º Ano

## Áreas de figuras planas:

### Retângulo:
**A = comprimento × largura**
**A = c × l**

### Quadrado:
**A = lado²**
**A = l²**

### Triângulo:
**A = (base × altura) ÷ 2**
**A = (b × h) ÷ 2**

### Círculo:
**A = π × raio²**
**A = πr²** (π ≈ 3,14)

## Volumes de sólidos:

### Cubo:
**V = aresta³**
**V = a³**

### Paralelepípedo:
**V = comprimento × largura × altura**
**V = c × l × h**

### Cilindro:
**V = área da base × altura**
**V = πr² × h**

### Cone:
**V = (área da base × altura) ÷ 3**
**V = (πr² × h) ÷ 3**

### Esfera:
**V = (4 × π × raio³) ÷ 3**
**V = (4πr³) ÷ 3**

## Exemplo prático:
**Problema**: Uma piscina retangular tem 8m de comprimento, 5m de largura e 2m de profundidade. Quantos litros de água cabem?

**Resolução**:
V = c × l × h = 8 × 5 × 2 = 80 m³
1 m³ = 1000 litros
80 m³ = 80 × 1000 = 80.000 litros

## Unidades de medida:
### Área:
- mm², cm², dm², **m²**, dam², hm², km²

### Volume:
- mm³, cm³, dm³, **m³**, dam³, hm³, km³
- **1 dm³ = 1 litro**

**Queres resolver mais problemas de volumes e áreas?**`
      }
    ]
  },
  "9": {
    grade: "9º ano",
    topics: [
      {
        title: "Equações do 2º Grau",
        description: "Resolução de equações quadráticas completas e incompletas",
        content: `# Equações do 2º Grau - 9º Ano

## O que é uma equação do 2º grau?
É uma equação da forma: **ax² + bx + c = 0**
onde a ≠ 0

## Elementos:
- **a**: coeficiente de x² (termo quadrático)
- **b**: coeficiente de x (termo linear)  
- **c**: termo independente

## Tipos de equações:

### Completas:
**ax² + bx + c = 0** (a≠0, b≠0, c≠0)
**Exemplo**: 2x² + 5x - 3 = 0

### Incompletas:
- **ax² + c = 0** (b = 0)
- **ax² + bx = 0** (c = 0)
- **ax² = 0** (b = 0, c = 0)

## Métodos de resolução:

### 1. Fórmula resolvente (Bhaskara):
**x = (-b ± √(b² - 4ac)) ÷ 2a**

**Discriminante (Δ)**: Δ = b² - 4ac
- Se Δ > 0: **duas soluções reais diferentes**
- Se Δ = 0: **uma solução real (dupla)**  
- Se Δ < 0: **não há soluções reais**

### Exemplo completo:
**x² - 5x + 6 = 0**
a = 1, b = -5, c = 6

Δ = (-5)² - 4(1)(6) = 25 - 24 = 1

x = (5 ± √1) ÷ 2 = (5 ± 1) ÷ 2

**x₁** = (5 + 1) ÷ 2 = 3
**x₂** = (5 - 1) ÷ 2 = 2

**Verificação**: 
- 3² - 5(3) + 6 = 9 - 15 + 6 = 0 ✓
- 2² - 5(2) + 6 = 4 - 10 + 6 = 0 ✓

### 2. Equações incompletas:

**ax² + c = 0**:
x² = -c/a
x = ±√(-c/a)

**ax² + bx = 0**:
x(ax + b) = 0
x = 0 ou x = -b/a

**Queres praticar com problemas que se resolvem com equações do 2º grau?**`
      },
      {
        title: "Trigonometria",
        description: "Razões trigonométricas no triângulo retângulo",
        content: `# Trigonometria - 9º Ano

## O que é trigonometria?
É o estudo das **relações entre ângulos e lados** nos triângulos.

## Razões trigonométricas básicas:
Num triângulo retângulo, para um ângulo agudo α:

### SENO (sen α):
**sen α = cateto oposto ÷ hipotenusa**

### COSSENO (cos α):
**cos α = cateto adjacente ÷ hipotenusa**

### TANGENTE (tg α):
**tg α = cateto oposto ÷ cateto adjacente**

## Como lembrar (SOH-CAH-TOA):
- **S**en = **O**posto/**H**ipotenusa
- **C**os = **A**djacente/**H**ipotenusa  
- **T**g = **O**posto/**A**djacente

## Ângulos notáveis:

| Ângulo | sen   | cos   | tg    |
|--------|-------|-------|-------|
| 30°    | 1/2   | √3/2  | √3/3  |
| 45°    | √2/2  | √2/2  | 1     |
| 60°    | √3/2  | 1/2   | √3    |

## Relação fundamental:
**sen²α + cos²α = 1**

## Exemplo prático:
**Problema**: Uma escada de 5m está encostada a uma parede, fazendo 60° com o chão. A que altura está o topo da escada?

**Resolução**:
- Hipotenusa = 5m
- Ângulo = 60°
- Altura = cateto oposto

sen 60° = altura ÷ 5
√3/2 = altura ÷ 5
altura = 5 × √3/2 = 5√3/2 ≈ 4,33m

## Aplicações:
- **Navegação**: calcular rumos e distâncias
- **Construção**: calcular alturas e inclinações
- **Astronomia**: medir distâncias a estrelas
- **Engenharia**: desenhar estruturas

**Queres resolver mais problemas de trigonometria?**`
      }
    ]
  }
};

async function createYearSpecificContent() {
  console.log('🏗️ EduConnect - Criação de Conteúdo por Ano Letivo');
  console.log('='.repeat(60));

  try {
    // 1. Get or create school and subjects
    console.log('🏫 Verificando escola e disciplinas...');
    
    let { data: school } = await supabase
      .from('schools')
      .select('id')
      .eq('name', 'Escola Santa Maria')
      .single();
    
    if (!school) {
      const { data: newSchool, error } = await supabase
        .from('schools')
        .insert({ name: 'Escola Santa Maria' })
        .select('id')
        .single();
      school = newSchool;
    }

    let { data: mathSubject } = await supabase
      .from('subjects')
      .select('id')
      .eq('name', 'Matemática')
      .eq('school_id', school.id)
      .single();
    
    if (!mathSubject) {
      const { data: newSubject, error } = await supabase
        .from('subjects')
        .insert({ 
          name: 'Matemática', 
          school_id: school.id 
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('❌ Erro ao criar disciplina Matemática:', error);
        return;
      }
      mathSubject = newSubject;
      console.log('✅ Disciplina Matemática criada');
    }

    console.log(`✅ Escola: ${school.id}`);
    console.log(`✅ Disciplina Matemática: ${mathSubject.id}`);

    // 2. Create classes for each year (5º to 9º)
    console.log('\n📚 Criando turmas por ano...');
    const classesCreated = {};
    
    for (const year of ['5', '6', '7', '8', '9']) {
      const className = `${year}º A`;
      
      let { data: existingClass } = await supabase
        .from('classes')
        .select('id')
        .eq('name', className)
        .eq('school_id', school.id)
        .single();
      
      if (!existingClass) {
        const { data: newClass, error } = await supabase
          .from('classes')
          .insert({
            name: className,
            grade: `${year}º ano`,
            school_id: school.id,
            academic_year: '2024/2025'
          })
          .select('id')
          .single();
        
        if (error) {
          console.error(`❌ Erro ao criar turma ${className}:`, error);
          continue;
        }
        classesCreated[year] = newClass.id;
        console.log(`✅ Turma criada: ${className}`);
      } else {
        classesCreated[year] = existingClass.id;
        console.log(`✅ Turma existente: ${className}`);
      }
    }

    // 3. Create year-specific content
    console.log('\n📝 Criando conteúdo específico por ano...');
    
    for (const [year, curriculum] of Object.entries(MATH_CURRICULUM)) {
      console.log(`\n📖 Processando ${curriculum.grade}...`);
      
      const classId = classesCreated[year];
      if (!classId) {
        console.log(`❌ Turma não encontrada para ${year}º ano`);
        continue;
      }

      for (const topic of curriculum.topics) {
        // Check if content already exists
        const { data: existing } = await supabase
          .from('contents')
          .select('id')
          .eq('title', topic.title)
          .eq('subject_id', mathSubject.id)
          .single();

        if (existing) {
          console.log(`   ⏭️  Conteúdo já existe: ${topic.title}`);
          continue;
        }

        // Create content
        const { data: content, error: contentError } = await supabase
          .from('contents')
          .insert({
            title: topic.title,
            description: topic.description,
            content_data: topic.content,
            content_type: 'text',
            subject_id: mathSubject.id,
            status: 'publicado',
            difficulty: 'medium'
          })
          .select('id')
          .single();

        if (contentError) {
          console.error(`   ❌ Erro ao criar conteúdo ${topic.title}:`, contentError);
          continue;
        }

        // Associate with class
        const { error: assocError } = await supabase
          .from('content_classes')
          .insert({
            content_id: content.id,
            class_id: classId
          });

        if (assocError) {
          console.error(`   ❌ Erro ao associar conteúdo:`, assocError);
          continue;
        }

        // Generate mock embedding (768 dimensions)
        const mockEmbedding = Array.from({length: 768}, () => Math.random() * 2 - 1);
        
        const { error: embeddingError } = await supabase
          .from('contents')
          .update({ embedding: mockEmbedding })
          .eq('id', content.id);

        if (embeddingError) {
          console.error(`   ⚠️  Erro ao gerar embedding:`, embeddingError);
        }

        console.log(`   ✅ ${topic.title}`);
      }
    }

    // 4. Fix test student class assignment
    console.log('\n👨‍🎓 Corrigindo associação do estudante teste...');
    
    // Move test student to 9º A class
    const { error: updateError } = await supabase
      .from('students')
      .update({ 
        class_id: classesCreated['9'],
        school_id: school.id
      })
      .eq('phone_number', '+351999999999');

    if (updateError) {
      console.error('❌ Erro ao atualizar estudante:', updateError);
    } else {
      console.log('✅ Estudante teste movido para 9º A');
    }

    // 5. Create student for each year for testing
    console.log('\n👥 Criando estudantes de teste para cada ano...');
    
    for (const [year, classId] of Object.entries(classesCreated)) {
      const studentName = `Estudante ${year}º Ano`;
      const phoneNumber = `+35199999900${year}`;
      
      const { data: existing } = await supabase
        .from('students')
        .select('id')
        .eq('phone_number', phoneNumber)
        .single();

      if (!existing) {
        const { data: newStudent, error } = await supabase
          .from('students')
          .insert({
            name: studentName,
            phone_number: phoneNumber,
            class_id: classId,
            school_id: school.id,
            active: true,
            bot_active: true
          })
          .select('id')
          .single();

        if (error) {
          console.error(`❌ Erro ao criar ${studentName}:`, error);
        } else {
          console.log(`✅ ${studentName} criado (${phoneNumber})`);
        }
      }
    }

    console.log('\n🎉 CONTEÚDO ESPECÍFICO POR ANO CRIADO COM SUCESSO!');
    console.log('\n📊 RESUMO:');
    console.log('✅ Turmas: 5º A, 6º A, 7º A, 8º A, 9º A');
    console.log('✅ Conteúdo específico por ano letivo');
    console.log('✅ Estudantes de teste para cada ano');
    console.log('✅ Embeddings gerados');
    console.log('✅ Associações turma-conteúdo criadas');

    console.log('\n📱 NÚMEROS DE TESTE:');
    console.log('📞 5º ano: +351999999005');
    console.log('📞 6º ano: +351999999006'); 
    console.log('📞 7º ano: +351999999007');
    console.log('📞 8º ano: +351999999008');
    console.log('📞 9º ano: +351999999009');

  } catch (error) {
    console.error('💥 Erro durante criação:', error);
  }
}

createYearSpecificContent(); 